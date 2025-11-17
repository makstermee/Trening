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
      checkActiveWorkout();
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
  else updateActionButtons(selected);
}

/*************************************************************
  2. LOGIKA TRENINGU (ZAPIS)
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

        updateActionButtons(activeData.day);
    } else {
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
        container.innerHTML = `
            <button class="btn-finish-workout" onclick="finishWorkout('${currentViewDay}')">
                <i class="fa-solid fa-flag-checkered"></i> ZAKOŃCZ TRENING
            </button>`;
    } else if (!activeData && currentViewDay !== 'history') {
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
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const duration = document.getElementById('workout-timer').textContent;
    
    // Pobierz ćwiczenia i zbuduj listę wykonanych
    const qs = await db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get();
    const batch = db.batch();
    let exercisesDone = [];

    qs.forEach(doc => {
        const data = doc.data();
        // Jeśli są logi (currentLogs) to bierzemy je
        if (data.currentLogs && data.currentLogs.length > 0) {
            exercisesDone.push({
                name: data.exercise,
                sets: data.currentLogs // Zapisujemy jako tablicę obiektów, nie string!
            });
            // Czyścimy logi w planie
            batch.update(doc.ref, { currentLogs: firebase.firestore.FieldValue.delete() });
        }
    });

    // Zapisz do historii TYLKO JEŚLI coś zrobiono
    if (exercisesDone.length > 0) {
        const historyRef = db.collection("users").doc(user.uid).collection("history").doc();
        // Tworzymy Timestamp dla sortowania
        const now = new Date();
        batch.set(historyRef, {
            dateIso: now.toISOString(), // Do sortowania
            displayDate: now.toLocaleDateString(), // Do wyświetlania
            dayName: dayMap[day],
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
  3. SEKCJA HISTORII (NOWA - KARTY)
*************************************************************/
function loadHistoryFromFirestore() {
    const container = document.getElementById("history-list");
    container.innerHTML = '<p style="text-align:center;color:#666">Ładowanie...</p>';
    
    const user = firebase.auth().currentUser;
    // Sortujemy po dacie ISO (nowe na górze)
    db.collection("users").doc(user.uid).collection("history").orderBy("dateIso", "desc").limit(50).get()
    .then(qs => {
        container.innerHTML = "";
        if (qs.empty) {
            container.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px">Brak historii treningów.</p>';
            return;
        }
        qs.forEach(doc => {
            renderHistoryCard(container, doc);
        });
    })
    .catch(err => {
        console.log("Błąd sortowania (może brakować indeksu), pobieram bez sortowania:", err);
        // Fallback bez sortowania
        db.collection("users").doc(user.uid).collection("history").limit(50).get()
        .then(qs => {
             container.innerHTML = "";
             qs.forEach(doc => renderHistoryCard(container, doc));
        });
    });
}

