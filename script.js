// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, setDoc, query, where, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNt_K6lkFKHZeFXyBMLOpePge967aAEh8",
  authDomain: "plan-treningowy-a9d00.firebaseapp.com",
  projectId: "plan-treningowy-a9d00",
  storageBucket: "plan-treningowy-a9d00.firebasestorage.app",
  messagingSenderId: "1087845341451",
  appId: "1:1087845341451:web:08201e588c56d73013aa0e",
  measurementId: "G-EY88TE8L7H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

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
  sunday: "Niedziela"
};

// Lista wszystkich dni
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

/*************************************************************
  ZMIENNA GLOBALNA – INFORMACJA O EDYCJI
*************************************************************/
let editInfo = {
  day: null,    // Nazwa dnia (monday, tuesday, ...)
  docId: null  // ID dokumentu w Firestore
};

/*************************************************************
  1. FUNKCJA POKAZUJĄCA WYBRANĄ SEKCJĘ
*************************************************************/
function showSection() {
  const sections = document.querySelectorAll(".day-section");
  sections.forEach(sec => sec.classList.add("hidden"));

  const selected = document.getElementById("day-selector").value;
  const toShow = document.getElementById(selected);
  if (toShow) {
    toShow.classList.remove("hidden");
    if (selected === "history") {
      loadHistoryFromFirestore();
    }
  }
}

/*************************************************************
  2. INICJALIZACJA PO ZAŁADOWANIU STRONY
*************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Początkowo ukryj sekcje planu treningowego
  document.querySelector('.container').style.display = 'none';

  // Obsługa zmiany sekcji
  document.getElementById("day-selector").addEventListener("change", showSection);
});

/*************************************************************
  3. DODAWANIE LUB AKTUALIZOWANIE KARTY
*************************************************************/
function addCard(day) {
  console.log(`addCard called for day: ${day}`);
  if (editInfo.day === day && editInfo.docId !== null) {
    // Aktualizujemy istniejącą kartę
    console.log(`Updating card with docId: ${editInfo.docId}`);
    updateCard(day, editInfo.docId);
  } else {
    // Tworzymy nową kartę
    console.log(`Creating new card for day: ${day}`);
    createNewCard(day);
  }
}

/*************************************************************
  3a. TWORZENIE NOWEJ KARTY
*************************************************************/
async function createNewCard(day) {
  console.log(`createNewCard called for day: ${day}`);
  
  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series   = document.getElementById(`${day}-series`).value.trim();
  const reps     = document.getElementById(`${day}-reps`).value.trim();
  const weight   = document.getElementById(`${day}-weight`).value.trim();
  const notes    = document.getElementById(`${day}-notes`).value.trim();

  if (!exercise && !series && !reps && !weight && !notes) {
    console.log("All fields are empty, not adding card.");
    alert("Proszę wypełnić przynajmniej jedno pole.");
    return;
  }

  const cardData = { exercise, series, reps, weight, notes };
  console.log("Card data to add:", cardData);

  const user = auth.currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby dodawać ćwiczenia.");
    console.log("No user is logged in.");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "users", user.uid, "days", day, "exercises"), cardData);
    console.log("Ćwiczenie dodane pomyślnie do Firestore.", docRef.id);
    // Czyścimy formularz
    document.getElementById(`${day}-exercise`).value = "";
    document.getElementById(`${day}-series`).value   = "";
    document.getElementById(`${day}-reps`).value     = "";
    document.getElementById(`${day}-weight`).value   = "";
    document.getElementById(`${day}-notes`).value    = "";

    loadCardsDataFromFirestore(day);
  } catch (error) {
    console.error("Błąd przy dodawaniu ćwiczenia: ", error);
    alert("Wystąpił błąd podczas dodawania ćwiczenia. Spróbuj ponownie.");
  }
}

