// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCiOU2MtdU7HhMrT5qHtB20hD55gNle5eQ",
  authDomain: "love-dairy-mohit.firebaseapp.com",
  projectId: "love-dairy-mohit",
  storageBucket: "love-dairy-mohit.appspot.com",
  messagingSenderId: "1066101626900",
  appId: "1:1066101626900:web:97dd9659cee08c55b82f01",
  measurementId: "G-XMKD64G9L6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
