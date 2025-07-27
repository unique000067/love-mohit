// script.js
import { auth, db, provider } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const adminEmail = "l7290539@gmail.com";

const ui = {
  authSection: document.getElementById("auth-section"),
  userSection: document.getElementById("user-section"),
  adminSection: document.getElementById("admin-section"),
  signupBtn: document.getElementById("signupBtn"),
  loginBtn: document.getElementById("loginBtn"),
  googleBtn: document.getElementById("googleBtn"),
  adminLoginBtn: document.getElementById("adminLoginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  logoutAdminBtn: document.getElementById("logoutAdminBtn"),
  saveBtn: document.getElementById("saveBtn"),
  notesList: document.getElementById("notes-list"),
  allNotesList: document.getElementById("all-notes-list"),
  noteInput: document.getElementById("note-input"),
  noteColor: document.getElementById("noteColor")
};

let currentUser = null;

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    if (user.email === adminEmail) {
      showAdmin();
      loadAllNotes();
    } else {
      showUser();
      loadNotes();
    }
  } else {
    showAuth();
  }
});

// Show sections
function showAuth() {
  ui.authSection.style.display = "block";
  ui.userSection.style.display = "none";
  ui.adminSection.style.display = "none";
}
function showUser() {
  ui.authSection.style.display = "none";
  ui.userSection.style.display = "block";
  ui.adminSection.style.display = "none";
}
function showAdmin() {
  ui.authSection.style.display = "none";
  ui.userSection.style.display = "none";
  ui.adminSection.style.display = "block";
}

// Signup
ui.signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    alert("Signup successful!");
  } catch (e) {
    alert(e.message);
  }
});

// Login
ui.loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    alert(e.message);
  }
});

// Google Login
ui.googleBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert(e.message);
  }
});

// Admin Login
ui.adminLoginBtn.addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value;
  const pass = document.getElementById("adminPassword").value;
  if (email === adminEmail) {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      alert(e.message);
    }
  } else {
    alert("Wrong Admin Email");
  }
});

// Logout
ui.logoutBtn.addEventListener("click", () => signOut(auth));
ui.logoutAdminBtn.addEventListener("click", () => signOut(auth));

// Save Note
ui.saveBtn.addEventListener("click", async () => {
  const text = ui.noteInput.value;
  const color = ui.noteColor.value;
  if (!text) return;
  await addDoc(collection(db, "notes"), {
    uid: currentUser.uid,
    text,
    color,
    createdAt: new Date()
  });
  ui.noteInput.value = "";
  loadNotes();
});

// Load User Notes
async function loadNotes() {
  ui.notesList.innerHTML = "";
  const q = query(collection(db, "notes"), where("uid", "==", currentUser.uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const note = docSnap.data();
    const li = document.createElement("li");
    li.style.background = note.color || "#ffe4ec";
    li.textContent = note.text;
    ui.notesList.appendChild(li);
  });
}

// Load Admin Notes
async function loadAllNotes() {
  ui.allNotesList.innerHTML = "";
  const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const note = docSnap.data();
    const li = document.createElement("li");
    li.textContent = `${note.text} (User ID: ${note.uid})`;
    ui.allNotesList.appendChild(li);
  });
}