/*************************************************************
  3b. AKTUALIZACJA ISTNIEJĄCEJ KARTY
*************************************************************/
async function updateCard(day, docId) {
  console.log(`updateCard called for day: ${day}, docId: ${docId}`);
  
  const user = auth.currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby aktualizować ćwiczenia.");
    console.log("No user is logged in.");
    return;
  }

  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series   = document.getElementById(`${day}-series`).value.trim();
  const reps     = document.getElementById(`${day}-reps`).value.trim();
  const weight   = document.getElementById(`${day}-weight`).value.trim();
  const notes    = document.getElementById(`${day}-notes`).value.trim();

  const updatedData = { exercise, series, reps, weight, notes };
  console.log("Updated data:", updatedData);

  try {
    await updateDoc(doc(db, "users", user.uid, "days", day, "exercises", docId), updatedData);
    console.log("Ćwiczenie zaktualizowane pomyślnie.");
    // Czyścimy formularz
    document.getElementById(`${day}-exercise`).value = "";
    document.getElementById(`${day}-series`).value   = "";
    document.getElementById(`${day}-reps`).value     = "";
    document.getElementById(`${day}-weight`).value   = "";
    document.getElementById(`${day}-notes`).value    = "";

    // Wyłączamy tryb edycji
    editInfo.day = null;
    editInfo.docId = null;

    // Przywracamy główny przycisk do "Dodaj ćwiczenie"
    const addBtn = document.querySelector(`#${day} .exercise-form button#${day}-add-btn`);
    if (addBtn) addBtn.textContent = "Dodaj ćwiczenie";

    // Ukrywamy przycisk Anuluj
    const cancelBtn = document.getElementById(`${day}-cancel-btn`);
    if (cancelBtn) {
      cancelBtn.classList.add("hidden");
    }

    loadCardsDataFromFirestore(day);
  } catch (error) {
    console.error("Błąd przy aktualizacji ćwiczenia: ", error);
    alert("Wystąpił błąd podczas aktualizacji ćwiczenia. Spróbuj ponownie.");
  }
}

/*************************************************************
  FUNKCJA ANULUJĄCA EDYCJĘ
*************************************************************/
function cancelEdit(day) {
  console.log(`cancelEdit called for day: ${day}`);
  
  // Czyścimy formularz
  document.getElementById(`${day}-exercise`).value = "";
  document.getElementById(`${day}-series`).value   = "";
  document.getElementById(`${day}-reps`).value     = "";
  document.getElementById(`${day}-weight`).value   = "";
  document.getElementById(`${day}-notes`).value    = "";

  // Wyłączamy tryb edycji
  editInfo.day = null;
  editInfo.docId = null;

  // Przywracamy główny przycisk do "Dodaj ćwiczenie"
  const addBtn = document.querySelector(`#${day} .exercise-form button#${day}-add-btn`);
  if (addBtn) {
    addBtn.textContent = "Dodaj ćwiczenie";
  }

  // Ukrywamy "Anuluj"
  const cancelBtn = document.getElementById(`${day}-cancel-btn`);
  if (cancelBtn) {
    cancelBtn.classList.add("hidden");
  }
}

