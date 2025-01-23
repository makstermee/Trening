import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDNt_K6lkFKHZeFXyBMLOpePge967aAEh8",
  authDomain: "plan-treningowy-a9d00.firebaseapp.com",
  projectId: "plan-treningowy-a9d00",
  storageBucket: "plan-treningowy-a9d00.firebasestorage.app",
  messagingSenderId: "1087845341451",
  appId: "1:1087845341451:web:08201e588c56d73013aa0e",
  measurementId: "G-EY88TE8L7H"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, user => {
    if (user) {
      document.getElementById("login-section").style.display = "none";
      document.querySelector(".container").style.display = "block";
    } else {
      document.getElementById("login-section").style.display = "block";
      document.querySelector(".container").style.display = "none";
    }
  });
});

function signIn() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => alert("Zalogowano!"))
    .catch(err => console.error(err.message));
}

function signUp() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("Zarejestrowano!"))
    .catch(err => console.error(err.message));
}

function signOutUser() {
  signOut(auth).then(() => alert("Wylogowano!"));
}

function addCard(day) {
  const exercise = document.getElementById(`${day}-exercise`).value;
  const series = document.getElementById(`${day}-series`).value;
  const reps = document.getElementById(`${day}-reps`).value;
  const weight = document.getElementById(`${day}-weight`).value;
  const notes = document.getElementById(`${day}-notes`).value;

  const user = auth.currentUser;
  if (!user) return alert("Musisz być zalogowany!");

  const card = { exercise, series, reps, weight, notes };
  addDoc(collection(db, "users", user.uid, day), card)
    .then(() => alert("Dodano ćwiczenie"))
    .catch(err => console.error(err.message));
}

function loadHistory() {
  const user = auth.currentUser;
  if (!user) return alert("Musisz być zalogowany!");

  getDocs(collection(db, "users", user.uid, "history"))
    .then(querySnapshot => {
      const historyTable = document.getElementById("history-table");
      historyTable.innerHTML = "";
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${data.date}</td>
          <td>${data.day}</td>
          <td>${data.exercise}</td>
          <td>${data.series}</td>
          <td>${data.reps}</td>
          <td>${data.weight}</td>
          <td>${data.notes}</td>
        `;
        historyTable.appendChild(row);
      });
    })
    .catch(err => console.error(err.message));
}
