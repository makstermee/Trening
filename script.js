// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
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

// Days mapping
const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Check auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged in:", user.email);
    document.querySelector(".container").style.display = "block";
    document.getElementById("login-section").style.display = "none";
    allDays.forEach((day) => loadCards(day));
  } else {
    console.log("No user logged in.");
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
    console.log("Logged in:", userCredential.user);
    alert("Zalogowano pomyślnie.");
  } catch (error) {
    console.error("Login error:", error);
    alert("Błąd logowania: " + error.message);
  }
}

// Register
async function signUp() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Registered:", userCredential.user);
    alert("Rejestracja zakończona pomyślnie.");
  } catch (error) {
    console.error("Registration error:", error);
    alert("Błąd rejestracji: " + error.message);
  }
}

// Logout
async function signOutUser() {
  try {
    await signOut(auth);
    alert("Wylogowano pomyślnie.");
  } catch (error) {
    console.error("Logout error:", error);
    alert("Błąd wylogowania: " + error.message);
  }
}

// Load cards
async function loadCards(day) {
  const user = auth.currentUser;
  if (!user) return;

  const container = document.getElementById(`${day}-cards`);
  container.innerHTML = "";

  try {
    const querySnapshot = await getDocs(collection(db, "users", user.uid, day));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement("div");
      card.classList.add("exercise-card");
      card.innerHTML = `
        <p>Ćwiczenie: ${data.exercise}</p>
        <p>Serie: ${data.series}</p>
        <p>Powtórzenia: ${data.reps}</p>
        <p>Ciężar: ${data.weight}</p>
        <p>Notatki: ${data.notes}</p>
        <button onclick="deleteExercise('${day}', '${doc.id}')">Usuń</button>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading cards:", error);
  }
}

// Add exercise
async function addExercise(day) {
  const user = auth.currentUser;
  if (!user) return alert("Musisz być zalogowany, aby dodać ćwiczenie.");

  const exercise = document.getElementById(`${day}-exercise`).value;
  const series = document.getElementById(`${day}-series`).value;
  const reps = document.getElementById(`${day}-reps`).value;
  const weight = document.getElementById(`${day}-weight`).value;
  const notes = document.getElementById(`${day}-notes`).value;

  try {
    await setDoc(doc(collection(db, "users", user.uid, day)), {
      exercise,
      series,
      reps,
      weight,
      notes,
    });
    alert("Ćwiczenie dodane pomyślnie.");
    loadCards(day);
  } catch (error) {
    console.error("Error adding exercise:", error);
  }
}

// Delete exercise
async function deleteExercise(day, id) {
  const user = auth.currentUser;
  if (!user) return alert("Musisz być zalogowany, aby usunąć ćwiczenie.");

  try {
    await deleteDoc(doc(db, "users", user.uid, day, id));
    alert("Ćwiczenie usunięte pomyślnie.");
    loadCards(day);
  } catch (error) {
    console.error("Error deleting exercise:", error);
  }
}