/*************************************************************
  4. ŁADOWANIE KART Z FIRESTORE
*************************************************************/
async function loadCardsDataFromFirestore(day) {
  console.log(`loadCardsDataFromFirestore called for day: ${day}`);
  
  const container = document.getElementById(`${day}-cards`);
  if (!container) {
    console.log(`Container for day ${day} not found.`);
    return;
  }

  container.innerHTML = "";

  const user = auth.currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  try {
    const querySnapshot = await getDocs(collection(db, "users", user.uid, "days", day, "exercises"));
    console.log(`Found ${querySnapshot.size} exercises for day: ${day}`);
    querySnapshot.forEach(docSnapshot => {
      const card = docSnapshot.data();
      const docId = docSnapshot.id; // ID dokumentu

      const cardDiv = document.createElement("div");
      cardDiv.classList.add("exercise-card");

      // Nagłówek
      const headerDiv = document.createElement("div");
      headerDiv.classList.add("exercise-card-header");
      headerDiv.textContent = card.exercise || "(brak ćwiczenia)";

      // Detale
      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("exercise-card-details");
      detailsDiv.innerHTML = `
        <p><strong>Serie:</strong> ${escapeHTML(card.series) || "-"}</p>
        <p><strong>Powtórzenia:</strong> ${escapeHTML(card.reps) || "-"}</p>
        <p><strong>Ciężar (kg):</strong> ${escapeHTML(card.weight) || "-"}</p>
        <p><strong>Notatki:</strong> ${escapeHTML(card.notes) || "-"}</p>

        <button class="btn-reset" onclick="deleteCard('${day}', '${docId}')">Usuń</button>
        <button class="btn-save" onclick="editCard('${day}', '${docId}')">Edytuj</button>
      `;

      // Kliknięcie w nagłówek -> pokaż/ukryj szczegóły
      headerDiv.addEventListener("click", () => {
        detailsDiv.classList.toggle("show");
        headerDiv.classList.toggle("expanded");
      });

      cardDiv.appendChild(headerDiv);
      cardDiv.appendChild(detailsDiv);
      container.appendChild(cardDiv);
    });
  } catch (error) {
    console.error("Błąd przy ładowaniu ćwiczeń: ", error);
    alert("Wystąpił błąd podczas ładowania ćwiczeń. Spróbuj ponownie.");
  }
}

/*************************************************************
  5. USUWANIE KARTY
*************************************************************/
async function deleteCard(day, docId) {
  console.log(`deleteCard called for day: ${day}, docId: ${docId}`);
  
  const user = auth.currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby usuwać ćwiczenia.");
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  if (!confirm("Czy na pewno chcesz usunąć to ćwiczenie?")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "users", user.uid, "days", day, "exercises", docId));
    console.log("Ćwiczenie usunięte pomyślnie.");
    loadCardsDataFromFirestore(day);
  } catch (error) {
    console.error("Błąd przy usuwaniu ćwiczenia: ", error);
    alert("Wystąpił błąd podczas usuwania ćwiczenia. Spróbuj ponownie.");
  }
}

/*************************************************************
  6. RESETOWANIE KART
*************************************************************/
async function resetCards(day) {
  console.log(`resetCards called for day: ${day}`);
  
  if (confirm("Czy na pewno chcesz zresetować wszystkie ćwiczenia?")) {
    const user = auth.currentUser;
    if (!user) {
      alert("Musisz być zalogowany, aby resetować ćwiczenia.");
      console.log("Użytkownik nie jest zalogowany.");
      return;
    }

    try {
      const querySnapshot = await getDocs(collection(db, "users", user.uid, "days", day, "exercises"));
      if (querySnapshot.empty) {
        console.log("Nie ma żadnych ćwiczeń do zresetowania.");
        alert("Brak ćwiczeń do zresetowania.");
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });
      await batch.commit();
      console.log("Wszystkie ćwiczenia zostały zresetowane.");
      alert("Wszystkie ćwiczenia zostały zresetowane.");
      loadCardsDataFromFirestore(day);
    } catch (error) {
      console.error("Błąd przy resetowaniu ćwiczeń: ", error);
      alert("Wystąpił błąd podczas resetowania ćwiczeń. Spróbuj ponownie.");
    }
  }
}

