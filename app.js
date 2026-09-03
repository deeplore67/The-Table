/*
  THE TABLE - frontend starter

  IMPORTANT:
  GitHub Pages is only the frontend. Do not put a database service-role key
  or any secret credential in this file.

  For a production deployment, connect this UI to a backend such as Supabase
  and enforce invitation checks + row-level security on the server.
*/

const CONFIG = {
  // Replace these after creating your backend:
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};

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
let demoMessages = [];

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function showMessage(text) {
  appMsg.textContent = text;
}

function render() {
  messages.innerHTML = demoMessages.map(m => `
    <article class="msg">
      <span class="name">${escapeHtml(m.username)}</span>
      <span class="time">${escapeHtml(m.time)}</span>
      <div class="body">${escapeHtml(m.text)}</div>
    </article>
  `).join("");

  messages.scrollTop = messages.scrollHeight;
}

enterBtn.addEventListener("click", () => {
  const code = invite.value.trim();
  const name = username.value.trim();

  if (!code || !name) {
    gateMsg.textContent = "Enter both an invitation code and username.";
    return;
  }

  if (!/^[a-zA-Z0-9_ -]{2,24}$/.test(name)) {
    gateMsg.textContent = "Username must be 2–24 characters and use letters, numbers, spaces, _ or -.";
    return;
  }

  /*
    DEMO ONLY:
    This accepts any non-empty invite code. It is NOT secure.
    Replace this with a server-side invitation verification before launch.
  */
  currentUser = name;
  sessionStorage.setItem("table_username", name);
  gate.classList.add("hidden");
  app.classList.remove("hidden");
  messageInput.focus();

  showMessage("Demo mode: messages currently live only in this browser.");
});

leaveBtn.addEventListener("click", () => {
  currentUser = null;
  sessionStorage.removeItem("table_username");
  app.classList.add("hidden");
  gate.classList.remove("hidden");
  messages.innerHTML = "";
  invite.value = "";
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();

  if (!text || !currentUser) return;

  demoMessages.push({
    username: currentUser,
    text,
    time: new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})
  });

  messageInput.value = "";
  render();
});

const savedName = sessionStorage.getItem("table_username");
if (savedName) username.value = savedName;
