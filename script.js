// script.js
import { auth, db, provider } from './firebase-config.js';
import {
  onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* --------- CONFIG --------- */
const ADMIN_EMAIL = "l7290539@gmail.com";

/* --------- UI --------- */
const ui = {
  // sections
  auth: document.getElementById("auth-section"),
  userSection: document.getElementById("user-section"),
  profile: document.getElementById("profile-section"),
  diary: document.getElementById("diary-section"),
  admin: document.getElementById("admin-section"),

  // profile
  profilePic: document.getElementById("profile-pic"),
  profileName: document.getElementById("profile-name"),
  profileEmail: document.getElementById("profile-email"),

  // diary
  welcomeUser: document.getElementById("welcome-user"),
  noteInput: document.getElementById("note-input"),
  notePassword: document.getElementById("notePassword"),
  noteColor: document.getElementById("noteColor"),
  filterDate: document.getElementById("filterDate"),
  clearFilterBtn: document.getElementById("clearFilterBtn"),
  notesList: document.getElementById("notes-list"),

  exportPDFAllBtn: document.getElementById("exportPDFAllBtn"),
  printAllBtn: document.getElementById("printAllBtn"),
  shareAllBtn: document.getElementById("shareAllBtn"),

  // admin
  allNotesList: document.getElementById("all-notes-list"),

  // auth inputs
  adminEmail: document.getElementById("adminEmail"),
  adminPassword: document.getElementById("adminPassword"),
  adminLoginBtn: document.getElementById("adminLoginBtn"),

  name: document.getElementById("name"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  signupBtn: document.getElementById("signupBtn"),
  loginBtn: document.getElementById("loginBtn"),
  googleBtn: document.getElementById("googleBtn"),

  saveBtn: document.getElementById("saveBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  logoutAdminBtn: document.getElementById("logoutAdminBtn"),

  searchNotes: document.getElementById("searchNotes"),
  searchUser: document.getElementById("searchUser"),
  emojiBar: document.getElementById("emoji-bar")
};

let CURRENT_USER = null;

/* --------- INIT --------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showAuth();
    return;
  }

  CURRENT_USER = user;
  fillProfile(user);

  if (user.email === ADMIN_EMAIL) {
    showAdmin();
    await loadAllNotesForAdmin();
  } else {
    showUser();
    await ensureUserDoc(user);
    await loadMyNotes();
  }
});

/* --------- EVENTS --------- */
ui.adminLoginBtn.addEventListener("click", adminLogin);
ui.signupBtn.addEventListener("click", userSignup);
ui.loginBtn.addEventListener("click", userLogin);
ui.googleBtn.addEventListener("click", googleLogin);

ui.logoutBtn?.addEventListener("click", doLogout);
ui.logoutAdminBtn?.addEventListener("click", doLogout);

ui.saveBtn.addEventListener("click", saveNote);
ui.searchNotes?.addEventListener("input", debounce(loadMyNotes, 250));
ui.searchUser?.addEventListener("input", debounce(loadAllNotesForAdmin, 250));
ui.clearFilterBtn?.addEventListener("click", () => {
  ui.filterDate.value = "";
  ui.searchNotes.value = "";
  loadMyNotes();
});
ui.exportPDFAllBtn?.addEventListener("click", exportAllNotesPDF);
ui.printAllBtn?.addEventListener("click", printAllNotes);
ui.shareAllBtn?.addEventListener("click", shareAllNotes);

bindEmojiBar();

/* --------- AUTH --------- */
async function adminLogin() {
  const email = ui.adminEmail.value.trim();
  const pass = ui.adminPassword.value.trim();
  if (!email || !pass) return alert("Admin email/password required");

  if (email !== ADMIN_EMAIL) {
    return alert("Only the configured admin email can login here!");
  }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    alert("Admin login failed: " + e.message);
  }
}

async function userSignup() {
  const name = ui.name.value.trim();
  const email = ui.email.value.trim();
  const pass = ui.password.value.trim();
  if (!name || !email || !pass) return alert("Please fill all fields");

  if (email === ADMIN_EMAIL) {
    return alert("This email is reserved for Admin. Use a different email.");
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      name,
      createdAt: serverTimestamp()
    });
    alert("Signup successful! Please login.");
  } catch (e) {
    alert("Signup failed: " + e.message);
  }
}

async function userLogin() {
  const email = ui.email.value.trim();
  const pass = ui.password.value.trim();
  if (!email || !pass) return alert("Enter email & password!");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
}

async function googleLogin() {
  try {
    const cred = await signInWithPopup(auth, provider);

    if (cred.user.email === ADMIN_EMAIL) {
      showAdmin();
      loadAllNotesForAdmin();
    } else {
      await ensureUserDoc(cred.user);
      showUser();
      loadMyNotes();
    }
  } catch (e) {
    alert("Google login failed: " + e.message);
  }
}

