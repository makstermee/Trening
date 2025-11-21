/*************************************************************
  ZMIENNE GLOBALNE
*************************************************************/
const dayMap = { monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa", thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela" };
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

let editInfo = { day: null, docId: null };
let currentModalDay = null;
let timerInterval = null;

let currentMode = 'plan'; 
let currentSelectedDay = 'monday'; 
let viewingUserId = null; 

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
      
      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });
      
      currentMode = 'plan';
      selectDay('monday'); 
      checkActiveWorkout();
      updateProfileUI(user);
      loadProfileStats();
    } else {
      document.querySelector('.container').style.display = 'none';
      document.getElementById('login-section').style.display = 'flex';
    }
  });
});

/*************************************************************
  2. NAWIGACJA I TRYBY
*************************************************************/
function switchMode(mode) {
    currentMode = mode;
    const historySection = document.getElementById('history');
    const communitySection = document.getElementById('community');
    const profileSection = document.getElementById('profile');
    const daysNav = document.getElementById('days-nav-container');
    const fab = document.getElementById('fab-add');

    document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
    
    if (mode === 'history') {
        historySection.classList.remove('hidden');
        daysNav.style.display = 'block'; 
        fab.style.display = 'none';
        loadHistoryFromFirestore(currentSelectedDay);
    } else if (mode === 'community') {
        communitySection.classList.remove('hidden');
        daysNav.style.display = 'none'; 
        fab.style.display = 'none';
        loadCommunity();
    } else if (mode === 'profile') {
        profileSection.classList.remove('hidden');
        daysNav.style.display = 'none'; 
        fab.style.display = 'none';
        loadProfileStats(); 
    } else {
        // PLAN
        daysNav.style.display = 'block';
        fab.style.display = 'flex';
        showPlanSection(currentSelectedDay);
    }
    updateHeaderTitle();
}

function selectDay(dayValue) {
    currentSelectedDay = dayValue;
    document.getElementById('day-selector').value = dayValue; 

    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    const pills = document.querySelectorAll('.pill');
    const idx = allDays.indexOf(dayValue);
    if (idx !== -1 && pills[idx]) pills[idx].classList.add('active');

    if (currentMode === 'plan') {
        showPlanSection(dayValue);
    } else if (currentMode === 'history') {
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
    const shareBtn = document.getElementById('btn-share-day'); 
    
    if (document.getElementById('workout-timer').classList.contains('hidden')) {
        if(shareBtn) shareBtn.classList.add('hidden');

        if (currentMode === 'plan') {
            titleEl.textContent = `Plan: ${polishName}`;
            if(shareBtn) shareBtn.classList.remove('hidden'); 
        }
        else if (currentMode === 'history') titleEl.textContent = `Historia: ${polishName}`;
        else if (currentMode === 'community') titleEl.textContent = `Społeczność`;
        else if (currentMode === 'profile') titleEl.textContent = `Twój Profil`;
    }
}

function showSection() {} 

/*************************************************************
  3. TRENING
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
    const shareBtn = document.getElementById('btn-share-day');
    
    if (activeData) {
        titleEl.style.display = 'none';
        if(shareBtn) shareBtn.style.display = 'none'; 
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
        if(shareBtn) shareBtn.style.display = ''; 
        timerEl.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
        updateHeaderTitle(); 
        if(currentMode === 'plan') updateActionButtons(currentSelectedDay);
    }
}

function updateActionButtons(currentViewDay) {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const container = document.getElementById(`${currentViewDay}-actions`);
    if(!container) return;

    container.innerHTML = '';
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
            exercisesDone.push({ name: data.exercise, sets: data.currentLogs });
            batch.update(doc.ref, { currentLogs: firebase.firestore.FieldValue.delete() });
        }
    });

    if (exercisesDone.length > 0) {
        const historyRef = db.collection("users").doc(user.uid).collection("history").doc();
        const now = new Date();
        batch.set(historyRef, {
            dateIso: now.toISOString(),
            displayDate: now.toLocaleDateString(),
            dayName: dayMap[day], 
            dayKey: day,          
            duration: duration,
            details: exercisesDone
        });
        
        await batch.commit();
        alert("Zapisano w historii! 🎉");
        
        loadProfileStats(); 
    } else {
        alert("Brak wykonanych serii. Trening zakończony bez zapisu.");
    }

    localStorage.removeItem('activeWorkout');
    checkActiveWorkout();
    loadCardsDataFromFirestore(day);
}

/*************************************************************
  4. LOGGER I KARTY
*************************************************************/
function addLog(day, docId) {
    const weightInp = document.getElementById(`log-w-${docId}`);
    const repsInp = document.getElementById(`log-r-${docId}`);
    const w = weightInp.value;
    const r = repsInp.value;
    if (!w || !r) return;
    
    const user = firebase.auth().currentUser;
    const docRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId);
    const newLog = { weight: w, reps: r, id: Date.now() };
    
    docRef.update({ currentLogs: firebase.firestore.FieldValue.arrayUnion(newLog) })
    .then(() => loadCardsDataFromFirestore(day));
}

