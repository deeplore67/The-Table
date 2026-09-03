// THE TABLE - Supabase connected version

const CONFIG = {
  SUPABASE_URL: "https://haynwwrwbwhsmylttsho.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "sb_publishable_Rwv83YNoX0kf9X4zpln1aA_FPtFCJNQ"
};

const supabaseClient = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

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

let currentUser = null;
let currentRoomId = null;

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function showMessage(text) {
  appMsg.textContent = text;
}

function renderMessages(data) {
  messages.innerHTML = data.map(m => {
    const time = new Date(m.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    return `
      <article class="msg">
        <span class="name">${escapeHtml(m.username)}</span>
        <span class="time">${escapeHtml(time)}</span>
        <div class="body">${escapeHtml(m.message)}</div>
      </article>
    `;
  }).join("");

  messages.scrollTop = messages.scrollHeight;
}

async function loadRoom() {
  const { data, error } = await supabaseClient
    .from("rooms")
    .select("id, name")
    .eq("name", "The Table")
    .single();

  if (error) {
    console.error(error);
    gateMsg.textContent = "Could not connect to The Table.";
    return false;
  }

  currentRoomId = data.id;

  const roomLabel = document.querySelector("#roomLabel");
  if (roomLabel) {
    roomLabel.textContent = data.name;
  }

  return true;
}

async function loadMessages() {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("id, username, message, created_at")
    .eq("room_id", currentRoomId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    showMessage("Could not load messages.");
    return;
  }

  renderMessages(data || []);
}

enterBtn.addEventListener("click", async () => {
  const code = invite.value.trim();
  const name = username.value.trim();

  if (!code || !name) {
    gateMsg.textContent =
      "Enter both an invitation code and username.";
    return;
  }

  if (!/^[a-zA-Z0-9_ -]{2,24}$/.test(name)) {
    gateMsg.textContent =
      "Username must be 2–24 characters and use letters, numbers, spaces, _ or -.";
    return;
  }

  gateMsg.textContent = "Connecting...";

  const roomReady = await loadRoom();

  if (!roomReady) {
    return;
  }

  currentUser = name;

  // Create a profile for this visitor.
  // This is anonymous; no email or real name is collected.
  const profileId = crypto.randomUUID();

  const { error: profileError } = await supabaseClient
    .from("profiles")
    .insert({
      id: profileId,
      username: currentUser
    });

  // If the username already exists, continue into the room.
  // The chat itself does not depend on the profile row.
  if (profileError) {
    console.log("Profile notice:", profileError.message);
  }

  sessionStorage.setItem("table_username", currentUser);

  gate.classList.add("hidden");
  app.classList.remove("hidden");

  await loadMessages();

  showMessage("Connected to The Table.");
  messageInput.focus();

  subscribeToMessages();
});

leaveBtn.addEventListener("click", () => {
  currentUser = null;
  currentRoomId = null;

  sessionStorage.removeItem("table_username");

  app.classList.add("hidden");
  gate.classList.remove("hidden");

  messages.innerHTML = "";
  invite.value = "";
  showMessage("");
});

composer.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!text || !currentUser || !currentRoomId) {
    return;
  }

  const { error } = await supabaseClient
    .from("messages")
    .insert({
      room_id: currentRoomId,
      username: currentUser,
      message: text
    });

  if (error) {
    console.error(error);
    showMessage("Message could not be sent.");
    return;
  }

  messageInput.value = "";
});

function subscribeToMessages() {
  supabaseClient
    .channel("table-messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${currentRoomId}`
      },
      payload => {
        const m = payload.new;

        const time = new Date(m.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        });

        messages.insertAdjacentHTML(
          "beforeend",
          `
          <article class="msg">
            <span class="name">${escapeHtml(m.username)}</span>
            <span class="time">${escapeHtml(time)}</span>
            <div class="body">${escapeHtml(m.message)}</div>
          </article>
          `
        );

        messages.scrollTop = messages.scrollHeight;
      }
    )
    .subscribe();
}

// Restore username when returning to the page.
const savedName = sessionStorage.getItem("table_username");

if (savedName) {
  username.value = savedName;
} 
