/*************************************************************
  ZMIENNE GLOBALNE I KONFIGURACJA
*************************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyDNt_K6lkFKHZeFXyBMLOpePge967aAEh8",
  authDomain: "plan-treningowy-a9d00.firebaseapp.com",
  projectId: "plan-treningowy-a9d00",
  storageBucket: "plan-treningowy-a9d00.firebasestorage.app",
  messagingSenderId: "1087845341451",
  appId: "1:1087845341451:web:08201e588c56d73013aa0e",
  measurementId: "G-EY88TE8L7H"
};

// Inicjalizacja (tylko raz)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

const dayMap = { 
    monday: "Poniedziałek", tuesday: "Wtorek", wednesday: "Środa", 
    thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela",
    challenge: "🏆 WYZWANIE" 
};
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

let editInfo = { day: null, docId: null };
let currentModalDay = null;
let timerInterval = null;

let currentMode = 'plan'; 
let currentSelectedDay = 'monday'; 
let viewingUserId = null; 

let tempWorkoutResult = null; 
let currentRatingScore = 0;   

/*************************************************************
  1. INICJALIZACJA
*************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector('.container');
  const loginSec = document.getElementById('login-section');
  
  if(container) container.style.display = 'none';
  if(loginSec) loginSec.style.display = 'none';
  
  auth.onAuthStateChanged(user => {
    if (user) {
      if(container) container.style.display = 'block';
      if(loginSec) loginSec.style.display = 'none';
      
      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });
      
      currentMode = 'plan';
      selectDay('monday'); 
      checkActiveWorkout();
      updateProfileUI(user);
      loadProfileStats();
      checkNotificationsCount(); 
    } else {
      if(container) container.style.display = 'none';
      if(loginSec) loginSec.style.display = 'flex';
    }
  });
});

// --- FUNKCJE POMOCNICZE ---
function getRankName(points) {
    if (points <= 20) return "Sztrajer 🔦"; 
    if (points <= 100) return "Młody Gwarek ⛏️";
    if (points <= 200) return "Hajer 👷";
    if (points <= 400) return "Hajer Przodowy 💪";
    if (points <= 600) return "Szczelmistrz 🧨";
    if (points <= 1000) return "Sztygar Zmianowy 📋";
    if (points <= 1500) return "Sztygar Oddziałowy 🏗️";
    if (points <= 2000) return "Nadsztygar 🎩";
    if (points <= 3000) return "Zawiadowca 🏭";
    return "SKARBNIK 🥇"; 
}

function switchAuthTab(tab) {
    const lf = document.getElementById('login-form');
    const rf = document.getElementById('register-form');
    const bl = document.getElementById('tab-login');
    const br = document.getElementById('tab-register');
    
    if (tab === 'login') {
        lf.classList.remove('hidden'); rf.classList.add('hidden');
        bl.classList.add('active'); br.classList.remove('active');
    } else {
        lf.classList.add('hidden'); rf.classList.remove('hidden');
        bl.classList.remove('active'); br.classList.add('active');
    }
}

function switchBottomNav(el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if(el) el.classList.add('active');
}

/*************************************************************
  2. NAWIGACJA
*************************************************************/
function switchMode(mode) {
    currentMode = mode;
    
    const historySection = document.getElementById('history');
    const communitySection = document.getElementById('community');
    const rulesSection = document.getElementById('rules');
    const profileSection = document.getElementById('profile');
    const daysNav = document.getElementById('days-nav-container');
    const fab = document.getElementById('fab-add');

    document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
    
    if (mode === 'history' && historySection) {
        historySection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'block'; 
        if(fab) fab.style.display = 'none';
        loadHistoryFromFirestore(currentSelectedDay);
    } 
    else if (mode === 'community' && communitySection) {
        communitySection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
        if(fab) fab.style.display = 'none';
        loadCommunity();
    } 
    else if (mode === 'rules' && rulesSection) {
        rulesSection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
        if(fab) fab.style.display = 'none';
    } 
    else if (mode === 'profile' && profileSection) {
        profileSection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
        if(fab) fab.style.display = 'none';
        const user = auth.currentUser;
        if(user) {
            updateProfileUI(user);
            loadProfileStats();
        }
    } 
    else {
        if(daysNav) daysNav.style.display = 'block'; 
        if(fab) fab.style.display = 'flex';
        showPlanSection(currentSelectedDay);
    }
    updateHeaderTitle();
}

