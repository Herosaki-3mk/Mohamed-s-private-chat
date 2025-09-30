// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyBkIP99k9jnUNuXekm9sfLeF_2vmP32wr8",
  authDomain: "herosaki-chat.firebaseapp.com",
  databaseURL: "https://herosaki-chat-default-rtdb.firebaseio.com",
  projectId: "herosaki-chat",
  storageBucket: "herosaki-chat.appspot.com",
  messagingSenderId: "108944200061",
  appId: "1:108944200061:web:9ceef9b87ba40440a33c14",
  measurementId: "G-LGR2DB81LG"
};

// Initialize Firebase
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

// DOM
const $ = id => document.getElementById(id);
const loginBtn = $('loginBtn');
const logoutBtn = $('logoutBtn');
const loginDiv = $('login');
const chatWith = $('chatWith');
const chatWithPhoto = $('chatWithPhoto');
const messages = $('messages');
const msgInput = $('msgInput');
const sendBtn = $('sendBtn');
const userList = $('userList');
const searchInput = $('searchInput');
const searchBtn = $('searchBtn');
const themeToggle = $('themeToggle');
const currentUserPhoto = $('currentUserPhoto');
const currentUserName = $('currentUserName');

let currentChatUID = null;

// --- Auth ---
loginBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
  if (user) {
    loginDiv.style.display = 'none';

    // Show current user at top
    currentUserName.textContent = user.displayName || "No Name";
    currentUserPhoto.src = user.photoURL || "https://via.placeholder.com/40";

    loadUsers();

    db.ref('users/' + user.uid).set({
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
  } else {
    loginDiv.style.display = 'flex';
    userList.innerHTML = '';
    messages.innerHTML = '';
    chatWith.textContent = 'Select someone to chat with!';
    chatWithPhoto.src = '';
    currentChatUID = null;
    currentUserName.textContent = "Guest";
    currentUserPhoto.src = "https://via.placeholder.com/40";
  }
});

// --- Dark mode toggle with icons ---
const themeIcon = themeToggle.querySelector("i");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    themeIcon.classList.remove("fa-moon");
    themeIcon.classList.add("fa-sun");
  } else {
    themeIcon.classList.remove("fa-sun");
    themeIcon.classList.add("fa-moon");
  }
});

// --- Helpers ---
function getRoomID(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

// --- Load users ---
function loadUsers(filter = "") {
  db.ref('users').once('value', snap => {
    userList.innerHTML = '';
    const data = snap.val() || {};
    Object.keys(data).forEach(uid => {
      if(uid === auth.currentUser.uid) return;
      const user = data[uid];
      const name = user.displayName || 'Unknown';

      if (!name.toLowerCase().includes(filter.toLowerCase())) return;

      const div = document.createElement('div');
      div.className = 'user-item';

      const img = document.createElement('img');
      img.src = user.photoURL || 'https://via.placeholder.com/32';
      img.alt = name;

      const span = document.createElement('span');
      span.textContent = name;

      div.appendChild(img);
      div.appendChild(span);

      div.addEventListener('click', () => openPrivateRoom(uid, name, user.photoURL));
      userList.appendChild(div);
    });
  });
}

// --- Open room ---
function openPrivateRoom(uid, displayName, photoURL) {
  currentChatUID = uid;
  chatWith.textContent = displayName;
  chatWithPhoto.src = photoURL || 'https://via.placeholder.com/40';
  messages.innerHTML = '';

  const roomID = getRoomID(auth.currentUser.uid, uid);
  const roomRef = db.ref('privateMessages/' + roomID);

  roomRef.off();
  roomRef.on('child_added', snap => {
    const msg = snap.val();

    const wrapper = document.createElement('div');
    wrapper.className = 'message ' + (msg.sender === auth.currentUser.uid ? 'you' : 'other');

    const img = document.createElement('img');
    img.src = msg.photoURL || 'https://via.placeholder.com/24';
    img.className = 'msg-photo';

    const textDiv = document.createElement('div');
    textDiv.className = 'msg-text';
    textDiv.textContent = msg.text;

    wrapper.appendChild(img);
    wrapper.appendChild(textDiv);

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  });
}

// --- Send message ---
sendBtn.addEventListener('click', () => {
  const text = msgInput.value.trim();
  if(!currentChatUID) return alert('Select someone to chat with!');
  if(!text) return;

  const roomID = getRoomID(auth.currentUser.uid, currentChatUID);
  db.ref('privateMessages/' + roomID).push({
    sender: auth.currentUser.uid,
    text: text,
    displayName: auth.currentUser.displayName || null,
    photoURL: auth.currentUser.photoURL || null,
    ts: firebase.database.ServerValue.TIMESTAMP
  });

  msgInput.value = '';
});

msgInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') sendBtn.click();
});

// --- Search ---
searchBtn.addEventListener("click", () => {
  loadUsers(searchInput.value.trim());
});
searchInput.addEventListener("input", () => {
  loadUsers(searchInput.value.trim());
});
