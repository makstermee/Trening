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

let editInfo = {
  day: null,
  docId: null
};

const db = firebase.firestore();

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
  2. INICJALIZACJA
*************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector('.container').style.display = 'none';

  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      console.log("Zalogowano jako:", user.email);
      // Zamiast starego login-info, możemy to zignorować w nowym UI lub wyświetlić w konsoli
      document.querySelector('.container').style.display = 'block';
      document.getElementById('login-section').style.display = 'none';

      // Migracja (zachowana logika)
      const hasLocalData = allDays.some(day => localStorage.getItem(`${day}-data`) || localStorage.getItem(`${day}-muscle-group`)) || localStorage.getItem("history-data");
      if (hasLocalData) {
        migrateLocalStorageToFirestore();
      }

      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });
      // Domyślnie załaduj poniedziałek
      selectDay('monday'); 
    } else {
      console.log("Wylogowano");
      document.querySelector('.container').style.display = 'none';
      document.getElementById('login-section').style.display = 'flex'; // Flex dla centrowania
    }
  });
});

/*************************************************************
  3. DODAWANIE / AKTUALIZACJA
*************************************************************/
function addCard(day) {
  if (editInfo.day === day && editInfo.docId !== null) {
    updateCard(day, editInfo.docId);
  } else {
    createNewCard(day);
  }
}

function createNewCard(day) {
  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series   = document.getElementById(`${day}-series`).value.trim();
  const reps     = document.getElementById(`${day}-reps`).value.trim();
  const weight   = document.getElementById(`${day}-weight`).value.trim();
  const notes    = document.getElementById(`${day}-notes`).value.trim();

  if (!exercise && !series && !reps && !weight && !notes) return;

  const cardData = { exercise, series, reps, weight, notes };
  const user = firebase.auth().currentUser;
  if (!user) return;

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").add(cardData)
    .then(() => {
      clearForm(day);
      loadCardsDataFromFirestore(day);
    });
}

function updateCard(day, docId) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series   = document.getElementById(`${day}-series`).value.trim();
  const reps     = document.getElementById(`${day}-reps`).value.trim();
  const weight   = document.getElementById(`${day}-weight`).value.trim();
  const notes    = document.getElementById(`${day}-notes`).value.trim();

  const updatedData = { exercise, series, reps, weight, notes };

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).update(updatedData)
    .then(() => {
      clearForm(day);
      resetEditMode(day);
      loadCardsDataFromFirestore(day);
    });
}

function cancelEdit(day) {
  clearForm(day);
  resetEditMode(day);
}

// Helpery do czyszczenia (dla czytelności)
function clearForm(day) {
    document.getElementById(`${day}-exercise`).value = "";
    document.getElementById(`${day}-series`).value   = "";
    document.getElementById(`${day}-reps`).value     = "";
    document.getElementById(`${day}-weight`).value   = "";
    document.getElementById(`${day}-notes`).value    = "";
}

function resetEditMode(day) {
    editInfo.day = null;
    editInfo.docId = null;
    const addBtn = document.querySelector(`#${day} #monday-add-btn, #${day} #tuesday-add-btn, #${day} #wednesday-add-btn, #${day} #thursday-add-btn, #${day} #friday-add-btn, #${day} #saturday-add-btn, #${day} #sunday-add-btn`);
    // Znajdź przycisk po ID dynamicznie
    const specificBtn = document.getElementById(`${day}-add-btn`);
    if (specificBtn) specificBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Dodaj';
    
    const cancelBtn = document.getElementById(`${day}-cancel-btn`);
    if (cancelBtn) cancelBtn.classList.add("hidden");
}

/*************************************************************
  4. ŁADOWANIE KART (Z nowym wyglądem HTML karty)
*************************************************************/
function loadCardsDataFromFirestore(day) {
  const container = document.getElementById(`${day}-cards`);
  if (!container) return;
  container.innerHTML = "";

  const user = firebase.auth().currentUser;
  if (!user) return;

  // Dodano orderBy('order') jeśli używasz drag&drop, jeśli nie - domyślne sortowanie
  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").orderBy("order", "asc").get() 
    .then(querySnapshot => {
        // Jeśli orderBy failuje (brak indeksu), spróbuj bez:
        // .collection("exercises").get()
      renderCards(querySnapshot, container, day);
    })
    .catch(() => {
       // Fallback jeśli brak pola order
       db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
       .then(qs => renderCards(qs, container, day));
    });
}