/*************************************************************
  7. EDYTOWANIE ISTNIEJĄCEJ KARTY
*************************************************************/
async function editCard(day, docId) {
  console.log(`editCard called for day: ${day}, docId: ${docId}`);
  
  const user = auth.currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby edytować ćwiczenia.");
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "users", user.uid, "days", day, "exercises", docId));
    if (!docSnap.exists()) {
      console.log("Ćwiczenie nie istnieje.");
      alert("Ćwiczenie nie istnieje.");
      return;
    }

    const card = docSnap.data();
    document.getElementById(`${day}-exercise`).value = card.exercise || "";
    document.getElementById(`${day}-series`).value   = card.series   || "";
    document.getElementById(`${day}-reps`).value     = card.reps     || "";
    document.getElementById(`${day}-weight`).value   = card.weight   || "";
    document.getElementById(`${day}-notes`).value    = card.notes    || "";

    editInfo.day = day;
    editInfo.docId = docId;

    // ZMIANA NAPISU PRZYCISKU NA "Zapisz zmiany"
    const addBtn = document.querySelector(`#${day} .exercise-form button#${day}-add-btn`);
    if (addBtn) {
      addBtn.textContent = "Zapisz zmiany";
    }

    // Pokazujemy przycisk Anuluj
    const cancelBtn = document.getElementById(`${day}-cancel-btn`);
    if (cancelBtn) {
      cancelBtn.classList.remove("hidden");
    }

    console.log(`Edytowanie ćwiczenia: ${docId} dla dnia: ${day}`);
  } catch (error) {
    console.error("Błąd przy edytowaniu ćwiczenia: ", error);
    alert("Wystąpił błąd podczas edytowania ćwiczenia. Spróbuj ponownie.");
  }
}

/*************************************************************
  8. ZAPIS GRUP MIĘŚNIOWYCH
*************************************************************/
function saveMuscleGroups() {
  console.log("saveMuscleGroups called");
  
  const user = auth.currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany. Nie można zapisać grup mięśniowych.");
    alert("Musisz być zalogowany, aby zapisać grupy mięśniowe.");
    return;
  }

  allDays.forEach(day => {
    const inp = document.getElementById(`${day}-muscle-group`);
    if (!inp) return;
    const muscleGroup = inp.value.trim();
    setDoc(doc(db, "users", user.uid, "days", day), {
      muscleGroup: muscleGroup
    }, { merge: true })
      .then(() => {
        console.log(`Grupa mięśniowa dla ${dayMap[day]} została zapisana.`);
      })
      .catch(error => {
        console.error(`Błąd przy zapisywaniu grupy mięśniowej dla ${dayMap[day]}: `, error);
        alert(`Błąd przy zapisywaniu grupy mięśniowej dla ${dayMap[day]}. Spróbuj ponownie.`);
      });
  });
}

async function loadMuscleGroupFromFirestore(day) {
  console.log(`loadMuscleGroupFromFirestore called for day: ${day}`);
  
  const inp = document.getElementById(`${day}-muscle-group`);
  if (!inp) return;

  const user = auth.currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "users", user.uid, "days", day));
    if (docSnap.exists() && docSnap.data().muscleGroup) {
      inp.value = docSnap.data().muscleGroup;
      console.log(`Loaded muscle group for ${day}: ${docSnap.data().muscleGroup}`);
    }
  } catch (error) {
    console.error("Błąd przy ładowaniu grupy mięśniowej: ", error);
    alert("Wystąpił błąd podczas ładowania grupy mięśniowej. Spróbuj ponownie.");
  }
}

/*************************************************************
  9. ZAPIS (SAVE) KART DO HISTORII
*************************************************************/
async function saveToHistory(day) {
  console.log(`saveToHistory called for day: ${day}`);
  
  const user = auth.currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby zapisywać dane do historii.");
    console.log("No user is logged in.");
    return;
  }

  try {
    const querySnapshot = await getDocs(collection(db, "users", user.uid, "days", day, "exercises"));
    const date = new Date().toLocaleDateString();
    const dayName = dayMap[day] || "Nieznany dzień";
    console.log(`Saving exercises for ${dayName} on ${date}`);

    const batch = writeBatch(db);
    querySnapshot.forEach(docSnapshot => {
      const card = docSnapshot.data();
      if (Object.values(card).some(val => val !== "")) {
        console.log(`Saving to history: ${card.exercise}`);
        const historyRef = collection(db, "users", user.uid, "history");
        batch.set(doc(historyRef), {
          date,
          day: dayName,
          exercise: card.exercise,
          series: card.series,
          reps: card.reps,
          weight: card.weight,
          notes: card.notes
        });
      }
    });

    await batch.commit();
    console.log("Dane zostały zapisane do historii.");
    alert("Dane zostały zapisane do historii!");
  } catch (error) {
    console.error("Błąd przy zapisywaniu do historii: ", error);
    alert("Wystąpił błąd podczas zapisywania do historii. Spróbuj ponownie.");
  }
}