function renderHistoryCard(container, doc) {
    const data = doc.data();
    const id = doc.id;
    
    // Obsługa starych danych (legacy support)
    let detailsHtml = '';
    if (data.details && Array.isArray(data.details)) {
        // Nowy format (tablica obiektów)
        detailsHtml = data.details.map(ex => {
            let logsStr = '';
            if (Array.isArray(ex.sets)) {
                logsStr = ex.sets.map((s, i) => `<span>S${i+1}: ${s.weight}kg x ${s.reps}</span>`).join(', ');
            } else {
                logsStr = ex.logs || 'Brak danych'; // Fallback dla stringów
            }
            return `<div class="history-exercise-item">
                <div class="hex-name">${escapeHTML(ex.name)}</div>
                <div class="hex-logs">${logsStr}</div>
            </div>`;
        }).join('');
    } else if (data.exercise) {
        // Stary format (pojedyncze ćwiczenie na wpis)
        detailsHtml = `<div class="history-exercise-item">
            <div class="hex-name">${escapeHTML(data.exercise)}</div>
            <div class="hex-logs">${data.series}s x ${data.reps}r ${data.weight ? '@ '+data.weight : ''}</div>
        </div>`;
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
    // Jeśli kliknięto w kosz, nie otwieraj
    if(event.target.closest('.history-delete-btn')) return;
    header.parentElement.classList.toggle('open');
}

window.deleteHistoryEntry = function(e, docId) {
    e.stopPropagation(); // Zatrzymaj otwieranie karty
    if(!confirm("Usunąć ten wpis z historii?")) return;
    
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("history").doc(docId).delete()
    .then(() => {
        // Usuń element z DOM bez przeładowania
        const card = e.target.closest('.history-card');
        if(card) card.remove();
    });
}


/*************************************************************
  4. LOGGER I CRUD (Bez zmian logiki, tylko helpery)
*************************************************************/
function addLog(day, docId) {
    const weightInp = document.getElementById(`log-w-${docId}`);
    const repsInp = document.getElementById(`log-r-${docId}`);
    const w = weightInp.value;
    const r = repsInp.value;
    if (!w || !r) return;
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
    .update({ currentLogs: firebase.firestore.FieldValue.arrayUnion({ weight: w, reps: r }) })
    .then(() => loadCardsDataFromFirestore(day));
}

function removeLog(day, docId, weight, reps) {
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
    .update({ currentLogs: firebase.firestore.FieldValue.arrayRemove({ weight: weight, reps: reps }) })
    .then(() => loadCardsDataFromFirestore(day));
}

// ... (Tutaj wklej resztę funkcji: addCard, updateCard, deleteCard, Modale, Auth z poprzedniego pliku - one się nie zmieniają) ...
// PAMIĘTAJ ABY WKLEIĆ loadCardsDataFromFirestore i renderAccordionCard z poprzedniej odpowiedzi! 

// Dla pewności, oto skrócone wersje tych kluczowych funkcji, które muszą tu być:
function loadCardsDataFromFirestore(day) {
    const container = document.getElementById(`${day}-cards`);
    if(!container) return;
    container.innerHTML = "";
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").orderBy("order", "asc").get()
    .then(qs => { qs.forEach(doc => renderAccordionCard(container, day, doc)); });
}

function renderAccordionCard(container, day, doc) {
    const data = doc.data();
    const id = doc.id;
    const logs = data.currentLogs || []; 
    let logsHtml = logs.map(l => `<div class="log-chip"><span>${l.weight}kg x ${l.reps}</span><i class="fa-solid fa-xmark remove-log" onclick="removeLog('${day}', '${id}', '${l.weight}', '${l.reps}')"></i></div>`).join('');

    const card = document.createElement('div');
    card.className = 'exercise-card';
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
                    <input type="number" id="log-w-${id}" placeholder="Kg" value="${data.weight||''}">
                    <input type="number" id="log-r-${id}" placeholder="Powt" value="${data.reps||''}">
                    <button class="btn-add-log" onclick="addLog('${day}', '${id}')"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="logs-list">${logsHtml}</div>
            </div>
            <div class="card-actions">
                <button class="btn-icon btn-edit" onclick="triggerEdit('${day}', '${id}')"><i class="fa-solid fa-pen"></i> Edytuj</button>
                <button class="btn-icon btn-delete" onclick="deleteCard('${day}', '${id}')"><i class="fa-solid fa-trash"></i> Usuń</button>
            </div>
        </div>`;
    container.appendChild(card);
}

window.toggleCard = function(header) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.classList.contains('remove-log')) return;
    header.parentElement.classList.toggle('open');
};

// ... (Reszta funkcji Auth, Modal, Helpery bez zmian) ...
function openAddModal(day=null){ if(!day) day=document.getElementById('day-selector').value; currentModalDay=day; document.getElementById('modal-exercise').value=""; document.getElementById('modal-series').value=""; document.getElementById('modal-reps').value=""; document.getElementById('modal-weight').value=""; document.getElementById('modal-notes').value=""; document.getElementById('modal-title').innerText="Dodaj ćwiczenie"; document.getElementById('modal-save-btn').innerText="DODAJ"; editInfo={day:null,docId:null}; const o=document.getElementById('modal-overlay'); o.classList.remove('hidden'); setTimeout(()=>o.classList.add('active'),10); }
function closeAddModal(){ const o=document.getElementById('modal-overlay'); o.classList.remove('active'); setTimeout(()=>o.classList.add('hidden'),300); }
function saveFromModal(){ const day=currentModalDay, ex=document.getElementById('modal-exercise').value.trim(), s=document.getElementById('modal-series').value, r=document.getElementById('modal-reps').value, w=document.getElementById('modal-weight').value, n=document.getElementById('modal-notes').value; if(!ex) return alert("Nazwa!"); const d={exercise:ex,series:s,reps:r,weight:w,notes:n}; if(editInfo.docId) updateCardInFirestore(day,editInfo.docId,d); else addCardToFirestore(day,d); closeAddModal(); }
function addCardToFirestore(day,d){ const u=firebase.auth().currentUser; d.order=Date.now(); db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").add(d).then(()=>loadCardsDataFromFirestore(day)); }
function updateCardInFirestore(day,id,d){ const u=firebase.auth().currentUser; db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").doc(id).update(d).then(()=>loadCardsDataFromFirestore(day)); }
function deleteCard(day,id){ if(!confirm("Usunąć?")) return; const u=firebase.auth().currentUser; db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").doc(id).delete().then(()=>loadCardsDataFromFirestore(day)); }
window.triggerEdit=function(day,id){ const u=firebase.auth().currentUser; db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").doc(id).get().then(doc=>{ if(doc.exists){ const d=doc.data(); document.getElementById('modal-exercise').value=d.exercise; document.getElementById('modal-series').value=d.series; document.getElementById('modal-reps').value=d.reps; document.getElementById('modal-weight').value=d.weight; document.getElementById('modal-notes').value=d.notes; document.getElementById('modal-title').innerText="Edytuj"; document.getElementById('modal-save-btn').innerText="ZAPISZ"; editInfo={day:day,docId:id}; currentModalDay=day; const o=document.getElementById('modal-overlay'); o.classList.remove('hidden'); setTimeout(()=>o.classList.add('active'),10); }}); }
function resetCards(day){ if(!confirm("Reset?")) return; const u=firebase.auth().currentUser; db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").get().then(qs=>{ const b=db.batch(); qs.forEach(doc=>b.delete(doc.ref)); return b.commit(); }).then(()=>loadCardsDataFromFirestore(day)); }
function saveMuscleGroups(){ const u=firebase.auth().currentUser; allDays.forEach(day=>{ const i=document.getElementById(`${day}-muscle-group`); if(i) db.collection("users").doc(u.uid).collection("days").doc(day).set({muscleGroup:i.value.trim()},{merge:true}); }); }
function loadMuscleGroupFromFirestore(day){ const u=firebase.auth().currentUser, i=document.getElementById(`${day}-muscle-group`); if(u&&i) db.collection("users").doc(u.uid).collection("days").doc(day).get().then(doc=>{ if(doc.exists) i.value=doc.data().muscleGroup||""; }); }
async function signIn(){ const e=document.getElementById('login-email').value, p=document.getElementById('login-password').value; try{ await firebase.auth().signInWithEmailAndPassword(e,p); }catch(err){ document.getElementById('login-error').innerText=err.message; } }
async function signUp(){ const e=document.getElementById('register-email').value, p=document.getElementById('register-password').value; try{ await firebase.auth().createUserWithEmailAndPassword(e,p); switchAuthTab('login'); alert("Sukces!"); }catch(err){ document.getElementById('register-error').innerText=err.message; } }
async function signOut(){ await firebase.auth().signOut(); location.reload(); }
function escapeHTML(str){ if(!str) return ""; return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
