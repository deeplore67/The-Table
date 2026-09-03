// THE TABLE - Clean Supabase version

const CONFIG = {
  SUPABASE_URL: "https://haynwwrwbwhsmylttsho.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Rwv83YNoX0kf9X4zpln1aA_FPtFCJNQ"
};


// Create Supabase connection
const supabaseClient = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);


// Page elements
const gate = document.querySelector("#gate");
const app = document.querySelector("#app");

const invite = document.querySelector("#invite");
const username = document.querySelector("#username");

const enterBtn = document.querySelector("#enterBtn");
const leaveBtn = document.querySelector("#leaveBtn");

const gateMsg = document.querySelector("#gateMsg");
const appMsg = document.querySelector("#appMsg");

const messages = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const messageInput = document.querySelector("#messageInput");


// Current session
let currentUser = null;
let currentRoomId = null;
let messageChannel = null;


// Prevent HTML injection
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}


// Show app message
function showAppMessage(text) {
  appMsg.textContent = text;
}


// Create one message element
function createMessageElement(message) {
  const article = document.createElement("article");
  article.className = "msg";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = message.username;

  const time = document.createElement("span");
  time.className = "time";

  time.textContent = new Date(
    message.created_at
  ).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  const body = document.createElement("div");
  body.className = "body";
  body.textContent = message.message;

  article.appendChild(name);
  article.appendChild(time);
  article.appendChild(body);

  return article;
}


// Display messages
function renderMessages(data) {
  messages.innerHTML = "";

  for (const message of data) {
    messages.appendChild(
      createMessageElement(message)
    );
  }

  scrollToBottom();
}


// Scroll chat to bottom
function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}


// Find The Table room
async function loadRoom() {

  const { data, error } = await supabaseClient
    .from("rooms")
    .select("id, name")
    .eq("name", "The Table")
    .single();

  if (error) {
    console.error("Room error:", error);

    gateMsg.textContent =
      "Could not connect to The Table.";

    return false;
  }

  currentRoomId = data.id;

  const roomLabel =
    document.querySelector("#roomLabel");

  if (roomLabel) {
    roomLabel.textContent = data.name;
  }

  return true;
}


// Load existing messages
async function loadMessages() {

  const { data, error } = await supabaseClient
    .from("messages")
    .select(
      "id, username, message, created_at"
    )
    .eq("room_id", currentRoomId)
    .order("created_at", {
      ascending: true
    });

  if (error) {
    console.error(
      "Message loading error:",
      error
    );

    showAppMessage(
      "Could not load messages."
    );

    return;
  }

  renderMessages(data || []);
}


// Add a message to the screen
function addMessageToScreen(message) {

  messages.appendChild(
    createMessageElement(message)
  );

  scrollToBottom();
}


// Connect to realtime messages
function subscribeToMessages() {

  if (messageChannel) {
    supabaseClient.removeChannel(
      messageChannel
    );
  }

  messageChannel = supabaseClient
    .channel("table-messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter:
          `room_id=eq.${currentRoomId}`
      },
      payload => {

        const newMessage =
          payload.new;

        // Don't duplicate our own message
        // because we already display it
        // immediately after sending.
        if (
          newMessage.username ===
          currentUser
        ) {
          return;
        }

        addMessageToScreen(
          newMessage
        );
      }
    )
    .subscribe(status => {

      console.log(
        "Realtime status:",
        status
      );

    });
}


// ENTER THE TABLE
enterBtn.addEventListener(
  "click",
  async () => {

    const code =
      invite.value.trim();

    const name =
      username.value.trim();


    if (!code || !name) {

      gateMsg.textContent =
        "Enter both an invitation code and username.";

      return;
    }


    // TEST INVITATION CODE
    if (
      code !== "TABLE-7K4M-92QX"
    ) {

      gateMsg.textContent =
        "Invalid invitation code.";

      return;
    }


    // Username validation
    if (
      !/^[a-zA-Z0-9_ -]{2,24}$/.test(
        name
      )
    ) {

      gateMsg.textContent =
        "Username must be 2–24 characters and use letters, numbers, spaces, _ or -.";

      return;
    }


    gateMsg.textContent =
      "Connecting...";


    const roomReady =
      await loadRoom();


    if (!roomReady) {
      return;
    }


    currentUser = name;


    // Save profile
    const profileId =
      crypto.randomUUID();


    const {
      error: profileError
    } = await supabaseClient
      .from("profiles")
      .insert({
        id: profileId,
        username: currentUser
      });


    if (profileError) {

      console.log(
        "Profile notice:",
        profileError.message
      );

    }


    // Remember username
    sessionStorage.setItem(
      "table_username",
      currentUser
    );


    // Show chat
    gate.classList.add(
      "hidden"
    );

    app.classList.remove(
      "hidden"
    );


    await loadMessages();


    subscribeToMessages();


    showAppMessage(
      "Connected to The Table."
    );


    messageInput.focus();
  }
);


// SEND MESSAGE
composer.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const text =
      messageInput.value.trim();


    if (
      !text ||
      !currentUser ||
      !currentRoomId
    ) {
      return;
    }


    // Disable send while saving
    const sendButton =
      composer.querySelector(
        'button[type="submit"]'
      );

    if (sendButton) {
      sendButton.disabled = true;
    }


    const {
      data,
      error
    } = await supabaseClient
      .from("messages")
      .insert({
        room_id: currentRoomId,
        username: currentUser,
        message: text
      })
      .select(
        "id, username, message, created_at"
      )
      .single();


    if (error) {

      console.error(
        "Send message error:",
        error
      );

      showAppMessage(
        "Message could not be sent."
      );

      if (sendButton) {
        sendButton.disabled = false;
      }

      return;
    }


    // Immediately display our message
    addMessageToScreen(data);


    // Clear input
    messageInput.value = "";


    if (sendButton) {
      sendButton.disabled = false;
    }


    messageInput.focus();
  }
);


// LEAVE THE TABLE
leaveBtn.addEventListener(
  "click",
  () => {

    if (messageChannel) {

      supabaseClient.removeChannel(
        messageChannel
      );

      messageChannel = null;
    }


    currentUser = null;
    currentRoomId = null;


    sessionStorage.removeItem(
      "table_username"
    );


    app.classList.add(
      "hidden"
    );

    gate.classList.remove(
      "hidden"
    );


    messages.innerHTML = "";

    invite.value = "";

    showAppMessage("");
  }
);


// Restore saved username
const savedName =
  sessionStorage.getItem(
    "table_username"
  );


if (savedName) {
  username.value = savedName;
} 
