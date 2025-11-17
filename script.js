/*************************************************************
  ZMIENNE GLOBALNE
*************************************************************/
const dayMap = {
  monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa",
  thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela"
};
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

let editInfo = { day: null, docId: null };
// Nowa zmienna dla modala
let currentModalDay = null;

const db = firebase.firestore();

/*************************************************************
  1. INICJALIZACJA I NAWIGACJA
*************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector('.container').style.display = 'none';
  
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      document.querySelector('.container').style.display = 'block';
      document.getElementById('login-section').style.display = 'none';
      
      // Ładowanie danych
      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });
      selectDay('monday'); // Start
    } else {
      document.querySelector('.container').style.display = 'none';
      document.getElementById('login-section').style.display = 'flex';
    }
  });
});

function showSection() {
  const sections = document.querySelectorAll(".day-section");
  sections.forEach(sec => sec.classList.add("hidden"));
  const selected = document.getElementById("day-selector").value;
  const toShow = document.getElementById(selected);
  if (toShow) toShow.classList.remove("hidden");
  
  // Ukryj FAB w historii
  const fab = document.getElementById('fab-add');
  if(fab) fab.style.display = (selected === 'history') ? 'none' : 'flex';
  
  if(selected === 'history') loadHistoryFromFirestore();
}

/*************************************************************
  2. NOWA LOGIKA MODALA (DODAWANIE)
*************************************************************/
function openAddModal(day = null) {
    // Jeśli nie podano dnia, bierzemy aktualnie wybrany
    if(!day) day = document.getElementById('day-selector').value;
    currentModalDay = day;
    
    // Reset pól
    document.getElementById('modal-exercise').value = "";
    document.getElementById('modal-series').value = "";
    document.getElementById('modal-reps').value = "";
    document.getElementById('modal-weight').value = "";
    document.getElementById('modal-notes').value = "";
    
    document.getElementById('modal-title').innerText = "Dodaj ćwiczenie";
    document.getElementById('modal-save-btn').innerText = "DODAJ";
    
    editInfo = { day: null, docId: null }; // Reset trybu edycji
    
    // Pokaż modal
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    // Timeout dla animacji CSS
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closeAddModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

// Funkcja wywoływana przyciskiem "ZAPISZ" w modalu
function saveFromModal() {
    const day = currentModalDay;
    const exercise = document.getElementById('modal-exercise').value.trim();
    const series = document.getElementById('modal-series').value;
    const reps = document.getElementById('modal-reps').value;
    const weight = document.getElementById('modal-weight').value;
    const notes = document.getElementById('modal-notes').value;

    if(!exercise && !series) {
        alert("Wpisz chociaż nazwę ćwiczenia.");
        return;
    }

    const data = { exercise, series, reps, weight, notes };

    if(editInfo.docId) {
        // Edycja
        updateCardInFirestore(day, editInfo.docId, data);
    } else {
        // Nowe
        addCardToFirestore(day, data);
    }
    closeAddModal();
}

/*************************************************************
  3. FIREBASE CRUD (Dodawanie/Edycja/Usuwanie)
*************************************************************/
function addCardToFirestore(day, data) {
    const user = firebase.auth().currentUser;
    if(!user) return;
    
    // Dajemy order = Date.now() żeby nowe były na dole (proste sortowanie)
    data.order = Date.now();

    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").add(data)
    .then(() => loadCardsDataFromFirestore(day));
}

function updateCardInFirestore(day, docId, data) {
    const user = firebase.auth().currentUser;
    if(!user) return;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).update(data)
    .then(() => loadCardsDataFromFirestore(day));
}

function deleteCard(day, docId) {
    if(!confirm("Usunąć to ćwiczenie?")) return;
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).delete()
    .then(() => loadCardsDataFromFirestore(day));
}