function removeLog(day, docId, weight, reps, logId) {
    const user = firebase.auth().currentUser;
    const docRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId);
    const logToRemove = { weight: weight, reps: reps, id: Number(logId) };
    
    docRef.update({ currentLogs: firebase.firestore.FieldValue.arrayRemove(logToRemove) })
    .then(() => loadCardsDataFromFirestore(day));
}

function loadCardsDataFromFirestore(day) {
    const container = document.getElementById(`${day}-cards`);
    if(!container) return;
    
    const user = firebase.auth().currentUser;
    if(!user) return;

    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises")
    .orderBy("order", "asc").get()
    .then(qs => {
        container.innerHTML = ""; 
        
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
        return `<div class="log-chip"><span>${l.weight}kg x ${l.reps}</span><i class="fa-solid fa-xmark remove-log" onclick="removeLog('${day}', '${id}', '${l.weight}', '${l.reps}', ${logId})"></i></div>`;
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
  5. HISTORIA
*************************************************************/
function loadHistoryFromFirestore(dayFilterKey) {
    const container = document.getElementById("history-list");
    container.innerHTML = '<p style="text-align:center;color:#666">Ładowanie...</p>';
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("history").orderBy("dateIso", "desc").limit(50).get()
    .then(qs => {
        container.innerHTML = "";
        let docs = [];
        qs.forEach(d => docs.push({ data: d.data(), id: d.id }));
        if (dayFilterKey) {
            const polishName = dayMap[dayFilterKey];
            docs = docs.filter(doc => doc.data.dayKey === dayFilterKey || doc.data.dayName === polishName || doc.data.day === polishName);
        }
        if (docs.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#666; margin-top:20px">Brak historii.</p>`;
            return;
        }
        docs.forEach(item => renderHistoryCard(container, item));
    })
    .catch(err => {
        db.collection("users").doc(user.uid).collection("history").limit(50).get()
        .then(qs => { container.innerHTML=""; qs.forEach(d=>renderHistoryCard(container,{data:d.data(),id:d.id})); });
    });
}

function renderHistoryCard(container, item) {
    const data = item.data;
    const id = item.id;
    let detailsHtml = '';
    if (data.details && Array.isArray(data.details)) {
        detailsHtml = data.details.map(ex => {
            let logsStr = (Array.isArray(ex.sets)) ? ex.sets.map((s, i) => `<span>S${i+1}: ${s.weight}kg x ${s.reps}</span>`).join(', ') : (ex.logs || 'Brak');
            return `<div class="history-exercise-item"><div class="hex-name">${escapeHTML(ex.name)}</div><div class="hex-logs">${logsStr}</div></div>`;
        }).join('');
    } else if (data.exercise) {
        detailsHtml = `<div class="history-exercise-item"><div class="hex-name">${escapeHTML(data.exercise)}</div><div class="hex-logs">Archiwum</div></div>`;
    }
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
        <div class="history-card-header" onclick="toggleHistoryCard(this)">
            <div class="history-info"><h4>${data.dayName||'Trening'}</h4><div class="history-meta"><span>${data.displayDate||data.date}</span><span>${data.duration ? `<i class="fa-solid fa-stopwatch"></i> ${data.duration}` : ''}</span></div></div>
            <div class="history-actions"><button class="history-delete-btn" onclick="deleteHistoryEntry(event, '${id}')"><i class="fa-solid fa-trash"></i></button><i class="fa-solid fa-chevron-down history-toggle-icon"></i></div>
        </div>
        <div class="history-card-details">${detailsHtml || '<p style="color:#666">Brak szczegółów</p>'}</div>
    `;
    container.appendChild(card);
}
window.toggleHistoryCard = function(header) {
    if(event.target.closest('.history-delete-btn')) return;
    header.parentElement.classList.toggle('open');
}
window.deleteHistoryEntry = function(e, docId) {
    e.stopPropagation();
    if(!confirm("Usunąć ten wpis?")) return;
    const user = firebase.auth().currentUser;
    db.collection("users").doc(user.uid).collection("history").doc(docId).delete()
    .then(() => {
        e.target.closest('.history-card').remove();
        loadProfileStats(); 
    });
}

/*************************************************************
  6. PROFIL I SPOŁECZNOŚĆ
*************************************************************/
function updateProfileUI(user) {
    document.getElementById('profile-email').textContent = user.displayName || user.email;
    const initial = (user.email ? user.email[0] : 'U').toUpperCase();
    document.getElementById('profile-avatar').textContent = initial;
}

function loadProfileStats() {
    const user = firebase.auth().currentUser;
    
    db.collection("users").doc(user.uid).collection("history").get().then(qs => {
        const total = qs.size;
        let last = '-';
        if(!qs.empty) last = qs.docs[0].data().displayDate || qs.docs[0].data().date;

        document.getElementById('total-workouts').textContent = total;
        document.getElementById('last-workout-date').textContent = last;

        db.collection("publicUsers").doc(user.uid).get().then(doc => {
            let kudos = 0;
            if(doc.exists) kudos = doc.data().likes || 0;
            document.getElementById('profile-kudos').textContent = kudos;
            
            publishProfileStats(user, total, last, kudos);
        });
    });
}

function publishProfileStats(user, total, last, existingKudos) {
    const publicRef = db.collection("publicUsers").doc(user.uid);
    publicRef.set({
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        totalWorkouts: total,
        lastWorkout: last,
        likes: existingKudos || 0,
        uid: user.uid
    }, { merge: true });
}

window.changePassword = function() {
    const newPass = document.getElementById('new-password').value;
    if(!newPass || newPass.length < 6) return alert("Hasło musi mieć min. 6 znaków");
    firebase.auth().currentUser.updatePassword(newPass).then(() => { alert("Zmieniono!"); document.getElementById('new-password').value=""; }).catch(err => alert("Błąd: "+err.message));
}
window.updateUsername = function() {
    const newName = document.getElementById('new-username').value;
    if(!newName) return;
    const user = firebase.auth().currentUser;
    user.updateProfile({ displayName: newName }).then(() => {
        alert("Zmieniono!");
        updateProfileUI(user);
        loadProfileStats(); 
    }).catch(err => alert("Błąd: "+err.message));
}
window.exportData = async function() {
    const user = firebase.auth().currentUser;
    const qs = await db.collection("users").doc(user.uid).collection("history").get();
    let data = []; qs.forEach(doc => data.push(doc.data()));
    const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gympro_backup.json`; a.click();
}
window.hardResetProfile = async function() {
    if (!confirm("⚠️ Czy na pewno chcesz usunąć CAŁE konto?")) return;
    if (!confirm("Potwierdź ostatecznie: USUŃ WSZYSTKIE DANE.")) return;
    const user = firebase.auth().currentUser;
    try {
        const promises = [];
        const hSnap = await db.collection("users").doc(user.uid).collection("history").get();
        hSnap.forEach(doc => promises.push(doc.ref.delete()));
        for (const day of allDays) {
            const eSnap = await db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get();
            eSnap.forEach(doc => promises.push(doc.ref.delete()));
            promises.push(db.collection("users").doc(user.uid).collection("days").doc(day).delete());
        }
        promises.push(db.collection("publicUsers").doc(user.uid).delete());
        await Promise.all(promises);
        alert("Wyczyszczono."); location.reload();
    } catch (e) { alert("Błąd: " + e.message); }
}

function loadCommunity() {
    const container = document.getElementById("community-list");
    container.innerHTML = '<p style="text-align:center;color:#666">Ładowanie...</p>';
    
    db.collection("publicUsers").orderBy("totalWorkouts", "desc").limit(20).get()
    .then(qs => {
        container.innerHTML = "";
        if(qs.empty) { container.innerHTML = '<p style="text-align:center;color:#666">Nikogo tu nie ma :(</p>'; return; }
        
        qs.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="user-card-avatar">${d.displayName ? d.displayName[0].toUpperCase() : '?'}</div>
                <div class="user-card-name">${escapeHTML(d.displayName)}</div>
                <div class="user-card-stats">
                    <div><i class="fa-solid fa-dumbbell"></i> ${d.totalWorkouts || 0}</div>
                    <div style="margin-top:3px; color:#ffd700;"><i class="fa-solid fa-hand-spock"></i> ${d.likes || 0}</div>
                </div>
            `;
            card.onclick = () => openPublicProfile(d);
            container.appendChild(card);
        });
    });
}

function openPublicProfile(userData) {
    viewingUserId = userData.uid;
    document.getElementById('pub-avatar').textContent = userData.displayName ? userData.displayName[0].toUpperCase() : '?';
    document.getElementById('pub-name').textContent = userData.displayName;
    document.getElementById('pub-total').textContent = userData.totalWorkouts;
    document.getElementById('pub-last').textContent = userData.lastWorkout || '-';
    document.getElementById('pub-kudos-count').textContent = userData.likes || 0;
    
    loadSharedPlansForUser(userData.uid); 

    const overlay = document.getElementById('public-profile-overlay');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closePublicProfile() {
    viewingUserId = null;
    const overlay = document.getElementById('public-profile-overlay');
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

function giveKudos() {
    if(!viewingUserId) return;
    const currentUser = firebase.auth().currentUser;
    if(viewingUserId === currentUser.uid) { alert("Nie możesz dać lajka sam sobie! 😉"); return; }
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; 
    
    const interactionRef = db.collection("users").doc(currentUser.uid).collection("givenKudos").doc(viewingUserId);

    interactionRef.get().then(docSnap => {
        if (docSnap.exists && docSnap.data().date === todayStr) {
            alert("Już przybiłeś dzisiaj piątkę temu użytkownikowi! Wróć jutro. 👋");
            return;
        }

        const batch = db.batch();
        const publicRef = db.collection("publicUsers").doc(viewingUserId);
        
        batch.update(publicRef, { likes: firebase.firestore.FieldValue.increment(1) });
        batch.set(interactionRef, { date: todayStr });

        batch.commit().then(() => {
            const countEl = document.getElementById('pub-kudos-count');
            if(countEl) {
                let currentVal = parseInt(countEl.textContent) || 0;
                countEl.textContent = currentVal + 1;
            }
            const btn = document.getElementById('btn-give-kudos');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> DZIĘKI!';
            btn.style.background = 'var(--accent-color)'; 
            btn.style.color = '#000';
            setTimeout(() => { 
                btn.innerHTML = '<i class="fa-solid fa-hand-spock"></i> PRZYBIJ PIĄTKĘ!';
                btn.style.background = ''; 
                btn.style.color = ''; 
            }, 2000);
        }).catch(err => { console.error(err); alert("Błąd zapisu."); });
    });
}

/*************************************************************
  7. SOCIAL: UDOSTĘPNIANIE, SORTOWANIE, USUWANIE
*************************************************************/
async function shareCurrentDay() {
    if (currentMode !== 'plan') return;
    const day = currentSelectedDay;
    const polishName = dayMap[day];

    if (!confirm(`Czy chcesz udostępnić publicznie swój plan na: ${polishName}?`)) return;

    const user = firebase.auth().currentUser;
    
    const snapshot = await db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").orderBy("order").get();
    
    if (snapshot.empty) {
        alert("Ten dzień jest pusty! Dodaj ćwiczenia zanim udostępnisz.");
        return;
    }

    let cleanExercises = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        cleanExercises.push({
            exercise: d.exercise,
            series: d.series,
            reps: d.reps,
            weight: d.weight || null, 
            muscleGroup: document.getElementById(`${day}-muscle-group`).value || "Ogólny"
        });
    });

    await db.collection("publicUsers").doc(user.uid).collection("sharedPlans").doc(day).set({
        dayKey: day,
        dayName: polishName,
        exercises: cleanExercises,
        updatedAt: new Date().toISOString()
    });

    alert(`Plan na ${polishName} został zaktualizowany w Twoim profilu!`);
    
    if(viewingUserId === user.uid) {
        loadSharedPlansForUser(user.uid);
    }
}

function loadSharedPlansForUser(targetUid) {
    const container = document.getElementById('public-plans-list');
    container.innerHTML = '<p style="text-align:center;color:#666">Sprawdzam plany...</p>';
    const currentUser = firebase.auth().currentUser;
    const isMyProfile = (currentUser && currentUser.uid === targetUid); 

    db.collection("publicUsers").doc(targetUid).collection("sharedPlans").get()
    .then(qs => {
        container.innerHTML = "";
        if (qs.empty) {
            container.innerHTML = '<p style="text-align:center; font-size:0.8rem; color:#666;">Brak udostępnionych planów.</p>';
            return;
        }

        let plans = [];
        qs.forEach(doc => plans.push(doc.data()));
        
        plans.sort((a, b) => {
            return allDays.indexOf(a.dayKey) - allDays.indexOf(b.dayKey);
        });

        plans.forEach(data => {
            const planItem = document.createElement('div');
            planItem.className = 'shared-plan-item';
            planItem.style.cssText = 'background:#242426; margin-bottom:8px; border-radius:8px; padding:10px; font-size:0.9rem; position:relative;';
            
            const exercisesList = data.exercises.map(e => {
                const weightText = e.weight ? ` • ${e.weight}kg` : '';
                return `<div style="color:#ccc; margin-top:4px; padding-left:10px; border-left:2px solid var(--primary-color);">
                    <strong>${escapeHTML(e.exercise)}</strong> <span style="color:#666; font-size:0.8em;">(${e.series}s x ${e.reps}r${weightText})</span>
                 </div>`;
            }).join('');

            let deleteBtnHtml = '';
            if (isMyProfile) {
                deleteBtnHtml = `
                <button onclick="deleteSharedPlan('${data.dayKey}')" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#ff453a; cursor:pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>`;
            }

            planItem.innerHTML = `
                <div style="font-weight:bold; color:white; margin-bottom:5px; padding-right:30px;">
                    ${data.dayName} <span style="color:var(--accent-color); font-size:0.8em; font-weight:normal;">(${data.exercises.length} ćw.)</span>
                </div>
                ${deleteBtnHtml}
                <div>${exercisesList}</div>
            `;
            container.appendChild(planItem);
        });
    });
}

