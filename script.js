import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNt_K6lkFKHZeFXyBMLOpePge967aAEh8",
  authDomain: "plan-treningowy-a9d00.firebaseapp.com",
  projectId: "plan-treningowy-a9d00",
  storageBucket: "plan-treningowy-a9d00.appspot.com",
  messagingSenderId: "1087845341451",
  appId: "1:1087845341451:web:08201e588c56d73013aa0e",
  measurementId: "G-EY88TE8L7H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.querySelector(".container").style.display = "block";
    document.getElementById("login-section").style.display = "none";
    loadAllDays();
  } else {
    document.querySelector(".container").style.display = "none";
    document.getElementById("login-section").style.display = "block";
  }
});

// Functions for authentication
async function signIn() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Zalogowano!");
  } catch (error) {
    alert("Błąd logowania: " + error.message);
  }
}

async function signUp() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Zarejestrowano!");
  } catch (error) {
    alert("Błąd rejestracji: " + error.message);
  }
}

async function signOut() {
  try {
    await firebaseSignOut(auth);
    alert("Wylogowano!");
  } catch (error) {
    alert("Błąd wylogowania: " + error.message);
  }
}

// Load all days
function loadAllDays() {
  const container = document.getElementById("days-container");
  container.innerHTML = "";
  days.forEach((day) => {
    const section = document.createElement("div");
    section.id = day;
    section.className = "day-section hidden";
    section.innerHTML = `
      <h2>${day.charAt(0).toUpperCase() + day.slice(1)}</h2>
      <input type="text" id="${day}-exercise" placeholder="Ćwiczenie">
      <button onclick="addExercise('${day}')">Dodaj ćwiczenie</button>
      <div id="${day}-list"></div>
    `;
    container.appendChild(section);
  });
}

// Add exercise
async function addExercise(day) {
  const exercise = document.getElementById(`${day}-exercise`).value;
  if (!exercise) {
    alert("Wprowadź ćwiczenie!");
    return;
  }
  const user = auth.currentUser;
  if (!user) return;

  try {
    await addDoc(collection(db, "users", user.uid, "days", day, "exercises"), { exercise });
    alert("Ćwiczenie dodane!");
    loadExercises(day);
  } catch (error) {
    alert("Błąd przy dodawaniu ćwiczenia: " + error.message);
  }
}

// Load exercises for a day
async function loadExercises(day) {
  const user = auth.currentUser;
  if (!user) return;
  const list = document.getElementById(`${day}-list`);
  list.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "users", user.uid, "days", day, "exercises"));
    snapshot.forEach((doc) => {
      const div = document.createElement("div");
      div.textContent = doc.data().exercise;
      div.innerHTML += ` <button onclick="deleteExercise('${day}', '${doc.id}')">Usuń</button>`;
      list.appendChild(div);
    });
  } catch (error) {
    alert("Błąd przy ładowaniu ćwiczeń: " + error.message);
  }
}

// Delete exercise
async function deleteExercise(day, id) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await deleteDoc(doc(db, "users", user.uid, "days", day, "exercises", id));
    alert("Ćwiczenie usunięte!");
    loadExercises(day);
  } catch (error) {
    alert("Błąd przy usuwaniu ćwiczenia: " + error.message);
  }
}

// Show day section
function showSection() {
  const selected = document.getElementById("day-selector").value;
  document.querySelectorAll(".day-section").forEach((section) => {
    section.classList.add("hidden");
  });
  document.getElementById(selected)?.classList.remove("hidden");
}
