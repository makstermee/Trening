/*************************************************************
  ZMIENNE GLOBALNE I KONFIGURACJA
*************************************************************/
const dayMap = {
  monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa",
  thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela"
};
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

let editInfo = { day: null, docId: null };
let currentModalDay = null;
let timerInterval = null;

// NOWE ZMIENNE DO NAWIGACJI
let currentMode = 'plan'; // 'plan' lub 'history'
let currentSelectedDay = 'monday'; // Aktualnie wybrany dzień (np. 'monday')

const db = firebase.firestore();

/*************************************************************
  1. INICJALIZACJA
*************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector('.container').style.display = 'none';
  
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      document.querySelector('.container').style.display = 'block';
      document.getElementById('login-section').style.display = 'none';
      
      // Załaduj dane planów
      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });
      
      // Domyślny start: Plan, Poniedziałek
      currentMode = 'plan';
      selectDay('monday'); 
      checkActiveWorkout();
    } else {
      document.querySelector('.container').style.display = 'none';
      document.getElementById('login-section').style.display = 'flex';
    }
  });
});

/*************************************************************
  2. NAWIGACJA I TRYBY (PLAN / HISTORIA)
*************************************************************/

// Funkcja wywoływana przez dolny pasek nawigacji
function switchMode(mode) {
    currentMode = mode;
    const historySection = document.getElementById('history');
    const fab = document.getElementById('fab-add');

    if (mode === 'history') {
        // Ukryj sekcje planów
        document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
        // Pokaż sekcję historii
        historySection.classList.remove('hidden');
        // Ukryj przycisk dodawania
        fab.style.display = 'none';
        
        // Załaduj historię (od razu filtrując po wybranym dniu z paska)
        loadHistoryFromFirestore(currentSelectedDay);
    } else {
        // Tryb PLAN
        historySection.classList.add('hidden');
        fab.style.display = 'flex';
        // Pokaż odpowiedni dzień planu
        showPlanSection(currentSelectedDay);
    }
    updateHeaderTitle();
}

// Funkcja wywoływana przez kliknięcie w dzień tygodnia (pigułkę)
function selectDay(dayValue) {
    currentSelectedDay = dayValue;
    document.getElementById('day-selector').value = dayValue; // dla kompatybilności

    // Aktualizacja wizualna pigułek
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    const pills = document.querySelectorAll('.pill');
    const idx = allDays.indexOf(dayValue);
    if (idx !== -1 && pills[idx]) pills[idx].classList.add('active');

    // Logika zależna od trybu
    if (currentMode === 'plan') {
        showPlanSection(dayValue);
    } else {
        // Jeśli jesteśmy w historii, to kliknięcie dnia filtruje historię
        loadHistoryFromFirestore(dayValue);
    }
    updateHeaderTitle();
}

function showPlanSection(dayValue) {
    document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
    const toShow = document.getElementById(dayValue);
    if (toShow) toShow.classList.remove("hidden");
    updateActionButtons(dayValue);
}

function updateHeaderTitle() {
    const polishName = dayMap[currentSelectedDay] || '';
    const titleEl = document.getElementById('current-day-display');
    
    // Jeśli licznik nie działa, aktualizuj tytuł
    if (document.getElementById('workout-timer').classList.contains('hidden')) {
        if (currentMode === 'plan') {
            titleEl.textContent = `Plan: ${polishName}`;
        } else {
            titleEl.textContent = `Historia: ${polishName}`;
        }
    }
}

// Funkcja pomocnicza (wymagana przez HTML select, ale teraz sterowana przez selectDay)
function showSection() {
    // Zostawiamy pustą lub przekierowujemy
}

/*************************************************************
  3. LOGIKA TRENINGU (TIMER, START/STOP)
*************************************************************/
function startWorkout(day) {
    const now = Date.now();
    const workoutData = { day: day, startTime: now };
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    checkActiveWorkout();
    alert("Trening rozpoczęty! Ogień 🔥");
}

function checkActiveWorkout() {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const titleEl = document.getElementById('current-day-display');
    const timerEl = document.getElementById('workout-timer');
    
    if (activeData) {
        titleEl.style.display = 'none';
        timerEl.classList.remove('hidden');
        
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const diff = Date.now() - activeData.startTime;
            const date = new Date(diff);
            const hh = String(date.getUTCHours()).padStart(2, '0');
            const mm = String(date.getUTCMinutes()).padStart(2, '0');
            const ss = String(date.getUTCSeconds()).padStart(2, '0');
            timerEl.textContent = `${hh}:${mm}:${ss}`;
        }, 1000);

        if(currentMode === 'plan') updateActionButtons(currentSelectedDay);
    } else {
        titleEl.style.display = 'block';
        timerEl.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
        updateHeaderTitle(); // Przywróć tytuł
        if(currentMode === 'plan') updateActionButtons(currentSelectedDay);
    }
}