function selectDay(dayValue) {
    currentSelectedDay = dayValue;
    const selector = document.getElementById('day-selector');
    if(selector) selector.value = dayValue; 
    
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    if(!activeData || activeData.day !== 'challenge') {
        const idx = allDays.indexOf(dayValue);
        if (idx !== -1) {
            const pills = document.querySelectorAll('.pill');
            if(pills[idx]) pills[idx].classList.add('active');
        }
    }

    if (currentMode === 'plan') showPlanSection(dayValue);
    else if (currentMode === 'history') loadHistoryFromFirestore(dayValue);
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
    const timer = document.getElementById('workout-timer');

    if (!titleEl) return;
    
    if (timer && !timer.classList.contains('hidden')) {
        if(shareBtn) shareBtn.classList.add('hidden');
        return; 
    }

    if(shareBtn) shareBtn.classList.add('hidden');

    if (currentMode === 'plan') {
        titleEl.textContent = `Plan: ${polishName}`;
        if(shareBtn && currentSelectedDay !== 'challenge') shareBtn.classList.remove('hidden'); 
    }
    else if (currentMode === 'history') titleEl.textContent = `Historia: ${polishName}`;
    else if (currentMode === 'community') titleEl.textContent = `Społeczność`;
    else if (currentMode === 'rules') titleEl.textContent = `Kodeks Szychty`;
    else if (currentMode === 'profile') titleEl.textContent = `Twój Profil`;
}

/*************************************************************
  3. TRENING I WYZWANIA
*************************************************************/
function startWorkout(day) {
    const now = Date.now();
    const workoutData = { day: day, startTime: now, isChallenge: false };
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    checkActiveWorkout();
    alert("Szychta rozpoczęta! Do roboty 💪");
}

async function startChallenge(dayKey, exercisesJson, authorUid) {
    const user = auth.currentUser;
    if (user.uid === authorUid) return alert("Nie ma punktów za własne wyzwania! Ćwicz normalnie.");

    const todayStr = new Date().toISOString().split('T')[0];
    const historySnap = await db.collection("users").doc(user.uid).collection("history")
        .where("dateIso", ">=", todayStr).get();

    let challengeCount = 0;
    let challengeAuthors = new Set();

    historySnap.forEach(doc => {
        const d = doc.data();
        if (d.isChallenge) {
            challengeCount++;
            if(d.originalAuthorId) challengeAuthors.add(d.originalAuthorId);
        }
    });

    if (challengeCount >= 2) return alert("Koniec szychty na dziś! Limit wyzwań (2) wykorzystany.");
    if (challengeAuthors.has(authorUid)) return alert("Już robiłeś trening tego Hajera dzisiaj! Wybierz kogoś innego.");

    if (!confirm("Bierzesz to na klatę? Zaczynamy wyzwanie!")) return;

    try {
        const exercises = JSON.parse(exercisesJson);
        const batch = db.batch();
        
        const challengeRef = db.collection("users").doc(user.uid).collection("days").doc("challenge").collection("exercises");
        const oldData = await challengeRef.get();
        oldData.forEach(doc => batch.delete(doc.ref));

        exercises.forEach(ex => {
            const newDocRef = challengeRef.doc();
            batch.set(newDocRef, { ...ex, notes: "Wyzwanie", order: Date.now() });
        });

        await batch.commit();

        const workoutData = { 
            day: "challenge", 
            startTime: Date.now(), 
            isChallenge: true, 
            challengeAuthor: authorUid 
        };
        localStorage.setItem('activeWorkout', JSON.stringify(workoutData));

        closePublicProfile();
        // Przełącz na widok wyzwania
        document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
        let chDiv = document.getElementById('challenge');
        if(chDiv) chDiv.classList.remove("hidden");
        
        const nav = document.getElementById('days-nav-container');
        if(nav) nav.style.display = 'none'; 
        
        loadCardsDataFromFirestore("challenge");
        checkActiveWorkout();

    } catch (e) {
        console.error(e);
        alert("Błąd: " + e.message);
    }
}