function deleteSharedPlan(dayKey) {
    if(!confirm("Czy na pewno chcesz przestać udostępniać ten dzień? Zniknie on z Twojego profilu publicznego.")) return;
    
    const user = firebase.auth().currentUser;
    
    db.collection("publicUsers").doc(user.uid).collection("sharedPlans").doc(dayKey).delete()
    .then(() => {
        alert("Usunięto z publicznych!");
        loadSharedPlansForUser(user.uid);
    })
    .catch(err => {
        alert("Błąd: " + err.message);
    });
}

/*************************************************************
  POZOSTAŁE FUNKCJE (MODAL, AUTH...)
*************************************************************/
function openAddModal(day=null){ if(!day) day=currentSelectedDay; currentModalDay=day; document.getElementById('modal-exercise').value=""; document.getElementById('modal-series').value=""; document.getElementById('modal-reps').value=""; document.getElementById('modal-weight').value=""; document.getElementById('modal-notes').value=""; document.getElementById('modal-title').innerText="Dodaj ćwiczenie"; document.getElementById('modal-save-btn').innerText="DODAJ"; editInfo={day:null,docId:null}; const o=document.getElementById('modal-overlay'); o.classList.remove('hidden'); setTimeout(()=>o.classList.add('active'),10); }
function closeAddModal(){ const o=document.getElementById('modal-overlay'); o.classList.remove('active'); setTimeout(()=>o.classList.add('hidden'),300); }
function saveFromModal(){ const day=currentModalDay, ex=document.getElementById('modal-exercise').value.trim(), s=document.getElementById('modal-series').value, r=document.getElementById('modal-reps').value, w=document.getElementById('modal-weight').value, n=document.getElementById('modal-notes').value; if(!ex) return alert("Nazwa!"); const d={exercise:ex,series:s,reps:r,weight:w,notes:n}; if(editInfo.docId) updateCardInFirestore(day,editInfo.docId,d); else addCardToFirestore(day,d); closeAddModal(); }
function addCardToFirestore(day,d){ const u=firebase.auth().currentUser; d.order=Date.now(); db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").add(d).then(()=>loadCardsDataFromFirestore(day)); }
function updateCardInFirestore(day,id,d){ const u=firebase.auth().currentUser; db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").doc(id).update(d).then(()=>loadCardsDataFromFirestore(day)); }
function deleteCard(day,id){ if(!confirm("Usunąć?")) return; const u=firebase.auth().currentUser; db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").doc(id).delete().then(()=>loadCardsDataFromFirestore(day)); }
window.triggerEdit=function(day,id){ const u=firebase.auth().currentUser; db.collection("users").doc(u.uid).collection("days").doc(day).collection("exercises").doc(id).get().then(doc=>{ if(doc.exists){ const d=doc.data(); document.getElementById('modal-exercise').value=d.exercise; document.getElementById('modal-series').value=d.series; document.getElementById('modal-reps').value=d.reps; document.getElementById('modal-weight').value=d.weight; document.getElementById('modal-notes').value=d.notes; document.getElementById('modal-title').innerText="Edytuj"; document.getElementById('modal-save-btn').innerText="ZAPISZ"; editInfo={day:day,docId:id}; currentModalDay=day; const o=document.getElementById('modal-overlay'); o.classList.remove('hidden'); setTimeout(()=>o.classList.add('active'),10); }}); }
function saveMuscleGroups(){ const u=firebase.auth().currentUser; allDays.forEach(day=>{ const i=document.getElementById(`${day}-muscle-group`); if(i) db.collection("users").doc(u.uid).collection("days").doc(day).set({muscleGroup:i.value.trim()},{merge:true}); }); }
function loadMuscleGroupFromFirestore(day){ const u=firebase.auth().currentUser, i=document.getElementById(`${day}-muscle-group`); if(u&&i) db.collection("users").doc(u.uid).collection("days").doc(day).get().then(doc=>{ if(doc.exists) i.value=doc.data().muscleGroup||""; }); }
async function signIn(){ const e=document.getElementById('login-email').value, p=document.getElementById('login-password').value; try{ await firebase.auth().signInWithEmailAndPassword(e,p); }catch(err){ document.getElementById('login-error').innerText=err.message; } }
async function signUp(){ const e=document.getElementById('register-email').value, p=document.getElementById('register-password').value; try{ await firebase.auth().createUserWithEmailAndPassword(e,p); switchAuthTab('login'); alert("Sukces!"); }catch(err){ document.getElementById('register-error').innerText=err.message; } }
async function signOut(){ await firebase.auth().signOut(); location.reload(); }
function escapeHTML(str){ if(!str) return ""; return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/*************************************************************
  8. PWA & FORCE UPDATE
*************************************************************/
let deferredPrompt;
const installBanner = document.getElementById('install-banner');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); 
  deferredPrompt = e; 
  installBanner.classList.remove('hidden'); 
});

window.installApp = function() {
  if (deferredPrompt) {
    deferredPrompt.prompt(); 
    deferredPrompt.userChoice.then((choiceResult) => {
      deferredPrompt = null;
      installBanner.classList.add('hidden');
    });
  } else {
    installBanner.classList.add('hidden');
    alert("Instalacja jest już możliwa z menu przeglądarki lub aplikacja jest zainstalowana.");
  }
};

window.addEventListener('appinstalled', (e) => {
  installBanner.classList.add('hidden');
});

if (!('beforeinstallprompt' in window) && (navigator.userAgent.match(/iPhone|iPad|iPod/i))) {
    installBanner.querySelector('p').textContent = "Zainstaluj przez Udostępnij > Do ekranu początk.";
}

// --- NOWE: FUNKCJA WYMUSZAJĄCA AKTUALIZACJĘ ---
async function forceAppUpdate(btnElement) {
    if (!navigator.onLine) {
        alert("Jesteś offline! Podłącz internet, aby zaktualizować.");
        return;
    }

    if (!confirm("To wymusi pobranie najnowszej wersji aplikacji z serwera. Strona zostanie przeładowana. Kontynuować?")) return;

    if(btnElement) {
        btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aktualizuję...';
        btnElement.disabled = true;
    }

    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
        setTimeout(() => {
            alert("Gotowe! Aplikacja jest aktualna. Witaj w nowej wersji! 🚀");
            window.location.reload(true); 
        }, 1000);
    } catch (error) {
        console.error("Błąd aktualizacji:", error);
        alert("Coś poszło nie tak. Spróbuj odświeżyć ręcznie.");
        if(btnElement) {
            btnElement.innerHTML = '<i class="fa-solid fa-rotate"></i> SPRAWDŹ I ZAKTUALIZUJ';
            btnElement.disabled = false;
        }
    }
}