function updateActionButtons(currentViewDay) {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const container = document.getElementById(`${currentViewDay}-actions`);
    if(!container) return;

    container.innerHTML = '';
    
    // Przyciski tylko w trybie planu
    if(currentMode !== 'plan') return;

    if (activeData && activeData.day === currentViewDay) {
        container.innerHTML = `
            <button class="btn-finish-workout" onclick="finishWorkout('${currentViewDay}')">
                <i class="fa-solid fa-flag-checkered"></i> ZAKOŃCZ TRENING
            </button>`;
    } else if (!activeData) {
        container.innerHTML = `
            <button class="btn-start-workout" onclick="startWorkout('${currentViewDay}')">
                <i class="fa-solid fa-play"></i> START TRENINGU
            </button>`;
    } else if (activeData && activeData.day !== currentViewDay) {
        container.innerHTML = `<p style="text-align:center; color:#666;">Trening trwa w dniu: ${dayMap[activeData.day]}</p>`;
    }
}

async function finishWorkout(day) {
    if(!confirm("Zakończyć trening i zapisać wyniki?")) return;

    const user = firebase.auth().currentUser;
    const duration = document.getElementById('workout-timer').textContent;
    
    const qs = await db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get();
    const batch = db.batch();
    let exercisesDone = [];

    qs.forEach(doc => {
        const data = doc.data();
        if (data.currentLogs && data.currentLogs.length > 0) {
            exercisesDone.push({
                name: data.exercise,
                sets: data.currentLogs
            });
            batch.update(doc.ref, { currentLogs: firebase.firestore.FieldValue.delete() });
        }
    });

    if (exercisesDone.length > 0) {
        const historyRef = db.collection("users").doc(user.uid).collection("history").doc();
        const now = new Date();
        batch.set(historyRef, {
            dateIso: now.toISOString(),
            displayDate: now.toLocaleDateString(),
            dayName: dayMap[day], // Nazwa polska
            dayKey: day,          // Klucz do filtrowania (np. 'monday')
            duration: duration,
            details: exercisesDone
        });
        
        await batch.commit();
        alert("Zapisano w historii! 🎉");
    } else {
        alert("Brak wykonanych serii. Trening zakończony bez zapisu.");
    }

    localStorage.removeItem('activeWorkout');
    checkActiveWorkout();
    loadCardsDataFromFirestore(day);
}

/*************************************************************
  4. ZARZĄDZANIE KARTAMI I LOGGEREM
*************************************************************/
function addLog(day, docId) {
    const weightInp = document.getElementById(`log-w-${docId}`);
    const repsInp = document.getElementById(`log-r-${docId}`);
    const w = weightInp.value;
    const r = repsInp.value;
    if (!w || !r) return;
    
    const user = firebase.auth().currentUser;
    const docRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId);
    
    // Dodajemy unikalne ID (timestamp) by pozwolić na duplikaty wartości
    const newLog = { weight: w, reps: r, id: Date.now() };
    
    docRef.update({
        currentLogs: firebase.firestore.FieldValue.arrayUnion(newLog)
    }).then(() => loadCardsDataFromFirestore(day));
}