async function doLogout() {
  await signOut(auth);
  CURRENT_USER = null;
  showAuth();
}

/* --------- USER DOC --------- */
async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      name: user.displayName || "",
      createdAt: serverTimestamp()
    });
  }
}

/* --------- PROFILE --------- */
function fillProfile(user) {
  ui.profilePic.src = user.photoURL || "https://via.placeholder.com/80";
  ui.profileName.textContent = user.displayName || "No Name";
  ui.profileEmail.textContent = user.email || "—";
}

/* --------- NOTES (USER) --------- */
async function saveNote() {
  const text = ui.noteInput.value.trim();
  const lock = ui.notePassword.value.trim();
  const color = ui.noteColor.value || "#ffe4ec";
  if (!text) return alert("Please write something!");

  ui.saveBtn.disabled = true;
  try {
    await addDoc(collection(db, "notes"), {
      uid: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      text,
      color,
      lock: lock ? btoa(lock) : null,
      createdAt: serverTimestamp()
    });
    ui.noteInput.value = "";
    ui.notePassword.value = "";
    loadMyNotes();
  } catch (e) {
    alert("Error saving: " + e.message);
  } finally {
    ui.saveBtn.disabled = false;
  }
}

async function loadMyNotes() {
  if (!auth.currentUser) return;
  const searchTerm = ui.searchNotes.value.toLowerCase();
  const filterDate = ui.filterDate.value;

  const qNotes = query(
    collection(db, "notes"),
    where("uid", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qNotes);
  ui.notesList.innerHTML = "";

  snap.forEach((d) => {
    const note = d.data();
    const id = d.id;

    const created = note.createdAt?.toDate
      ? note.createdAt.toDate()
      : new Date();
    const isoDate = created.toISOString().split("T")[0];
    if (filterDate && filterDate !== isoDate) return;

    if (searchTerm && !note.text.toLowerCase().includes(searchTerm)) return;

    const li = document.createElement("li");
    li.style.background = note.color || "#ffe4ec";
    if (note.lock) li.classList.add("locked");

    li.innerHTML = `
      <small>${created.toLocaleString()}</small>
      <div class="note-text" contenteditable="false" id="note-text-${id}">
        ${note.lock ? "🔒 Locked Note" : escapeHTML(note.text)}
      </div>
      <div class="note-actions">
        ${note.lock ? `
          <button onclick="window.unlockNote('${id}', '${note.lock}')">Unlock</button>
        ` : `
          <button onclick="window.editNote('${id}', this)">Edit</button>
          <button onclick="window.saveEditedNote('${id}', this)" style="display:none;">Save</button>
          <button onclick="window.exportOnePDF('${id}')">PDF</button>
          <button onclick="window.printOne('${id}')">Print</button>
          <button onclick="window.shareOne('${id}')">Share</button>
        `}
        <button onclick="window.deleteNote('${id}')">Delete</button>
      </div>
    `;
    ui.notesList.appendChild(li);
  });
}

/* expose user actions */
window.unlockNote = async function (id, lock) {
  const pass = prompt("Enter password to unlock:");
  if (!pass) return;
  if (btoa(pass) !== lock) return alert("Wrong password!");

  const ref = doc(db, "notes", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Note not found");
  const data = snap.data();

  // show content
  alert(`\n${data.text}\n`);
};

window.deleteNote = async function (id) {
  if (!confirm("Delete this note?")) return;
  await deleteDoc(doc(db, "notes", id));
  loadMyNotes();
};

window.editNote = function (id, btn) {
  const li = btn.closest("li");
  const div = li.querySelector(".note-text");
  div.contentEditable = "true";
  div.focus();
  btn.style.display = "none";
  li.querySelector("button[onclick^='window.saveEditedNote']").style.display = "inline-block";
};

window.saveEditedNote = async function (id, btn) {
  const li = btn.closest("li");
  const div = li.querySelector(".note-text");
  const newText = div.innerText.trim();
  await updateDoc(doc(db, "notes", id), { text: newText });
  div.contentEditable = "false";
  btn.style.display = "none";
  li.querySelector("button[onclick^='window.editNote']").style.display = "inline-block";
};

/* --------- PDF / PRINT / SHARE (USER) --------- */
async function exportAllNotesPDF() {
  const allText = collectAllVisibleNotes();
  await generatePDF(allText, `love-diary-${(auth.currentUser?.email || 'me').split('@')[0]}.pdf`);
}

function printAllNotes() {
  const content = collectAllVisibleNotes();
  const w = window.open("", "_blank");
  w.document.write(`<pre>${escapeHTML(content)}</pre>`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

async function shareAllNotes() {
  const content = collectAllVisibleNotes();
  const title = "My Love Diary Notes";
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: content,
      });
    } catch (e) {
      alert("Share canceled or not supported.");
    }
  } else {
    await copyToClipboard(content);
    alert("Copied to clipboard (share not supported on this device).");
  }
}

