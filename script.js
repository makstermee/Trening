/*************************************************************
  ZMIENNE GLOBALNE
*************************************************************/
const dayMap = {
  monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa",
  thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela"
};
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

let editInfo = { day: null, docId: null };
let currentModalDay = null;
let timerInterval = null;

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
      
      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });
      selectDay('monday');
      checkActiveWorkout(); // Sprawdź czy trening trwa po odświeżeniu
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
  
  const fab = document.getElementById('fab-add');
  if(fab) fab.style.display = (selected === 'history') ? 'none' : 'flex';
  
  if(selected === 'history') loadHistoryFromFirestore();
  else updateActionButtons(selected); // Pokaż odpowiedni przycisk START/STOP
}

/*************************************************************
  2. LOGIKA TRENINGU (TIMER & START/STOP)
*************************************************************/
function startWorkout(day) {
    const now = Date.now();
    const workoutData = {
        day: day,
        startTime: now
    };
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    checkActiveWorkout();
    alert("Trening rozpoczęty! Powodzenia 💪");
}

function checkActiveWorkout() {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const titleEl = document.getElementById('current-day-display');
    const timerEl = document.getElementById('workout-timer');
    
    if (activeData) {
        // Trening trwa
        titleEl.style.display = 'none';
        timerEl.classList.remove('hidden');
        
        // Uruchom interwał timera
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const diff = Date.now() - activeData.startTime;
            const date = new Date(diff);
            const hh = String(date.getUTCHours()).padStart(2, '0');
            const mm = String(date.getUTCMinutes()).padStart(2, '0');
            const ss = String(date.getUTCSeconds()).padStart(2, '0');
            timerEl.textContent = `${hh}:${mm}:${ss}`;
        }, 1000);

        // Pokaż przyciski zakończenia tam gdzie trzeba
        updateActionButtons(activeData.day);

    } else {
        // Brak treningu
        titleEl.style.display = 'block';
        timerEl.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
        updateActionButtons(document.getElementById('day-selector').value);
    }
}

function updateActionButtons(currentViewDay) {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const container = document.getElementById(`${currentViewDay}-actions`);
    if(!container) return;

    container.innerHTML = '';

    if (activeData && activeData.day === currentViewDay) {
        // Jesteśmy w dniu, w którym trwa trening -> Pokaż "Zakończ"
        container.innerHTML = `
            <button class="btn-finish-workout" onclick="finishWorkout('${currentViewDay}')">
                <i class="fa-solid fa-flag-checkered"></i> ZAKOŃCZ TRENING
            </button>`;
    } else if (!activeData && currentViewDay !== 'history') {
        // Nie ma aktywnego treningu -> Pokaż "Start"
        container.innerHTML = `
            <button class="btn-start-workout" onclick="startWorkout('${currentViewDay}')">
                <i class="fa-solid fa-play"></i> START TRENINGU
            </button>`;
    } else if (activeData && activeData.day !== currentViewDay) {
        // Trening trwa w innym dniu
        container.innerHTML = `<p style="text-align:center; color:#666;">Trening trwa w dniu: ${dayMap[activeData.day]}</p>`;
    }
}

async function finishWorkout(day) {
    if(!confirm("Zakończyć trening i zapisać wyniki?")) return;

    const user = firebase.auth().currentUser;
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const duration = document.getElementById('workout-timer').textContent;
    
    // 1. Pobierz wszystkie ćwiczenia z tego dnia
    const qs = await db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get();
    
    const batch = db.batch();
    let exercisesDone = [];

    qs.forEach(doc => {
        const data = doc.data();
        // Jeśli są logi, to znaczy że ćwiczenie wykonane
        if (data.currentLogs && data.currentLogs.length > 0) {
            // Formatuj logi do tekstu (np. "100x5, 100x5")
            const logsText = data.currentLogs.map(l => `${l.weight}kg x ${l.reps}`).join(', ');
            exercisesDone.push({
                name: data.exercise,
                logs: logsText
            });
            
            // Wyczyść logi w bazie (reset na przyszłość)
            batch.update(doc.ref, { currentLogs: firebase.firestore.FieldValue.delete() });
        } else {
            // Jeśli nie ma logów, ale jest plan - zapisz plan jako wykonany (opcjonalnie)
            // exercisesDone.push({ name: data.exercise, logs: "Wg planu" }); 
        }
    });

    // 2. Zapisz do historii
    if (exercisesDone.length > 0) {
        const historyRef = db.collection("users").doc(user.uid).collection("history").doc();
        batch.set(historyRef, {
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            day: dayMap[day],
            duration: duration,
            details: exercisesDone // Tablica obiektów
        });
    }

    await batch.commit();

    // 3. Reset stanu
    localStorage.removeItem('activeWorkout');
    checkActiveWorkout();
    loadCardsDataFromFirestore(day); // Odśwież widok (znikną logi)
    alert("Trening zakończony! Wyniki zapisane w historii.");
}

