import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNt_K6lkFKHZeFXyBMLOpePge967aAEh8",
  authDomain: "plan-treningowy-a9d00.firebaseapp.com",
  projectId: "plan-treningowy-a9d00",
  storageBucket: "plan-treningowy-a9d00.appspot.com",
  messagingSenderId: "1087845341451",
  appId: "1:1087845341451:web:08201e588c56d73013aa0e",
  measurementId: "G-EY88TE8L7H",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Check user state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Zalogowany użytkownik:", user.email);
    document.querySelector(".container").style.display = "block";
    document.getElementById("login-section").style.display = "none";
  } else {
    console.log("Brak użytkownika lub wylogowano.");
    document.querySelector(".container").style.display = "none";
    document.getElementById("login-section").style.display = "block";
  }
});

// Login
async function signIn() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Zalogowano użytkownika:", userCredential.user);
    alert("Zalogowano pomyślnie.");
  } catch (error) {
    console.error("Błąd logowania:", error.message);
    alert("Błąd logowania: " + error.message);
  }
}

// Register
async function signUp() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Zarejestrowano użytkownika:", userCredential.user);
    alert("Rejestracja zakończona pomyślnie.");
  } catch (error) {
    console.error("Błąd rejestracji:", error.message);
    alert("Błąd rejestracji: " + error.message);
  }
}

// Logout
async function signOutUser() {
  try {
    await signOut(auth);
    console.log("Wylogowano pomyślnie.");
    alert("Wylogowano pomyślnie.");
  } catch (error) {
    console.error("Błąd wylogowania:", error.message);
    alert("Błąd wylogowania: " + error.message);
  }
}

// Add event listeners
document.getElementById("sign-in-btn").addEventListener("click", signIn);
document.getElementById("sign-up-btn").addEventListener("click", signUp);
document.getElementById("sign-out-btn").addEventListener("click", signOutUser);