/*************************************************************
  10. FILTROWANIE HISTORII
*************************************************************/
async function showDatesForDay() {
  console.log("showDatesForDay called");
  
  const selectedDay = document.getElementById("filter-day").value;
  const dateFilter = document.getElementById("date-filter");
  const historyBody = document.getElementById("history-table-body");

  if (!selectedDay) {
    dateFilter.classList.add("hidden");
    historyBody.innerHTML = "";
    console.log("No day selected, hiding date filter and clearing history.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    alert("Musisz być zalogowany, aby filtrować historię.");
    return;
  }

  try {
    const q = query(collection(db, "users", user.uid, "history"), where("day", "==", selectedDay));
    const querySnapshot = await getDocs(q);
    const uniqueDates = [...new Set(
      querySnapshot.docs.map(doc => doc.data().date)
    )];
    console.log(`Found unique dates: ${uniqueDates}`);

    if (uniqueDates.length === 0) {
      dateFilter.classList.add("hidden");
      historyBody.innerHTML = "";
      console.log("No unique dates found, hiding date filter and clearing history.");
      alert("Brak wpisów dla wybranego dnia.");
      return;
    }

    dateFilter.classList.remove("hidden");
    const dateSelect = document.getElementById("filter-date");
    dateSelect.innerHTML = `<option value="">Wybierz datę</option>`;
    uniqueDates.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      dateSelect.appendChild(opt);
    });
    historyBody.innerHTML = "";
    console.log("Populated date filter with unique dates.");
  } catch (error) {
    console.error("Błąd przy filtrowaniu historii: ", error);
    alert("Wystąpił błąd podczas filtrowania historii. Spróbuj ponownie.");
  }
}

async function loadHistoryForDate() {
  console.log("loadHistoryForDate called");
  
  const selectedDay = document.getElementById("filter-day").value;
  const selectedDate= document.getElementById("filter-date").value;
  const historyBody = document.getElementById("history-table-body");

  if (!selectedDate) {
    historyBody.innerHTML = "";
    console.log("No date selected, clearing history table.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    alert("Musisz być zalogowany, aby przeglądać historię.");
    return;
  }

  try {
    const q = query(collection(db, "users", user.uid, "history"), where("day", "==", selectedDay), where("date", "==", selectedDate));
    const querySnapshot = await getDocs(q);
    historyBody.innerHTML = "";
    if (querySnapshot.empty) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `
        <td colspan="8" style="text-align:center;color:#999;">Brak danych dla wybranej daty</td>`;
      historyBody.appendChild(emptyRow);
      console.log("No history data found for selected date.");
      alert("Brak wpisów dla wybranej daty.");
      return;
    }

    querySnapshot.forEach(docSnapshot => {
      const entry = docSnapshot.data();
      const docId = docSnapshot.id;
      const row= document.createElement("tr");
      row.innerHTML=`
        <td>${escapeHTML(entry.date)}</td>
        <td>${escapeHTML(entry.day)}</td>
        <td>${escapeHTML(entry.exercise)}</td>
        <td>${escapeHTML(entry.series)}</td>
        <td>${escapeHTML(entry.reps)}</td>
        <td>${escapeHTML(entry.weight)}</td>
        <td>${escapeHTML(entry.notes)}</td>
        <td><button class="btn-reset" onclick="deleteHistoryEntry('${docId}')">Usuń</button></td>
      `;
      historyBody.appendChild(row);
    });
    console.log("Loaded history data for selected date.");
  } catch (error) {
    console.error("Błąd przy ładowaniu historii: ", error);
    alert("Wystąpił błąd podczas ładowania historii. Spróbuj ponownie.");
  }
}