/*************************************************************
  3. LOGGER SERII (DODAWANIE WYNIKÓW)
*************************************************************/
function addLog(day, docId) {
    const weightInp = document.getElementById(`log-w-${docId}`);
    const repsInp = document.getElementById(`log-r-${docId}`);
    const w = weightInp.value;
    const r = repsInp.value;

    if (!w || !r) return;

    const user = firebase.auth().currentUser;
    const docRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId);

    // Dodaj do tablicy currentLogs
    docRef.update({
        currentLogs: firebase.firestore.FieldValue.arrayUnion({ weight: w, reps: r })
    }).then(() => {
        weightInp.value = ''; // Nie czyść wagi, często jest ta sama? Ok, wyczyśćmy dla porządku
        // repsInp.value = ''; 
        loadCardsDataFromFirestore(day); // Odśwież UI
    });
}

function removeLog(day, docId, weight, reps) {
    const user = firebase.auth().currentUser;
    const docRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId);
    
    docRef.update({
        currentLogs: firebase.firestore.FieldValue.arrayRemove({ weight: weight, reps: reps })
    }).then(() => loadCardsDataFromFirestore(day));
}

/*************************************************************
  4. RENDEROWANIE KART (Zaktualizowane o Logger)
*************************************************************/
function loadCardsDataFromFirestore(day) {
    const container = document.getElementById(`${day}-cards`);
    if(!container) return;
    container.innerHTML = "";
    
    const user = firebase.auth().currentUser;
    if(!user) return;

    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises")
    .orderBy("order", "asc").get()
    .then(qs => {
        if(qs.empty) return;
        qs.forEach(doc => renderAccordionCard(container, day, doc));
    });
}

function renderAccordionCard(container, day, doc) {
    const data = doc.data();
    const id = doc.id;
    const logs = data.currentLogs || []; // Tablica logów

    const card = document.createElement('div');
    card.className = 'exercise-card';
    
    // Generowanie HTML logów (Chipsy)
    let logsHtml = '';
    logs.forEach(l => {
        logsHtml += `<div class="log-chip">
            <span>${l.weight}kg x ${l.reps}</span>
            <i class="fa-solid fa-xmark remove-log" onclick="removeLog('${day}', '${id}', '${l.weight}', '${l.reps}')"></i>
        </div>`;
    });

    card.innerHTML = `
        <div class="exercise-card-header" onclick="toggleCard(this)">
            <div class="header-left">
                <i class="fa-solid fa-bars drag-handle"></i>
                <div>
                    <div class="ex-title">${escapeHTML(data.exercise)}</div>
                    <div class="ex-summary">Cel: ${escapeHTML(data.series)}s x ${escapeHTML(data.reps)}r ${data.weight ? '@ '+data.weight+'kg' : ''}</div>
                </div>
            </div>
            <i class="fa-solid fa-chevron-down expand-icon"></i>
        </div>
        <div class="exercise-card-details">
            <div class="plan-vs-real-grid">
                <div class="plan-box"><span class="plan-label">CEL SERIE</span><div class="plan-val">${data.series}</div></div>
                <div class="plan-box"><span class="plan-label">CEL POWT</span><div class="plan-val">${data.reps}</div></div>
                <div class="plan-box"><span class="plan-label">CEL KG</span><div class="plan-val">${data.weight || '-'}</div></div>
            </div>
            
            ${data.notes ? `<div class="notes-box">Notatka: "${escapeHTML(data.notes)}"</div>` : ''}
            
            <div class="logger-section">
                <div class="logger-title">Wykonane Serie</div>
                <div class="logger-input-row">
                    <input type="number" id="log-w-${id}" placeholder="Kg" value="${data.weight || ''}">
                    <input type="number" id="log-r-${id}" placeholder="Powt" value="${data.reps || ''}">
                    <button class="btn-add-log" onclick="addLog('${day}', '${id}')"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="logs-list">${logsHtml}</div>
            </div>

            <div class="card-actions">
                <button class="btn-icon btn-edit" onclick="triggerEdit('${day}', '${id}')"><i class="fa-solid fa-pen"></i> Edytuj</button>
                <button class="btn-icon btn-delete" onclick="deleteCard('${day}', '${id}')"><i class="fa-solid fa-trash"></i> Usuń</button>
            </div>
        </div>
    `;
    container.appendChild(card);
}

// Toggle Card
window.toggleCard = function(header) {
    // Ignoruj kliknięcia wewnątrz loggera (inputy, przyciski) żeby nie zamykać karty
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.classList.contains('remove-log')) return;
    header.parentElement.classList.toggle('open');
};