async function surrenderChallenge() {
    if(!confirm("Poddajesz się? 0 pkt dla Ciebie, a Autor dostanie +2 pkt za pokonanie Cię. Na pewno?")) return;
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const authorId = activeData.challengeAuthor;

    if(authorId) {
        db.collection("publicUsers").doc(authorId).update({
            totalPoints: firebase.firestore.FieldValue.increment(2) 
        });
    }
    localStorage.removeItem('activeWorkout');
    window.location.reload();
}

async function finishWorkout(day) {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const isChallenge = activeData && activeData.isChallenge;

    const timerText = document.getElementById('workout-timer').textContent; 
    const parts = timerText.split(':');
    const totalMinutes = (parseInt(parts[0]) * 60) + parseInt(parts[1]);

    if (isChallenge && totalMinutes < 10) {
        return alert(`Za krótko, chopie! Szychta musi trwać minimum 10 minut. (Twój czas: ${totalMinutes} min)`);
    }

    if(!confirm("Fajrant? (Zakończyć trening)")) return;

    const user = auth.currentUser;
    const exercisesRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises");
    const qs = await exercisesRef.get();
    
    let exercisesDone = [];
    const batch = db.batch();

    qs.forEach(doc => {
        const data = doc.data();
        exercisesDone.push({ name: data.exercise, sets: data.currentLogs || [], weight: data.weight }); 
        batch.update(doc.ref, { currentLogs: firebase.firestore.FieldValue.delete() });
    });

    await batch.commit();

    tempWorkoutResult = {
        dateIso: new Date().toISOString(),
        duration: timerText,
        dayKey: day,
        details: exercisesDone,
        isChallenge: !!isChallenge,
        authorId: activeData ? activeData.challengeAuthor : null
    };

    if (isChallenge) {
        openChallengeEndModal(); 
    } else {
        await saveHistoryAndPoints(2, null, 0); 
        alert("Fajrant! Trening własny zaliczony (+2 pkt).");
        localStorage.removeItem('activeWorkout');
        window.location.reload();
    }
}

/*************************************************************
  4. OBSŁUGA MODALA I RAPORTOWANIA
*************************************************************/
function openChallengeEndModal() {
    const container = document.getElementById('rating-buttons');
    if(container) {
        container.innerHTML = '';
        for(let i=1; i<=10; i++) {
            const btn = document.createElement('button');
            btn.className = 'rating-point-btn';
            btn.textContent = i;
            btn.onclick = () => selectRating(i, btn);
            container.appendChild(btn);
        }
    }
    document.getElementById('save-decision-area').classList.add('hidden');
    document.getElementById('day-selector-area').classList.add('hidden');
    document.getElementById('challenge-end-modal').classList.remove('hidden');
}