/*************************************************************
  USUWANIE WPISÓW Z HISTORII
*************************************************************/
async function loadHistoryFromFirestore(){
  console.log("loadHistoryFromFirestore called");
  
  const historyBody= document.getElementById("history-table-body");
  if(!historyBody) {
    console.log("History table body not found.");
    return;
  }
  historyBody.innerHTML='';

  const user = auth.currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  try {
    const querySnapshot = await getDocs(collection(db, "users", user.uid, "history"));
    if (querySnapshot.empty) {
      const emptyRow= document.createElement('tr');
      emptyRow.innerHTML=`
        <td colspan="8" style="text-align:center;color:#999;">Brak zapisanej historii</td>`;
      historyBody.appendChild(emptyRow);
      console.log("No history data found.");
      return;
    }
    querySnapshot.forEach(docSnapshot => {
      const entry = docSnapshot.data();
      const docId = docSnapshot.id;
      const row= document.createElement("tr");
      row.innerHTML=`
        <td>${escapeHTML(entry.date)}</td>
        <td>${escapeHTML(entry.day)}</td>
        <td>${escapeHTML(entry.exercise)}</td>
        <td>${escapeHTML(entry.series)}</td>
        <td>${escapeHTML(entry.reps)}</td>
        <td>${escapeHTML(entry.weight)}</td>
        <td>${escapeHTML(entry.notes)}</td>
        <td><button class="btn-reset" onclick="deleteHistoryEntry('${docId}')">Usuń</button></td>
      `;
      historyBody.appendChild(row);
    });
    console.log("Loaded all history data.");
  } catch (error) {
    console.error("Błąd przy ładowaniu historii: ", error);
    alert("Wystąpił błąd podczas ładowania historii. Spróbuj ponownie.");
  }
}

async function deleteHistoryEntry(docId){
  console.log(`deleteHistoryEntry called for docId: ${docId}`);
  
  const user = auth.currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby usuwać wpisy z historii.");
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  if (!confirm("Czy na pewno chcesz usunąć ten wpis z historii?")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "users", user.uid, "history", docId));
    console.log("Wpis historii usunięty pomyślnie.");
    loadHistoryFromFirestore();
  } catch (error) {
    console.error("Błąd przy usuwaniu wpisu historii: ", error);
    alert("Wystąpił błąd podczas usuwania wpisu historii. Spróbuj ponownie.");
  }
}

/*************************************************************
  FUNKCJE LOGOWANIA Firebase
*************************************************************/
// 1) Zalogowanie istniejącego użytkownika
async function signIn() {
  console.log("signIn called");
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  console.log(`Attempting to sign in with email: ${email}`);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign in successful.");
    document.getElementById('login-error').textContent = "";
    document.getElementById('login-info').textContent = "Zalogowano jako: " + userCredential.user.email;
  } catch (error) {
    console.error("Sign in failed:", error);
    document.getElementById('login-error').textContent = error.message;
    alert(`Logowanie nie powiodło się: ${error.message}`);
  }
}

// 2) Rejestracja nowego użytkownika
async function signUp() {
  console.log("signUp called");
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  console.log(`Attempting to sign up with email: ${email}`);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Sign up successful.");
    document.getElementById('login-error').textContent = "";
    document.getElementById('login-info').textContent = "Utworzono konto: " + userCredential.user.email;
  } catch (error) {
    console.error("Sign up failed:", error);
    document.getElementById('login-error').textContent = error.message;
    alert(`Rejestracja nie powiodła się: ${error.message}`);
  }
}

// 3) Wylogowanie
async function signOut() {
  console.log("signOut called");
  
  try {
    await firebaseSignOut(auth);
    console.log("Sign out successful.");
    document.getElementById('login-info').textContent = "Wylogowano";
    alert("Wylogowano pomyślnie.");
  } catch (error) {
    console.error("Sign out failed:", error);
    document.getElementById('login-error').textContent = error.message;
    alert(`Wylogowanie nie powiodło się: ${error.message}`);
  }
}