function renderCards(querySnapshot, container, day) {
    querySnapshot.forEach(doc => {
        const card = doc.data();
        const docId = doc.id;

        const cardDiv = document.createElement("div");
        cardDiv.classList.add("exercise-card");
        cardDiv.setAttribute("data-id", docId); // Dla Drag & Drop
        cardDiv.setAttribute("draggable", "true"); // Dla Drag & Drop

        const headerDiv = document.createElement("div");
        headerDiv.classList.add("exercise-card-header");
        headerDiv.innerHTML = `<span>${escapeHTML(card.exercise)}</span>`; // Span dla bezpieczeństwa

        const detailsDiv = document.createElement("div");
        detailsDiv.classList.add("exercise-card-details");
        // Nowy ładniejszy layout detali
        detailsDiv.innerHTML = `
          <p><span>Serie:</span> <strong>${escapeHTML(card.series)}</strong></p>
          <p><span>Powt:</span> <strong>${escapeHTML(card.reps)}</strong></p>
          <p><span>Kg:</span> <strong>${escapeHTML(card.weight)}</strong></p>
          <p style="display:block; margin-top:8px; font-style:italic; font-size:0.9em; color:#888;">${escapeHTML(card.notes)}</p>
          <div style="text-align:right; margin-top:10px;">
             <button class="btn-save" onclick="editCard('${day}', '${docId}')"><i class="fa-solid fa-pen"></i> Edytuj</button>
             <button class="btn-reset" onclick="deleteCard('${day}', '${docId}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        `;

        headerDiv.addEventListener("click", () => {
          detailsDiv.classList.toggle("show");
          headerDiv.classList.toggle("expanded");
        });

        cardDiv.appendChild(headerDiv);
        cardDiv.appendChild(detailsDiv);
        container.appendChild(cardDiv);
    });
    
    // Re-attach drag events (ponieważ tworzymy elementy dynamicznie)
    attachDragEvents(container);
}

/*************************************************************
  5. USUWANIE
*************************************************************/
function deleteCard(day, docId) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).delete()
    .then(() => loadCardsDataFromFirestore(day));
}

/*************************************************************
  6. RESET
*************************************************************/
function resetCards(day) {
  if (confirm("Zresetować wszystkie ćwiczenia dla tego dnia?")) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
      .then(qs => {
        const batch = db.batch();
        qs.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
      })
      .then(() => loadCardsDataFromFirestore(day));
  }
}

/*************************************************************
  7. EDYCJA
*************************************************************/
function editCard(day, docId) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).get()
    .then(doc => {
      if (!doc.exists) return;
      const card = doc.data();
      document.getElementById(`${day}-exercise`).value = card.exercise || "";
      document.getElementById(`${day}-series`).value   = card.series   || "";
      document.getElementById(`${day}-reps`).value     = card.reps     || "";
      document.getElementById(`${day}-weight`).value   = card.weight   || "";
      document.getElementById(`${day}-notes`).value    = card.notes    || "";

      editInfo.day = day;
      editInfo.docId = docId;

      const addBtn = document.getElementById(`${day}-add-btn`);
      if (addBtn) addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Zapisz';
      
      const cancelBtn = document.getElementById(`${day}-cancel-btn`);
      if (cancelBtn) cancelBtn.classList.remove("hidden");
      
      // Scroll to form
      document.querySelector(`#${day} .add-exercise-wrapper`).scrollIntoView({behavior: "smooth"});
    });
}

/*************************************************************
  DRAG AND DROP (Zachowane)
*************************************************************/
function attachDragEvents(container) {
    // Usuń stare listenery (klonowanie niszczy listenery)
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    container = newContainer; // referencja na nowy

    // Tutaj logika drag and drop, ale uproszczona dla bezpieczeństwa w nowym UI
    container.addEventListener("dragstart", e => {
        if (e.target.classList.contains("exercise-card")) e.target.classList.add("dragging");
    });
    container.addEventListener("dragend", e => {
        if (e.target.classList.contains("exercise-card")) {
            e.target.classList.remove("dragging");
            saveNewOrder(container.id.replace("-cards", "")); // np. 'monday'
        }
    });
    container.addEventListener("dragover", e => {
        e.preventDefault();
        const draggingCard = container.querySelector(".dragging");
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) container.appendChild(draggingCard);
        else container.insertBefore(draggingCard, afterElement);
    });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".exercise-card:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    else return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveNewOrder(day) {
  const container = document.getElementById(`${day}-cards`);
  const cards = [...container.querySelectorAll(".exercise-card")];
  const user = firebase.auth().currentUser;
  if (!user) return;
  const batch = db.batch();
  cards.forEach((card, index) => {
    const cardRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(card.getAttribute("data-id"));
    batch.update(cardRef, { order: index });
  });
  batch.commit().catch(console.error);
}

/*************************************************************
  8. GRUPY MIĘŚNIOWE
*************************************************************/
function saveMuscleGroups() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  allDays.forEach(day => {
    const inp = document.getElementById(`${day}-muscle-group`);
    if (!inp) return;
    db.collection("users").doc(user.uid).collection("days").doc(day).set({ muscleGroup: inp.value.trim() }, { merge: true });
  });
}

function loadMuscleGroupFromFirestore(day) {
  const inp = document.getElementById(`${day}-muscle-group`);
  const user = firebase.auth().currentUser;
  if (!user || !inp) return;
  db.collection("users").doc(user.uid).collection("days").doc(day).get()
    .then(doc => { if (doc.exists) inp.value = doc.data().muscleGroup || ""; });
}

