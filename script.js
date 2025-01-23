// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Your web app's Firebase configuration
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

/*************************************************************
  MAPA DNI TYGODNIA (polskie nazwy)
*************************************************************/
const dayMap = {
  monday: "Poniedziałek",
  tuesday: "Wtorek",
  wednesday: "Środa",
  thursday: "Czwartek",
  friday: "Piątek",
  saturday: "Sobota",
  sunday: "Niedziela",
};

const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/*************************************************************
  LOGOWANIE I REJESTRACJA
*************************************************************/
async function signIn() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Zalogowano pomyślnie.");
  } catch (error) {
    alert("Błąd logowania: " + error.message);
  }
}

async function signUp() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Rejestracja zakończona pomyślnie.");
  } catch (error) {
    alert("Błąd rejestracji: " + error.message);
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
    alert("Wylogowano pomyślnie.");
  } catch (error) {
    alert("Błąd wylogowania: " + error.message);
  }
}

/*************************************************************
  ZMIANA STANU UŻYTKOWNIKA
*************************************************************/
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.querySelector(".container").style.display = "block";
    document.getElementById("login-section").style.display = "none";
    allDays.forEach((day) => loadCards(day));
  } else {
    document.querySelector(".container").style.display = "none";
    document.getElementById("login-section").style.display = "block";
  }
});

/*************************************************************
  DODAWANIE ĆWICZEŃ
*************************************************************/
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
    alert("Błąd dodawania ćwiczenia: " + error.message);
  }
}

/*************************************************************
  ŁADOWANIE ĆWICZEŃ
*************************************************************/
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
    alert("Błąd ładowania ćwiczeń: " + error.message);
  }
}

/*************************************************************
  USUWANIE ĆWICZENIA
*************************************************************/
async function deleteExercise(day, id) {
  const user = auth.currentUser;
  if (!user) return alert("Musisz być zalogowany, aby usunąć ćwiczenie.");

  try {
    await deleteDoc(doc(db, "users", user.uid, day, id));
    alert("Ćwiczenie usunięte pomyślnie.");
    loadCards(day);
  } catch (error) {
    alert("Błąd usuwania ćwiczenia: " + error.message);
  }
}