/*************************************************************
  POZOSTAŁE FUNKCJE (Modal, CRUD, Historia - bez większych zmian)
*************************************************************/
function openAddModal(day = null) {
    if(!day) day = document.getElementById('day-selector').value;
    currentModalDay = day;
    document.getElementById('modal-exercise').value = "";
    document.getElementById('modal-series').value = "";
    document.getElementById('modal-reps').value = "";
    document.getElementById('modal-weight').value = "";
    document.getElementById('modal-notes').value = "";
    document.getElementById('modal-title').innerText = "Dodaj ćwiczenie";
    document.getElementById('modal-save-btn').innerText = "DODAJ";
    editInfo = { day: null, docId: null };
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('active'), 10);
}
function closeAddModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}
function saveFromModal() {
    const day = currentModalDay;
    const exercise = document.getElementById('modal-exercise').value.trim();
    const series = document.getElementById('modal-series').value;
    const reps = document.getElementById('modal-reps').value;
    const weight = document.getElementById('modal-weight').value;
    const notes = document.getElementById('modal-notes').value;
    if(!exercise) return alert("Nazwa wymagana");
    const data = { exercise, series, reps, weight, notes };
    if(editInfo.docId) updateCardInFirestore(day, editInfo.docId, data);
    else addCardToFirestore(day, data);
    closeAddModal();
}
function addCardToFirestore(day, data) {
    const user = firebase.auth().currentUser;
    data.order = Date.now();
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").add(data)
    .then(() => loadCardsDataFromFirestore(day));
}
function updateCardInFirestore(day, docId, data) {
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).update(data)
    .then(() => loadCardsDataFromFirestore(day));
}
function deleteCard(day, docId) {
    if(!confirm("Usunąć?")) return;
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).delete()
    .then(() => loadCardsDataFromFirestore(day));
}
window.triggerEdit = function(day, docId) {
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).get()
    .then(doc => {
        if(doc.exists) {
            const d = doc.data();
            document.getElementById('modal-exercise').value = d.exercise;
            document.getElementById('modal-series').value = d.series;
            document.getElementById('modal-reps').value = d.reps;
            document.getElementById('modal-weight').value = d.weight;
            document.getElementById('modal-notes').value = d.notes;
            document.getElementById('modal-title').innerText = "Edytuj ćwiczenie";
            document.getElementById('modal-save-btn').innerText = "ZAPISZ ZMIANY";
            editInfo = { day: day, docId: docId };
            currentModalDay = day;
            const overlay = document.getElementById('modal-overlay');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('active'), 10);
        }
    });
};
function resetCards(day) {
    if(!confirm("Zresetować plan?")) return;
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
    .then(qs => {
        const batch = db.batch();
        qs.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }).then(() => loadCardsDataFromFirestore(day));
}
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

/* NOWA HISTORIA (Wyświetla szczegóły wykonania) */
function loadHistoryFromFirestore(){
    const tbody = document.getElementById("history-table-body");
    tbody.innerHTML = "";
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("history").orderBy("date", "desc").limit(20).get()
    .then(qs => {
        qs.forEach(doc => {
            const d = doc.data();
            let detailsHtml = "";
            if(d.details && Array.isArray(d.details)) {
                detailsHtml = d.details.map(det => `<div><strong>${det.name}:</strong> ${det.logs}</div>`).join('');
            } else {
                detailsHtml = d.exercise ? `${d.exercise} (${d.series}x${d.reps})` : "Brak szczegółów";
            }
            
            tbody.innerHTML += `<tr style="border-bottom:1px solid #333;">
                <td style="padding:15px;">
                    <div style="color:#888; font-size:0.8rem; margin-bottom:5px;">
                        ${d.date} | ${d.day} | ⏱ ${d.duration || '-'}
                    </div>
                    <div style="font-size:0.9rem;">${detailsHtml}</div>
                </td>
            </tr>`;
        });
    });
}
function saveToHistory(day) { /* Stara funkcja, zastąpiona przez finishWorkout */ }

// Auth
async function signIn() {
    const e = document.getElementById('login-email').value;
    const p = document.getElementById('login-password').value;
    try { await firebase.auth().signInWithEmailAndPassword(e,p); } catch(err) { document.getElementById('login-error').innerText = err.message; }
}
async function signUp() {
    const e = document.getElementById('register-email').value;
    const p = document.getElementById('register-password').value;
    try { await firebase.auth().createUserWithEmailAndPassword(e,p); switchAuthTab('login'); alert("Sukces!"); } catch(err) { document.getElementById('register-error').innerText = err.message; }
}
async function signOut() { await firebase.auth().signOut(); location.reload(); }

function escapeHTML(str){
  if(!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