/*************************************************************
  9. ZAPIS DO HISTORII
*************************************************************/
function saveToHistory(day) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
    .then(qs => {
      const batch = db.batch();
      const date = new Date().toLocaleDateString();
      qs.forEach(doc => {
        const c = doc.data();
        if (Object.values(c).some(v => v !== "")) {
          const ref = db.collection("users").doc(user.uid).collection("history").doc();
          batch.set(ref, {
            date, day: dayMap[day], exercise: c.exercise, series: c.series, reps: c.reps, weight: c.weight, notes: c.notes
          });
        }
      });
      return batch.commit();
    })
    .then(() => alert("Trening zapisany do historii!"));
}

/*************************************************************
  10. HISTORIA (ZMODYFIKOWANY HTML TABELI)
*************************************************************/
function showDatesForDay() {
  const selectedDay = document.getElementById("filter-day").value;
  const dateFilter = document.getElementById("date-filter");
  const user = firebase.auth().currentUser;
  
  if (!selectedDay || !user) {
    dateFilter.classList.add("hidden");
    document.getElementById("history-table-body").innerHTML = "";
    return;
  }

  db.collection("users").doc(user.uid).collection("history").where("day", "==", selectedDay).get()
    .then(qs => {
      const dates = [...new Set(qs.docs.map(d => d.data().date))];
      if (dates.length === 0) {
         dateFilter.classList.add("hidden");
         return;
      }
      dateFilter.classList.remove("hidden");
      const select = document.getElementById("filter-date");
      select.innerHTML = `<option value="">Wybierz datę</option>` + dates.map(d => `<option value="${d}">${d}</option>`).join('');
    });
}

function loadHistoryForDate() {
  const day = document.getElementById("filter-day").value;
  const date = document.getElementById("filter-date").value;
  const tbody = document.getElementById("history-table-body");
  const user = firebase.auth().currentUser;

  if (!date || !user) { tbody.innerHTML = ""; return; }

  db.collection("users").doc(user.uid).collection("history").where("day", "==", day).where("date", "==", date).get()
    .then(qs => {
       renderHistoryRows(qs, tbody);
    });
}

function loadHistoryFromFirestore(){
  const tbody = document.getElementById("history-table-body");
  const user = firebase.auth().currentUser;
  if (!user) return;

  db.collection("users").doc(user.uid).collection("history").orderBy("date", "desc").limit(50).get()
    .then(qs => {
       renderHistoryRows(qs, tbody);
    })
    .catch(() => {
        // Fallback bez indexu
        db.collection("users").doc(user.uid).collection("history").limit(50).get()
        .then(qs => renderHistoryRows(qs, tbody));
    });
}

// Funkcja pomocnicza do renderowania wierszy w nowym stylu
function renderHistoryRows(querySnapshot, tbody) {
    tbody.innerHTML = "";
    if (querySnapshot.empty) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#777;">Brak danych</td></tr>`;
        return;
    }
    querySnapshot.forEach(doc => {
        const e = doc.data();
        const row = document.createElement("tr");
        // Skrócony widok dla mobile
        row.innerHTML = `
          <td><small style="color:#888">${escapeHTML(e.date)}</small></td>
          <td><strong>${escapeHTML(e.exercise)}</strong></td>
          <td>${escapeHTML(e.series)} x ${escapeHTML(e.reps)}</td>
          <td>${escapeHTML(e.weight)}</td>
          <td><button onclick="deleteHistoryEntry('${doc.id}')"><i class="fa-solid fa-xmark"></i></button></td>
        `;
        tbody.appendChild(row);
    });
}

function deleteHistoryEntry(docId){
  const user = firebase.auth().currentUser;
  if (!user) return;
  if(confirm("Usunąć wpis?")) {
      db.collection("users").doc(user.uid).collection("history").doc(docId).delete()
        .then(() => {
            // Odśwież widok w zależności co jest aktywne
            if(document.getElementById("filter-date").value) loadHistoryForDate();
            else loadHistoryFromFirestore();
        });
  }
}

/*************************************************************
  LOGOWANIE / MIGRACJA / UTIL
*************************************************************/
function showLogin() { /* Obsłużone w HTML przez switchAuthTab, ale zostawiamy dla wstecznej kompatybilności */ }
function showRegister() { }

async function signUp() {
  const email = document.getElementById('register-email').value;
  const pass = document.getElementById('register-password').value;
  try {
    await firebase.auth().createUserWithEmailAndPassword(email, pass);
    alert("Konto utworzone!");
    switchAuthTab('login'); // Nowa funkcja UI
  } catch (e) {
    document.getElementById('register-error').textContent = e.message;
  }
}

async function signIn() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, pass);
  } catch (e) {
    document.getElementById('login-error').textContent = e.message;
  }
}

async function signOut() {
  await firebase.auth().signOut();
  location.reload(); // Najczystszy reset UI
}

async function migrateLocalStorageToFirestore() {
  /* TWOJA ORYGINALNA LOGIKA MIGRACJI POZOSTAJE BEZ ZMIAN */
  // Skróciłem tutaj dla czytelności odpowiedzi, ale wklej tu swoją funkcję 
  // z oryginalnego pliku, nic nie trzeba w niej zmieniać.
  const user = firebase.auth().currentUser;
  if (!user) return;
  // ... (reszta kodu migracji) ...
}

function escapeHTML(str){
  if(!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