function removeLog(day, docId, weight, reps, logId) {
    const user = firebase.auth().currentUser;
    const docRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId);
    
    const logToRemove = { weight: weight, reps: reps, id: Number(logId) };
    
    docRef.update({
        currentLogs: firebase.firestore.FieldValue.arrayRemove(logToRemove)
    }).then(() => loadCardsDataFromFirestore(day));
}

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
    const logs = data.currentLogs || []; 

    const card = document.createElement('div');
    card.className = 'exercise-card';
    
    let logsHtml = logs.map(l => {
        const logId = l.id || 0; 
        return `<div class="log-chip">
            <span>${l.weight}kg x ${l.reps}</span>
            <i class="fa-solid fa-xmark remove-log" onclick="removeLog('${day}', '${id}', '${l.weight}', '${l.reps}', ${logId})"></i>
        </div>`;
    }).join('');

    card.innerHTML = `
        <div class="exercise-card-header" onclick="toggleCard(this)">
            <div class="header-left">
                <i class="fa-solid fa-bars drag-handle"></i>
                <div>
                    <div class="ex-title">${escapeHTML(data.exercise)}</div>
                    <div class="ex-summary">Cel: ${escapeHTML(data.series)}s x ${escapeHTML(data.reps)}r</div>
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
            ${data.notes ? `<div class="notes-box">"${escapeHTML(data.notes)}"</div>` : ''}
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

window.toggleCard = function(header) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.classList.contains('remove-log')) return;
    header.parentElement.classList.toggle('open');
};

/*************************************************************
  5. HISTORIA (FILTROWANA)
*************************************************************/
function loadHistoryFromFirestore(dayFilterKey) {
    const container = document.getElementById("history-list");
    container.innerHTML = '<p style="text-align:center;color:#666">Ładowanie...</p>';
    
    const user = firebase.auth().currentUser;
    // Pobieramy historię (limit 50)
    db.collection("users").doc(user.uid).collection("history").orderBy("dateIso", "desc").limit(50).get()
    .then(qs => {
        container.innerHTML = "";
        let docs = [];
        qs.forEach(d => docs.push({ data: d.data(), id: d.id }));

        // Jeśli mamy filtr (np. 'monday'), filtrujemy wyniki w JS
        if (dayFilterKey) {
            const polishName = dayMap[dayFilterKey];
            docs = docs.filter(doc => {
                // Sprawdź nowe pole dayKey LUB stare dayName
                return doc.data.dayKey === dayFilterKey || doc.data.dayName === polishName || doc.data.day === polishName;
            });
        }

        if (docs.length === 0) {
            const msg = dayFilterKey ? ` w dniu: ${dayMap[dayFilterKey]}` : '';
            container.innerHTML = `<p style="text-align:center; color:#666; margin-top:20px">Brak historii${msg}.</p>`;
            return;
        }

        docs.forEach(item => renderHistoryCard(container, item));
    })
    .catch(err => {
        console.log("Błąd pobierania historii:", err);
        // Fallback bez sortowania w razie błędu indeksu
        db.collection("users").doc(user.uid).collection("history").limit(50).get()
        .then(qs => {
             container.innerHTML = "";
             qs.forEach(d => renderHistoryCard(container, {data:d.data(), id:d.id}));
        });
    });
}

function renderHistoryCard(container, item) {
    const data = item.data;
    const id = item.id;
    
    let detailsHtml = '';
    if (data.details && Array.isArray(data.details)) {
        detailsHtml = data.details.map(ex => {
            let logsStr = '';
            if (Array.isArray(ex.sets)) {
                logsStr = ex.sets.map((s, i) => `<span>S${i+1}: ${s.weight}kg x ${s.reps}</span>`).join(', ');
            } else {
                logsStr = ex.logs || 'Brak danych';
            }
            return `<div class="history-exercise-item">
                <div class="hex-name">${escapeHTML(ex.name)}</div>
                <div class="hex-logs">${logsStr}</div>
            </div>`;
        }).join('');
    } else if (data.exercise) {
        detailsHtml = `<div class="history-exercise-item"><div class="hex-name">${escapeHTML(data.exercise)}</div><div class="hex-logs">Archiwum</div></div>`;
    }

    const dateDisplay = data.displayDate || data.date || '???';
    const dayDisplay = data.dayName || data.day || 'Trening';
    const durDisplay = data.duration ? `<i class="fa-solid fa-stopwatch"></i> ${data.duration}` : '';

    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
        <div class="history-card-header" onclick="toggleHistoryCard(this)">
            <div class="history-info">
                <h4>${dayDisplay}</h4>
                <div class="history-meta">
                    <span><i class="fa-solid fa-calendar"></i> ${dateDisplay}</span>
                    <span>${durDisplay}</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-delete-btn" onclick="deleteHistoryEntry(event, '${id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <i class="fa-solid fa-chevron-down history-toggle-icon"></i>
            </div>
        </div>
        <div class="history-card-details">
            ${detailsHtml || '<p style="color:#666">Brak szczegółów</p>'}
        </div>
    `;
    container.appendChild(card);
}

window.toggleHistoryCard = function(header) {
    if(event.target.closest('.history-delete-btn')) return;
    header.parentElement.classList.toggle('open');
}

window.deleteHistoryEntry = function(e, docId) {
    e.stopPropagation();
    if(!confirm("Usunąć ten wpis z historii?")) return;
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("history").doc(docId).delete()
    .then(() => {
        const card = e.target.closest('.history-card');
        if(card) card.remove();
    });
}

/*************************************************************
  POZOSTAŁE FUNKCJE (MODAL, AUTH...)
*************************************************************/
function openAddModal(day = null) {
    if(!day) day = currentSelectedDay;
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

function saveMuscleGroups() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  allDays.forEach(day => {
    const inp = document.getElementById(`${day}-muscle-group`);
    if (inp) db.collection("users").doc(user.uid).collection("days").doc(day).set({ muscleGroup: inp.value.trim() }, { merge: true });
  });
}

function loadMuscleGroupFromFirestore(day) {
  const inp = document.getElementById(`${day}-muscle-group`);
  const user = firebase.auth().currentUser;
  if (!user || !inp) return;
  db.collection("users").doc(user.uid).collection("days").doc(day).get()
    .then(doc => { if (doc.exists) inp.value = doc.data().muscleGroup || ""; });
}

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