window.exportOnePDF = async function (id) {
  const el = document.getElementById(`note-text-${id}`);
  if (!el) return;
  const text = el.innerText;
  await generatePDF(text, `note-${id}.pdf`);
};

window.printOne = function (id) {
  const el = document.getElementById(`note-text-${id}`);
  if (!el) return;
  const text = el.innerText;
  const w = window.open("", "_blank");
  w.document.write(`<pre>${escapeHTML(text)}</pre>`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
};

window.shareOne = async function (id) {
  const el = document.getElementById(`note-text-${id}`);
  if (!el) return;
  const text = el.innerText;
  const title = "My Love Diary Note";
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
    } catch (e) {
      alert("Share canceled or not supported.");
    }
  } else {
    await copyToClipboard(text);
    alert("Copied to clipboard (share not supported on this device).");
  }
};

/* helpers for PDF/share */
function collectAllVisibleNotes() {
  let content = `Love Diary – ${(auth.currentUser?.email) || "User"}\n\n`;
  const lis = ui.notesList.querySelectorAll("li");
  lis.forEach(li => {
    const time = li.querySelector("small")?.innerText || "";
    const textEl = li.querySelector(".note-text");
    const text = textEl ? textEl.innerText : "";
    if (text && !text.startsWith("🔒")) {
      content += `[${time}]\n${text}\n----------------------\n`;
    }
  });
  return content;
}

async function generatePDF(text, filename = "love-diary.pdf") {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const lineHeight = 16;
  const margin = 40;
  const maxWidth = 515; // A4 width - margins

  const lines = doc.splitTextToSize(text, maxWidth);
  let y = margin;
  lines.forEach(line => {
    if (y + lineHeight > 800) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  doc.save(filename);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

/* --------- NOTES (ADMIN) --------- */
async function loadAllNotesForAdmin() {
  const search = ui.searchUser?.value?.toLowerCase() || "";
  const qNotes = query(collection(db, "notes"), orderBy("createdAt", "desc"));
  const snap = await getDocs(qNotes);

  ui.allNotesList.innerHTML = "";
  snap.forEach((d) => {
    const data = d.data();
    const id = d.id;
    if (search && !(data.userEmail || "").toLowerCase().includes(search)) return;

    const time = data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "—";

    const li = document.createElement("li");
    li.style.background = data.color || "#fff0f5";
    li.innerHTML = `
      <small><b>${data.userEmail || "unknown"}</b> — ${time}</small>
      <div class="note-text" contenteditable="false">${escapeHTML(data.text)}</div>
      <div class="note-actions">
        <button onclick="window.adminEdit('${id}', this)">Edit</button>
        <button onclick="window.adminSave('${id}', this)" style="display:none;">Save</button>
        <button onclick="window.adminDelete('${id}')">Delete</button>
      </div>
    `;
    ui.allNotesList.appendChild(li);
  });
}

window.adminDelete = async function (id) {
  if (!confirm("Delete this note?")) return;
  await deleteDoc(doc(db, "notes", id));
  loadAllNotesForAdmin();
};
window.adminEdit = function (id, btn) {
  const li = btn.closest("li");
  const div = li.querySelector(".note-text");
  div.contentEditable = "true";
  div.focus();
  btn.style.display = "none";
  li.querySelector("button[onclick^='window.adminSave']").style.display = "inline-block";
};
window.adminSave = async function (id, btn) {
  const li = btn.closest("li");
  const div = li.querySelector(".note-text");
  const newText = div.innerText.trim();
  await updateDoc(doc(db, "notes", id), { text: newText });
  div.contentEditable = "false";
  btn.style.display = "none";
  li.querySelector("button[onclick^='window.adminEdit']").style.display = "inline-block";
};

/* --------- UI HELPERS --------- */
function showAuth() {
  ui.auth.style.display = "block";
  ui.userSection.style.display = "none";
  ui.admin.style.display = "none";
}
function showUser() {
  ui.auth.style.display = "none";
  ui.userSection.style.display = "block";
  ui.admin.style.display = "none";
  ui.welcomeUser.innerText = "Welcome to Mohit Donawat Diary";
}
function showAdmin() {
  ui.auth.style.display = "none";
  ui.userSection.style.display = "none";
  ui.admin.style.display = "block";
}

/* Emoji bar */
function bindEmojiBar() {
  if (!ui.emojiBar) return;
  const emojis = ui.emojiBar.innerText.trim().split(/\s+/);
  ui.emojiBar.innerHTML = "";
  emojis.forEach(e => {
    const span = document.createElement("span");
    span.textContent = e;
    span.onclick = () => {
      ui.noteInput.value += e;
      ui.noteInput.focus();
    };
    ui.emojiBar.appendChild(span);
  });
}

/* utils */
function escapeHTML(str = "") {
  return str.replace(/[&<>'"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]
  ));
}
function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