/*************************************************************
  4. NASŁUCHIWANIE STANU UŻYTKOWNIKA
*************************************************************/
onAuthStateChanged(auth, async (user) => {
  console.log("onAuthStateChanged called. User:", user ? user.email : "None");
  
  if (user) {
    // Zalogowano
    console.log("Zalogowano:", user.email);
    document.getElementById('login-info').textContent = "Zalogowano jako: " + user.email;

    // Pokazuj sekcje planu treningowego
    document.querySelector('.container').style.display = 'block';

    // Ukryj sekcję logowania
    document.getElementById('login-section').style.display = 'none';

    // Sprawdź, czy są dane w localStorage
    const hasLocalData = allDays.some(day => localStorage.getItem(`${day}-data`) || localStorage.getItem(`${day}-muscle-group`)) || localStorage.getItem("history-data");
    if (hasLocalData) {
      // Przeprowadź migrację
      console.log("Migrating localStorage data to Firestore.");
      await migrateLocalStorageToFirestore();
    }

    // Ładuj dane z Firestore
    allDays.forEach(day => {
      loadCardsDataFromFirestore(day);
      loadMuscleGroupFromFirestore(day);
    });
    loadHistoryFromFirestore();
  } else {
    // Wylogowano
    console.log("Wylogowano lub nikt nie zalogowany");
    document.getElementById('login-info').textContent = "";

    // Ukryj sekcje planu treningowego
    document.querySelector('.container').style.display = 'none';

    // Pokaz sekcję logowania
    document.getElementById('login-section').style.display = 'block';
  }
});

/*************************************************************
  5. MIGRACJA DANYCH Z LOCALSTORAGE DO FIRESTORE
*************************************************************/
async function migrateLocalStorageToFirestore() {
  console.log("migrateLocalStorageToFirestore called");
  
  const user = auth.currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany. Nie można przeprowadzić migracji.");
    return;
  }

  try {
    // Przechodzimy przez wszystkie dni tygodnia
    for (const day of allDays) {
      const dayData = JSON.parse(localStorage.getItem(`${day}-data`)) || [];
      const muscleGroup = localStorage.getItem(`${day}-muscle-group`) || "";

      // Zapisujemy grupę mięśniową
      if (muscleGroup) {
        await setDoc(doc(db, "users", user.uid, "days", day), {
          muscleGroup: muscleGroup
        }, { merge: true });
        console.log(`Grupa mięśniowa dla ${dayMap[day]} została zapisana.`);
      }

      // Zapisujemy ćwiczenia
      for (const exercise of dayData) {
        await addDoc(collection(db, "users", user.uid, "days", day, "exercises"), exercise);
        console.log(`Ćwiczenie "${exercise.exercise}" dla dnia ${dayMap[day]} zostało dodane do Firestore.`);
      }

      // Opcjonalnie: usuń dane z localStorage po migracji
      localStorage.removeItem(`${day}-data`);
      localStorage.removeItem(`${day}-muscle-group`);
      console.log(`Dane z localStorage dla dnia ${dayMap[day]} zostały usunięte.`);
    }

    // Przechowujemy historię treningów
    const historyData = JSON.parse(localStorage.getItem("history-data")) || [];
    for (const entry of historyData) {
      await addDoc(collection(db, "users", user.uid, "history"), entry);
      console.log(`Wpis historii na dzień ${entry.day}, data ${entry.date} został dodany do Firestore.`);
    }
    localStorage.removeItem("history-data");
    console.log("Dane historyczne z localStorage zostały usunięte.");

    console.log("Migracja danych zakończona pomyślnie!");
    alert("Migracja danych zakończona pomyślnie!");
  } catch (error) {
    console.error("Błąd przy migracji danych: ", error);
    alert(`Wystąpił błąd podczas migracji danych: ${error.message}`);
  }
}

/*************************************************************
  ZABEZPIECZENIE PRZED XSS
*************************************************************/
function escapeHTML(str){
  if(!str) return "";
  return str
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