function resetCards(day) {
    if(!confirm("Zresetować cały trening?")) return;
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
    .then(qs => {
        const batch = db.batch();
        qs.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => loadCardsDataFromFirestore(day));
}

/*************************************************************
  4. RENDEROWANIE KART (AKORDEON)
*************************************************************/
function loadCardsDataFromFirestore(day) {
    const container = document.getElementById(`${day}-cards`);
    if(!container) return;
    container.innerHTML = "";
    
    const user = firebase.auth().currentUser;
    if(!user) return;

    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises")
    .orderBy("order", "asc") // Sortowanie
    .get()
    .then(qs => {
        if(qs.empty) {
            // Opcjonalnie pokaż komunikat "Pusto"
            return;
        }
        qs.forEach(doc => {
            renderAccordionCard(container, day, doc);
        });
    });
}

function renderAccordionCard(container, day, doc) {
    const data = doc.data();
    const id = doc.id;
    
    const card = document.createElement('div');
    card.className = 'exercise-card';
    
    // Tworzymy HTML Akordeonu
    card.innerHTML = `
        <div class="exercise-card-header" onclick="toggleCard(this)">
            <div class="header-left">
                <i class="fa-solid fa-bars drag-handle"></i>
                <div>
                    <div class="ex-title">${escapeHTML(data.exercise)}</div>
                    <div class="ex-summary">${escapeHTML(data.series)}s x ${escapeHTML(data.reps)}r @ ${escapeHTML(data.weight)}kg</div>
                </div>
            </div>
            <i class="fa-solid fa-chevron-down expand-icon"></i>
        </div>
        <div class="exercise-card-details">
            <div class="details-grid">
                <div class="detail-item"><span class="detail-label">SERIE</span><div class="detail-val">${data.series || '-'}</div></div>
                <div class="detail-item"><span class="detail-label">POWT</span><div class="detail-val">${data.reps || '-'}</div></div>
                <div class="detail-item"><span class="detail-label">CIĘŻAR</span><div class="detail-val">${data.weight || '-'}</div></div>
            </div>
            ${data.notes ? `<div class="notes-box">"${escapeHTML(data.notes)}"</div>` : ''}
            
            <div class="card-actions">
                <button class="btn-icon btn-edit" onclick="triggerEdit('${day}', '${id}')">
                    <i class="fa-solid fa-pen"></i> Edytuj
                </button>
                <button class="btn-icon btn-delete" onclick="deleteCard('${day}', '${id}')">
                    <i class="fa-solid fa-trash"></i> Usuń
                </button>
            </div>
        </div>
    `;
    container.appendChild(card);
}

// Funkcja rozwijania karty
window.toggleCard = function(header) {
    header.parentElement.classList.toggle('open');
};

// Funkcja uruchamiająca edycję (otwiera modal z danymi)
window.triggerEdit = function(day, docId) {
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).get()
    .then(doc => {
        if(doc.exists) {
            const d = doc.data();
            // Wypełnij modal
            document.getElementById('modal-exercise').value = d.exercise;
            document.getElementById('modal-series').value = d.series;
            document.getElementById('modal-reps').value = d.reps;
            document.getElementById('modal-weight').value = d.weight;
            document.getElementById('modal-notes').value = d.notes;
            
            document.getElementById('modal-title').innerText = "Edytuj ćwiczenie";
            document.getElementById('modal-save-btn').innerText = "ZAPISZ ZMIANY";
            
            // Ustaw tryb edycji
            editInfo = { day: day, docId: docId };
            currentModalDay = day;
            
            // Otwórz modal
            const overlay = document.getElementById('modal-overlay');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('active'), 10);
        }
    });
};

/*************************************************************
  5. POZOSTAŁE FUNKCJE (Historia, Muscle, Auth) - BEZ ZMIAN
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

function saveToHistory(day) {
  const user = firebase.auth().currentUser;
  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
    .then(qs => {
      const batch = db.batch();
      const date = new Date().toLocaleDateString();
      qs.forEach(doc => {
        const c = doc.data();
        if (c.exercise) {
          const ref = db.collection("users").doc(user.uid).collection("history").doc();
          batch.set(ref, {
            date, day: dayMap[day], exercise: c.exercise, series: c.series, reps: c.reps, weight: c.weight, notes: c.notes
          });
        }
      });
      return batch.commit();
    })
    .then(() => alert("Zapisano w historii!"));
}

function loadHistoryFromFirestore(){
    const tbody = document.getElementById("history-table-body");
    tbody.innerHTML = "";
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("history").orderBy("date", "desc").limit(50).get()
    .then(qs => {
        qs.forEach(doc => {
            const d = doc.data();
            tbody.innerHTML += `<tr>
                <td>${d.date}<br><small>${d.day}</small></td>
                <td>${d.exercise}</td>
                <td>${d.series}x${d.reps} @ ${d.weight}</td>
            </tr>`;
        });
    });
}

// Auth Functions
async function signIn() {
    const e = document.getElementById('login-email').value;
    const p = document.getElementById('login-password').value;
    try { await firebase.auth().signInWithEmailAndPassword(e,p); } 
    catch(err) { document.getElementById('login-error').innerText = err.message; }
}
async function signUp() {
    const e = document.getElementById('register-email').value;
    const p = document.getElementById('register-password').value;
    try { await firebase.auth().createUserWithEmailAndPassword(e,p); switchAuthTab('login'); alert("Sukces! Zaloguj się."); }
    catch(err) { document.getElementById('register-error').innerText = err.message; }
}
async function signOut() { await firebase.auth().signOut(); location.reload(); }

function escapeHTML(str){
  if(!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