function selectRating(score, btn) {
    currentRatingScore = score;
    document.querySelectorAll('.rating-point-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('save-decision-area').classList.remove('hidden');
}

function showDaySelectorForSave() {
    document.getElementById('save-decision-area').classList.add('hidden');
    document.getElementById('day-selector-area').classList.remove('hidden');
}

async function finalizeChallenge(shouldSaveToPlan) {
    const user = auth.currentUser;
    const result = tempWorkoutResult;

    await saveHistoryAndPoints(3, result.authorId, currentRatingScore);

    if(result.authorId) {
        await db.collection("challenge_reports").add({
            authorId: result.authorId,      
            performerId: user.uid,          
            performerName: user.displayName || "Górnik",
            workoutDate: new Date().toISOString(),
            details: result.details,        
            duration: result.duration,
            status: "PENDING",              
            performerRatingGiven: currentRatingScore 
        });
    }

    if (shouldSaveToPlan) {
        const targetDay = document.getElementById('target-save-day').value;
        const sourceRef = db.collection("users").doc(user.uid).collection("days").doc("challenge").collection("exercises");
        const targetRef = db.collection("users").doc(user.uid).collection("days").doc(targetDay).collection("exercises");
        const snap = await sourceRef.get();
        const batch = db.batch();
        snap.forEach(doc => {
            const d = doc.data();
            batch.set(targetRef.doc(), { ...d, notes: "Zapisane z wyzwania" });
        });
        await batch.commit();
        alert(`Plan dodany do: ${dayMap[targetDay]}`);
    }

    document.getElementById('challenge-end-modal').classList.add('hidden');
    localStorage.removeItem('activeWorkout');
    window.location.reload();
}

async function saveHistoryAndPoints(myPoints, authorId, ratingPoints) {
    const user = auth.currentUser;
    const result = tempWorkoutResult;
    const batch = db.batch();

    const historyRef = db.collection("users").doc(user.uid).collection("history").doc();
    let authorName = "Nieznany";
    if (authorId) {
        const authorSnap = await db.collection("publicUsers").doc(authorId).get();
        if(authorSnap.exists) authorName = authorSnap.data().displayName;
    }

    batch.set(historyRef, {
        ...result,
        dayName: result.isChallenge ? `🏆 WYZWANIE` : dayMap[result.dayKey],
        originalAuthorId: authorId || null,
        originalAuthorName: authorId ? authorName : null,
        pointsEarned: myPoints
    });

    const myPublicRef = db.collection("publicUsers").doc(user.uid);
    batch.set(myPublicRef, {
        totalPoints: firebase.firestore.FieldValue.increment(myPoints),
        lastWorkout: new Date().toISOString()
    }, { merge: true });

    if (authorId && ratingPoints > 0) {
        const authorRef = db.collection("publicUsers").doc(authorId);
        batch.update(authorRef, {
            totalPoints: firebase.firestore.FieldValue.increment(ratingPoints),
            ratingCount: firebase.firestore.FieldValue.increment(1)
        });
    }

    await batch.commit();
}

/*************************************************************
  5. MELDUNKI I POWIADOMIENIA
*************************************************************/
function openNotificationsModal() {
    document.getElementById('notifications-modal').classList.remove('hidden');
    switchNotifTab('todo'); 
}
function closeNotificationsModal() {
    document.getElementById('notifications-modal').classList.add('hidden');
    checkNotificationsCount(); 
}

function switchNotifTab(tab) {
    document.querySelectorAll('.notif-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-notif-${tab}`).classList.add('active');
    loadNotificationsList(tab);
}

function loadNotificationsList(tab) {
    const container = document.getElementById('notif-list-container');
    container.innerHTML = '<p style="text-align:center;color:#666">Sprawdzam...</p>';
    const user = auth.currentUser;

    if (tab === 'todo') {
        // Raporty do oceny (jestem autorem)
        db.collection("challenge_reports")
            .where("authorId", "==", user.uid)
            .where("status", "==", "PENDING")
            .get().then(qs => {
                container.innerHTML = "";
                if(qs.empty) { container.innerHTML = "<p style='text-align:center;color:#666'>Brak raportów do oceny.</p>"; return; }
                
                qs.forEach(doc => {
                    const data = doc.data();
                    const el = document.createElement('div');
                    el.className = 'notification-item action-needed';
                    el.innerHTML = `
                        <div class="notif-title">⚒️ ${escapeHTML(data.performerName)} ukończył Twój plan!</div>
                        <div class="notif-desc">Czas: ${data.duration}. Ocenił Cię na: ${data.performerRatingGiven}/10.</div>
                        <div class="notif-actions">
                            <button class="btn-small" onclick="ratePerformer('${doc.id}')">OCEŃ GO</button>
                        </div>
                    `;
                    container.appendChild(el);
                });
            });
    } else {
        // Moje wyniki (jestem wykonawcą)
        db.collection("challenge_reports")
            .where("performerId", "==", user.uid)
            .where("status", "==", "RATED") 
            .get().then(qs => {
                container.innerHTML = "";
                if(qs.empty) { container.innerHTML = "<p style='text-align:center;color:#666'>Brak nowych wiadomości.</p>"; return; }

                qs.forEach(doc => {
                    const data = doc.data();
                    const el = document.createElement('div');
                    el.className = 'notification-item';
                    el.style.borderColor = 'var(--primary-color)';
                    el.innerHTML = `
                        <div class="notif-title">💰 Wypłata Przyszła!</div>
                        <div class="notif-desc">Sztygar ocenił Twój trening na: <b>${data.bonusPoints} pkt</b>.</div>
                        <div class="notif-actions">
                            <button class="btn-small" style="background:var(--accent-color); color:black;" onclick="claimBonusPoints('${doc.id}', ${data.bonusPoints})">ODBIERZ PKT</button>
                        </div>
                    `;
                    container.appendChild(el);
                });
            });
    }
}

function ratePerformer(reportId) {
    const score = prompt("Ile punktów (1-10) dajesz za ten trening?");
    if(!score || isNaN(score) || score < 1 || score > 10) return alert("Podaj liczbę 1-10");

    db.collection("challenge_reports").doc(reportId).update({
        status: "RATED",
        bonusPoints: parseInt(score)
    }).then(() => {
        alert("Wysłano ocenę!");
        loadNotificationsList('todo');
    });
}

function claimBonusPoints(reportId, points) {
    const user = auth.currentUser;
    const batch = db.batch();

    const myRef = db.collection("publicUsers").doc(user.uid);
    batch.update(myRef, { totalPoints: firebase.firestore.FieldValue.increment(points) });

    const reportRef = db.collection("challenge_reports").doc(reportId);
    batch.update(reportRef, { status: "COMPLETED" });

    batch.commit().then(() => {
        alert(`Odebrano ${points} pkt!`);
        loadNotificationsList('news');
        checkNotificationsCount();
    });
}

function checkNotificationsCount() {
    const user = auth.currentUser;
    if(!user) return;
    Promise.all([
        db.collection("challenge_reports").where("authorId", "==", user.uid).where("status", "==", "PENDING").get(),
        db.collection("challenge_reports").where("performerId", "==", user.uid).where("status", "==", "RATED").get()
    ]).then(([res1, res2]) => {
        const count = res1.size + res2.size;
        const badge = document.getElementById('profile-notif-badge');
        if(badge) {
            if(count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

/*************************************************************
  6. FUNKCJE POMOCNICZE UI
*************************************************************/
function checkActiveWorkout() {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const titleEl = document.getElementById('current-day-display');
    const timerEl = document.getElementById('workout-timer');
    const shareBtn = document.getElementById('btn-share-day');
    
    if (activeData) {
        if (activeData.day === 'challenge') {
            document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
            let chDiv = document.getElementById('challenge');
            if(chDiv) chDiv.classList.remove("hidden");
            
            const nav = document.getElementById('days-nav-container');
            if(nav) nav.style.display = 'none'; 
            if(shareBtn) shareBtn.style.display = 'none';
        }
        if(titleEl) titleEl.style.display = 'none';
        if(timerEl) {
            timerEl.classList.remove('hidden');
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                const diff = Date.now() - activeData.startTime;
                const date = new Date(diff);
                timerEl.textContent = date.toISOString().substr(11, 8);
            }, 1000);
        }
        updateActionButtons(activeData.day);
    } else {
        if(titleEl) titleEl.style.display = 'block';
        if(shareBtn) shareBtn.style.display = ''; 
        if(timerEl) timerEl.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
        const nav = document.getElementById('days-nav-container');
        if(nav) nav.style.display = 'block';
        updateHeaderTitle(); 
        if(currentMode === 'plan') updateActionButtons(currentSelectedDay);
    }
}

function updateActionButtons(currentViewDay) {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const container = document.getElementById(`${currentViewDay}-actions`);
    if(!container) return;
    container.innerHTML = '';
    if (activeData && activeData.day === currentViewDay) {
        container.innerHTML = `<button class="btn-finish-workout" onclick="finishWorkout('${currentViewDay}')"><i class="fa-solid fa-flag-checkered"></i> ZAKOŃCZ TRENING</button>`;
    } else if (!activeData) {
        container.innerHTML = `<button class="btn-start-workout" onclick="startWorkout('${currentViewDay}')"><i class="fa-solid fa-play"></i> START TRENINGU</button>`;
    } else if (activeData && activeData.day !== currentViewDay) {
        container.innerHTML = `<p style="text-align:center; color:#666;">Trening trwa w: ${dayMap[activeData.day]}</p>`;
    }
}

function addLog(day, docId) {
    const w = document.getElementById(`log-w-${docId}`).value;
    const r = document.getElementById(`log-r-${docId}`).value;
    if (!w || !r) return;
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
      .update({ currentLogs: firebase.firestore.FieldValue.arrayUnion({ weight: w, reps: r, id: Date.now() }), weight: w })
      .then(() => loadCardsDataFromFirestore(day));
}

function removeLog(day, docId, w, r, lid) {
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
      .update({ currentLogs: firebase.firestore.FieldValue.arrayRemove({ weight: w, reps: r, id: Number(lid) }) })
      .then(() => loadCardsDataFromFirestore(day));
}

function loadCardsDataFromFirestore(day) {
    const container = document.getElementById(`${day}-cards`);
    if(!container) return;
    const user = auth.currentUser;
    if(!user) return;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").orderBy("order", "asc").get()
    .then(qs => {
        container.innerHTML = ""; 
        if(qs.empty && day === 'challenge') { container.innerHTML="<p>Pusto? Odśwież aplikację.</p>"; return; }
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
    let logsHtml = logs.map(l => `<div class="log-chip"><span>${l.weight}kg x ${l.reps}</span><i class="fa-solid fa-xmark remove-log" onclick="removeLog('${day}', '${id}', '${l.weight}', '${l.reps}', ${l.id})"></i></div>`).join('');
    
    card.innerHTML = `
        <div class="exercise-card-header" onclick="toggleCard(this)">
            <div class="header-left">
                <i class="fa-solid fa-bars drag-handle"></i>
                <div><div class="ex-title">${escapeHTML(data.exercise)}</div><div class="ex-summary">Cel: ${data.series}s x ${data.reps}r</div></div>
            </div>
            <i class="fa-solid fa-chevron-down expand-icon"></i>
        </div>
        <div class="exercise-card-details">
            <div class="plan-vs-real-grid">
                 <div class="plan-box"><span class="plan-label">SERIE</span><div class="plan-val">${data.series}</div></div>
                 <div class="plan-box"><span class="plan-label">POWT</span><div class="plan-val">${data.reps}</div></div>
                 <div class="plan-box"><span class="plan-label">KG</span><div class="plan-val">${data.weight || '-'}</div></div>
            </div>
            ${data.notes ? `<div class="notes-box">"${escapeHTML(data.notes)}"</div>` : ''}
            <div class="logger-section">
                <div class="logger-input-row">
                    <input type="number" id="log-w-${id}" placeholder="Kg" value="${data.weight || ''}">
                    <input type="number" id="log-r-${id}" placeholder="Powt" value="${data.reps || ''}">
                    <button class="btn-add-log" onclick="addLog('${day}', '${id}')"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="logs-list">${logsHtml}</div>
            </div>
            <div class="card-actions">
                 <button class="btn-icon btn-edit" onclick="triggerEdit('${day}', '${id}')"><i class="fa-solid fa-pen"></i></button>
                 <button class="btn-icon btn-delete" onclick="deleteCard('${day}', '${id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `;
    container.appendChild(card);
}
window.toggleCard = function(h) { if(event.target.tagName!=='INPUT' && event.target.tagName!=='BUTTON' && !event.target.classList.contains('remove-log')) h.parentElement.classList.toggle('open'); };

function updateProfileUI(user) {
    const emailEl = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    
    if(user) {
        const displayName = user.displayName || user.email;
        if(emailEl) emailEl.textContent = displayName;
        if(avatarEl) avatarEl.textContent = (displayName ? displayName[0] : 'U').toUpperCase();
    }
}

function loadProfileStats() {
    const user = auth.currentUser;
    if(!user) return;

    db.collection("users").doc(user.uid).collection("history").get().then(qs => {
        const total = qs.size;
        let last = '-';
        if(!qs.empty) {
            const docs = qs.docs.sort((a,b) => b.data().dateIso.localeCompare(a.data().dateIso));
            last = docs[0].data().displayDate || docs[0].data().dateIso.split('T')[0];
        }
        
        const totEl = document.getElementById('total-workouts');
        const lastEl = document.getElementById('last-workout-date');
        if(totEl) totEl.textContent = total;
        if(lastEl) lastEl.textContent = last;
        
        db.collection("publicUsers").doc(user.uid).get().then(doc => {
            let pts = 0;
            if(doc.exists) pts = doc.data().totalPoints || 0;
            
            const kudosEl = document.getElementById('profile-kudos');
            if(kudosEl) kudosEl.innerHTML = `${pts} <br><span style='font-size:0.6rem; color:#ffd700'>${getRankName(pts)}</span>`;
            
            publishProfileStats(user, total, last, pts);
        });
    });
}

function publishProfileStats(user, total, last, pts) {
    const displayName = user.displayName || user.email.split('@')[0];
    db.collection("publicUsers").doc(user.uid).set({
        displayName: displayName,
        email: user.email,
        totalWorkouts: total,
        lastWorkout: last,
        totalPoints: pts || 0,
        uid: user.uid
    }, { merge: true });
}

function updateUsername() {
    const newName = document.getElementById('new-username').value;
    if(!newName) return;
    const user = auth.currentUser;
    
    user.updateProfile({ displayName: newName }).then(() => {
        db.collection("publicUsers").doc(user.uid).set({ displayName: newName }, { merge: true });
        updateProfileUI(user);
        alert("Nazwa zmieniona!");
    }).catch(e => alert("Błąd: " + e.message));
}

function changePassword() {
    const newPass = document.getElementById('new-password').value;
    if(!newPass) return;
    const user = auth.currentUser;
    user.updatePassword(newPass).then(() => {
        alert("Hasło zmienione!");
    }).catch(e => alert("Musisz się zalogować ponownie przed zmianą hasła."));
}

async function signIn() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    }
}

async function signUp() {
    const email = document.getElementById('register-email').value;
    const pass = document.getElementById('register-password').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        if(cred.user) {
            await cred.user.updateProfile({
                displayName: email.split('@')[0]
            });
        }
        alert("Konto założone! Zaloguj się.");
        switchAuthTab('login');
    } catch (error) {
        document.getElementById('register-error').textContent = error.message;
    }
}

async function signOut() {
    await auth.signOut();
    location.reload();
}

// --- POZOSTAŁE FUNKCJE (Trening, Logi, Community) ---
// Skopiuj resztę funkcji (startWorkout, loadCommunity, openNotificationsModal, itd.)
// Z poprzedniego pliku script.js (wersja "Skarbnik Code v1.0"), ponieważ są poprawne.
// Pamiętaj, żeby na końcu pliku NIE BYŁO NADMIAROWYCH KLAMR `}`.

// --- WAŻNE: TUTAJ DOKLEJAM TE NAJWAŻNIEJSZE, ŻEBY DZIAŁAŁO ---

function openNotificationsModal() {
    document.getElementById('notifications-modal').classList.remove('hidden');
    switchNotifTab('todo'); 
}
function closeNotificationsModal() {
    document.getElementById('notifications-modal').classList.add('hidden');
    checkNotificationsCount(); 
}
function switchNotifTab(tab) {
    document.querySelectorAll('.notif-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-notif-${tab}`).classList.add('active');
    loadNotificationsList(tab);
}

// (Reszta funkcji: loadNotificationsList, ratePerformer, claimBonusPoints, checkNotificationsCount - weź z poprzedniej wersji)
// (Reszta funkcji: checkActiveWorkout, updateActionButtons, addLog, removeLog, loadCardsData, renderAccordionCard - weź z poprzedniej wersji)
// (Reszta funkcji: loadHistoryFromFirestore, renderHistoryCard - weź z poprzedniej wersji)
// (Reszta funkcji: loadCommunity, openPublicProfile, closePublicProfile - weź z poprzedniej wersji)
// (Reszta funkcji: loadSharedPlansForUser, deleteSharedPlan, shareCurrentDay - weź z poprzedniej wersji)
// (Reszta funkcji: openAddModal, closeAddModal, saveFromModal, window.triggerEdit, deleteCard, saveMuscleGroups, loadMuscleGroupFromFirestore - weź z poprzedniej wersji)

// --- FIX MODALA ZASAD ---
function openRulesModal() {
    const m = document.getElementById('rules-modal');
    if(m) {
        m.classList.remove('hidden');
        setTimeout(() => {
            const content = m.querySelector('.modal-content');
            if(content) content.style.transform = 'translateY(0)';
        }, 10);
    }
}

function closeRulesModal() {
    const m = document.getElementById('rules-modal');
    if(m) {
        const content = m.querySelector('.modal-content');
        if(content) content.style.transform = 'translateY(100%)';
        setTimeout(() => m.classList.add('hidden'), 300);
    }
}

async function forceAppUpdate(btnElement) {
    if (!confirm("Wymusić aktualizację?")) return;
    if('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations(); 
        for(let r of regs) r.unregister(); 
    }
    if('caches' in window) {
        caches.keys().then(k=>k.forEach(c=>caches.delete(c))); 
    }
    location.reload(true); 
}

// ... [DODAJ TU RESZTĘ LOGIKI TRENINGOWEJ JEŚLI JEJ NIE MA] ...
