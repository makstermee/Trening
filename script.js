/*************************************************************
  ZMIENNE GLOBALNE I KONFIGURACJA
*************************************************************/
// 1. Konfiguracja Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDNt_K6lkFKHZeFXyBMLOpePge967aAEh8",
  authDomain: "plan-treningowy-a9d00.firebaseapp.com",
  projectId: "plan-treningowy-a9d00",
  storageBucket: "plan-treningowy-a9d00.firebasestorage.app",
  messagingSenderId: "1087845341451",
  appId: "1:1087845341451:web:08201e588c56d73013aa0e",
  measurementId: "G-EY88TE8L7H"
};

// Inicjalizacja Firebase 
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// 2. Mapy i Zmienne
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

// Zmienne do obsługi wyzwań
let tempWorkoutResult = null; 
let currentRatingScore = 0;   

// USTAWIENIA APLIKACJI (Audio/Haptic)
// Ładujemy z pamięci telefonu lub ustawiamy domyślnie na włączone (true)
let appSettings = JSON.parse(localStorage.getItem('gympro_settings')) || { audio: true, haptic: true };

/*************************************************************
  0. SYSTEM AUDIO I HAPTYKI
*************************************************************/
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function triggerFeedback(type) {
    // 1. Wibracje (Haptic) - Tylko jeśli włączone w ustawieniach
    if (appSettings.haptic && navigator.vibrate) {
        if (type === 'light') navigator.vibrate(10); // Kliknięcie
        if (type === 'medium') navigator.vibrate(40); // Zapisanie serii
        if (type === 'heavy') navigator.vibrate([100, 50, 100]); // Sukces/Błąd
        if (type === 'siren') navigator.vibrate([500, 100, 500]); // Syrena
    }

    // 2. Dźwięki (Syntezator) - Tylko jeśli włączone w ustawieniach
    if (appSettings.audio) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'light') { // Kliknięcie (krótkie pyknięcie)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } 
        else if (type === 'medium') { // Sukces (Ding!)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
        else if (type === 'siren') { // Syrena Kopalniana
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(600, now + 1); // Narastanie
            osc.frequency.linearRampToValueAtTime(300, now + 2); // Opadanie
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 2.5);
            osc.start(now);
            osc.stop(now + 2.5);
        }
    }
}

// Funkcja do przełączania ustawień (podpięta pod przyciski w profilu)
function toggleAppSetting(key) {
    appSettings[key] = !appSettings[key]; // Odwracamy wartość
    localStorage.setItem('gympro_settings', JSON.stringify(appSettings)); // Zapisujemy
    updateSettingsUI(); // Aktualizujemy wygląd przycisków
    
    // Feedback, żeby użytkownik wiedział, że działa (tylko jeśli właśnie włączył)
    if (appSettings[key]) triggerFeedback(key === 'audio' ? 'medium' : 'light');
}

// Funkcja aktualizująca wygląd przycisków w profilu
function updateSettingsUI() {
    const btnAudio = document.getElementById('btn-set-audio');
    const btnHaptic = document.getElementById('btn-set-haptic');
    
    if (btnAudio) {
        if (appSettings.audio) {
            btnAudio.style.borderColor = 'var(--accent-color)';
            btnAudio.style.color = 'var(--accent-color)';
            btnAudio.innerHTML = `<i class="fa-solid fa-volume-high"></i> Dźwięk: WŁ`;
        } else {
            btnAudio.style.borderColor = '#444';
            btnAudio.style.color = '#666';
            btnAudio.innerHTML = `<i class="fa-solid fa-volume-xmark"></i> Dźwięk: WYŁ`;
        }
    }

    if (btnHaptic) {
        if (appSettings.haptic) {
            btnHaptic.style.borderColor = 'var(--accent-color)';
            btnHaptic.style.color = 'var(--accent-color)';
            btnHaptic.innerHTML = `<i class="fa-solid fa-mobile-screen-button"></i> Wibracje: WŁ`;
        } else {
            btnHaptic.style.borderColor = '#444';
            btnHaptic.style.color = '#666';
            btnHaptic.innerHTML = `<i class="fa-solid fa-mobile-button"></i> Wibracje: WYŁ`;
        }
    }
}

/*************************************************************
  1. INICJALIZACJA I RANGI
*************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector('.container');
  const loginSec = document.getElementById('login-section');
  
  if(container) container.style.display = 'none';
  
  auth.onAuthStateChanged(user => {
    if (user) {
      if(container) container.style.display = 'block';
      if(loginSec) loginSec.style.display = 'none';
      
      // Ładowanie wszystkich dni
      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });
      // Ładowanie Szychty (zawsze)
      loadCardsDataFromFirestore('challenge');

      // --- INTELIGENTNY START ---
      const lastMode = sessionStorage.getItem('GEM_saved_mode');
      const lastDay = sessionStorage.getItem('GEM_saved_day');

      const todayIndex = new Date().getDay(); 
      const jsDayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const todayName = jsDayMap[todayIndex];

      if (lastMode && lastMode !== 'plan') {
          switchMode(lastMode);
          if (lastDay) selectDay(lastDay); 
      } else {
          currentMode = 'plan';
          selectDay(lastDay || todayName);
      }
      // --------------------------

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

// --- RANGI GÓRNICZE ---
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

/*************************************************************
  2. NAWIGACJA
*************************************************************/
function switchMode(mode) {
    triggerFeedback('light'); // Dźwięk kliknięcia
    sessionStorage.setItem('GEM_saved_mode', mode);
    currentMode = mode;
      // --- Aktualizacja podświetlenia dolnego paska ---
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        // Sprawdzamy czy przycisk prowadzi do tego trybu
        if (btn.getAttribute('onclick').includes(`'${mode}'`)) {
            btn.classList.add('active');
        }
    });
    // -----------------------------------------------------  
    const historySection = document.getElementById('history');
    const communitySection = document.getElementById('community');
    const rulesSection = document.getElementById('rules');
    const profileSection = document.getElementById('profile');
    const daysNav = document.getElementById('days-nav-container');
    const fab = document.getElementById('fab-add'); 

    document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
    
    if(fab) {
        fab.style.display = (mode === 'plan' && currentSelectedDay !== 'challenge') ? 'flex' : 'none';
    }

    if (mode === 'history' && historySection) {
        historySection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'block'; 
        loadHistoryFromFirestore(currentSelectedDay);
    } 
    else if (mode === 'community' && communitySection) {
        communitySection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
        loadCommunity();
    } 
    else if (mode === 'rules' && rulesSection) {
        rulesSection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
    } 
    else if (mode === 'profile' && profileSection) {
        profileSection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
        loadProfileStats(); 
        updateSettingsUI(); // <-- ODŚWIEŻAMY PRZYCISKI USTAWIEŃ PRZY WEJŚCIU
    } 
    else {
        if(daysNav) daysNav.style.display = 'block'; 
        showPlanSection(currentSelectedDay);
    }
    updateHeaderTitle();
}

function selectDay(dayValue) {
    triggerFeedback('light'); // Dźwięk kliknięcia
    sessionStorage.setItem('GEM_saved_day', dayValue);
    currentSelectedDay = dayValue;
    const selector = document.getElementById('day-selector');
    if(selector) selector.value = dayValue; 
    
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    
    if (dayValue === 'challenge') {
        const chBtn = document.getElementById('pill-challenge');
        if(chBtn) chBtn.classList.add('active');
    } else {
        const idx = allDays.indexOf(dayValue);
        if (idx !== -1) {
            const pills = document.querySelectorAll('.days-pills .pill:not(#pill-challenge)');
            if(pills[idx]) pills[idx].classList.add('active');
        }
    }

    const fab = document.getElementById('fab-add');
    if (fab) {
        if (dayValue === 'challenge') {
            fab.style.display = 'none';
        } else {
            fab.style.display = (currentMode === 'plan') ? 'flex' : 'none';
        }
    }

    if (currentMode === 'plan') showPlanSection(dayValue);
    else if (currentMode === 'history') {
        loadHistoryFromFirestore(dayValue === 'challenge' ? null : dayValue);
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
    else if (currentMode === 'rules') titleEl.textContent = `Zasady i Rangi`;
    else if (currentMode === 'profile') titleEl.textContent = `Twój Profil`;
}

/*************************************************************
  3. TRENING I WYZWANIA
*************************************************************/
function startWorkout(day) {
    triggerFeedback('siren'); // SYRENA NA START
    const now = Date.now();
    const workoutData = { day: day, startTime: now, isChallenge: false };
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    checkActiveWorkout();
    alert("Szychta rozpoczęta! Do roboty 💪");
}

async function startChallenge(dayKey, exercisesJson, authorUid) {
    triggerFeedback('light');
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
        
        triggerFeedback('siren'); // Syrena przy wyzwaniu
        closePublicProfile();
        selectDay("challenge");
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
    const authorId = (activeData && activeData.challengeAuthor) || null;

    if(authorId) {
        db.collection("publicUsers").doc(authorId).update({
            totalPoints: firebase.firestore.FieldValue.increment(2) 
        });
    }
    triggerFeedback('heavy'); // Smutna wibracja
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
        triggerFeedback('heavy');
        return alert(`Za krótko, chopie! Szychta musi trwać minimum 10 minut. (Twój czas: ${totalMinutes} min)`);
    }

    if(!confirm("Fajrant? (Zakończyć trening)")) return;

    try {
        const user = auth.currentUser;
        const exercisesRef = db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises");
        const qs = await exercisesRef.get();
        
        let exercisesDone = [];
        const batch = db.batch();

        qs.forEach(doc => {
            const data = doc.data();
            exercisesDone.push({ 
                name: data.exercise, 
                sets: data.currentLogs || [], 
                weight: data.weight || 0 
            }); 
            batch.update(doc.ref, { currentLogs: firebase.firestore.FieldValue.delete() });
        });

        await batch.commit();

        let safeAuthorId = null;
        if(activeData && activeData.challengeAuthor) {
            safeAuthorId = activeData.challengeAuthor;
        }

        // Pobieranie nazwy partii z inputa
        let muscleName = "";
        const muscleInput = document.getElementById(`${day}-muscle-group`);
        if (muscleInput) muscleName = muscleInput.value;

        tempWorkoutResult = {
            dateIso: new Date().toISOString(),
            duration: timerText,
            dayKey: day,
            details: exercisesDone,
            isChallenge: !!isChallenge,
            authorId: safeAuthorId,
            workoutName: muscleName // Zapisujemy to pole!
        };

        triggerFeedback('siren'); // SYRENA NA KONIEC

        if (isChallenge) {
            openChallengeEndModal(); 
        } else {
            await saveHistoryAndPoints(2, null, 0); 
            alert("Fajrant! Trening własny zaliczony (+2 pkt).");
            localStorage.removeItem('activeWorkout');
            window.location.reload();
        }
    } catch (e) {
        console.error(e);
        alert("BŁĄD ZAPISU: " + e.message);
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
    
    const modal = document.getElementById('challenge-end-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function selectRating(score, btn) {
    triggerFeedback('light');
    currentRatingScore = score;
    document.querySelectorAll('.rating-point-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('save-decision-area').classList.remove('hidden');
}

function showDaySelectorForSave() {
    triggerFeedback('light');
    document.getElementById('save-decision-area').classList.add('hidden');
    document.getElementById('day-selector-area').classList.remove('hidden');
}

async function finalizeChallenge(shouldSaveToPlan) {
    try {
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

        const modal = document.getElementById('challenge-end-modal');
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
        
        localStorage.removeItem('activeWorkout');
        window.location.reload();
    } catch (e) {
        alert("Błąd podczas kończenia: " + e.message);
    }
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
        // Jeśli workoutName jest pusty, użyj dayName
        workoutName: result.workoutName || dayMap[result.dayKey],
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
    triggerFeedback('light');
    const modal = document.getElementById('notifications-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
    switchNotifTab('todo'); 
}
function closeNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
    checkNotificationsCount(); 
}

function switchNotifTab(tab) {
    triggerFeedback('light');
    document.querySelectorAll('.notif-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-notif-${tab}`).classList.add('active');
    loadNotificationsList(tab);
}

function loadNotificationsList(tab) {
    const container = document.getElementById('notif-list-container');
    container.innerHTML = '<p style="text-align:center;color:#666">Sprawdzam...</p>';
    const user = auth.currentUser;

    if (tab === 'todo') {
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
    triggerFeedback('light');
    const score = prompt("Ile punktów (1-10) dajesz za ten trening?");
    if(!score || isNaN(score) || score < 1 || score > 10) return alert("Podaj liczbę 1-10");

    db.collection("challenge_reports").doc(reportId).update({
        status: "RATED",
        bonusPoints: parseInt(score)
    }).then(() => {
        triggerFeedback('medium');
        alert("Wysłano ocenę!");
        loadNotificationsList('todo');
    });
}

function claimBonusPoints(reportId, points) {
    triggerFeedback('medium');
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
    const nav = document.getElementById('days-nav-container');

    if (activeData) {
        // --- TRENING TRWA ---
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

        if (activeData.day === 'challenge') {
            if(shareBtn) shareBtn.style.display = 'none';
            if(currentSelectedDay !== 'challenge' && currentMode === 'plan') {
                selectDay('challenge');
            }
        }
        
        updateActionButtons(activeData.day);
    } else {
        // --- BRAK TRENINGU ---
        if(titleEl) titleEl.style.display = 'block';
        if(shareBtn) shareBtn.style.display = ''; 
        if(timerEl) timerEl.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
        
        // Pokaż pasek Dni tylko w Planie lub Historii
        if(nav) {
            if (currentMode === 'plan' || currentMode === 'history') {
                nav.style.display = 'block';
            } else {
                nav.style.display = 'none';
            }
        }
        
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
    } 
    else if (!activeData) {
        if (currentViewDay === 'challenge') {
            container.innerHTML = ''; 
        } else {
            container.innerHTML = `<button class="btn-start-workout" onclick="startWorkout('${currentViewDay}')"><i class="fa-solid fa-play"></i> START TRENINGU</button>`;
        }
    } 
    else if (activeData && activeData.day !== currentViewDay) {
        container.innerHTML = `<p style="text-align:center; color:#666;">Trening trwa w: ${dayMap[activeData.day]}</p>`;
    }
}

function addLog(day, docId) {
    const w = document.getElementById(`log-w-${docId}`).value;
    const r = document.getElementById(`log-r-${docId}`).value;
    if (!w || !r) return;
    
    // FEEDBACK
    triggerFeedback('medium'); 

    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
      .update({ currentLogs: firebase.firestore.FieldValue.arrayUnion({ weight: w, reps: r, id: Date.now() }) }) 
      .then(() => loadCardsDataFromFirestore(day));
}

function removeLog(day, docId, w, r, lid) {
    triggerFeedback('light');
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
      .update({ currentLogs: firebase.firestore.FieldValue.arrayRemove({ weight: w, reps: r, id: Number(lid) }) })
      .then(() => loadCardsDataFromFirestore(day));
}

function loadCardsDataFromFirestore(day) {
    const container = document.getElementById(`${day}-cards`);
    if(!container) return;

    if (day === 'challenge') {
        const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
        if (!activeData || activeData.day !== 'challenge') {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: #888;">
                    <i class="fa-solid fa-bed" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3 style="margin:0; color:#ccc;">Cisza na kopalni</h3>
                    <p style="font-size:0.9rem; margin-top:10px;">Aktualnie nie podjąłeś żadnego wyzwania.</p>
                    <button class="btn-primary" onclick="switchMode('community')" style="margin-top:20px; background:var(--surface-color); border:1px solid #444;">
                        <i class="fa-solid fa-magnifying-glass"></i> Znajdź Wyzwanie
                    </button>
                </div>
            `;
            const actionsDiv = document.getElementById('challenge-actions');
            if(actionsDiv) actionsDiv.innerHTML = '';
            return;
        }
    }

    const user = auth.currentUser;
    if(!user) return;
    
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").orderBy("order", "asc").get()
    .then(qs => {
        container.innerHTML = ""; 
        if(qs.empty && day === 'challenge') { 
            container.innerHTML="<p style='text-align:center; padding:20px;'>Błąd danych wyzwania. Spróbuj odświeżyć.</p>"; 
            return; 
        }
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
    
    let logsHtml = logs.map((l, index) => `
        <div class="log-row-item">
            <div>
                <span class="log-row-info">Seria ${index + 1}</span>
                <span class="log-row-details">${l.weight} kg x ${l.reps} powt.</span>
            </div>
            <button class="log-delete-btn" onclick="removeLog('${day}', '${id}', '${l.weight}', '${l.reps}', ${l.id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    if (logs.length === 0) {
        logsHtml = `<div style="text-align:center; color:#555; font-size:0.8rem; padding:5px;">Brak wpisów. Dodaj pierwszą serię!</div>`;
    }
    
    card.innerHTML = `
        <div class="exercise-card-header" onclick="toggleCard(this)">
            <div class="header-left">
                <i class="fa-solid fa-bars drag-handle"></i>
                <div>
                    <div class="ex-title">${escapeHTML(data.exercise)}</div>
                    <div class="ex-summary">Cel: ${data.series}s x ${data.reps}r ${data.weight ? `(${data.weight}kg)` : ''}</div>
                </div>
            </div>
            <div class="header-actions">
                <i class="fa-solid fa-pen-to-square" style="margin-right:15px; color:#aaa;" onclick="event.stopPropagation(); triggerEdit('${day}', '${id}')"></i>
                <i class="fa-solid fa-trash" style="margin-right:15px; color:var(--danger-color);" onclick="event.stopPropagation(); deleteCard('${day}', '${id}')"></i>
                <i class="fa-solid fa-chevron-down expand-icon"></i>
            </div>
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
                    <input type="number" id="log-w-${id}" placeholder="kg" value="${data.weight || ''}">
                    <input type="number" id="log-r-${id}" placeholder="powt." value="${data.reps || ''}">
                    <button class="btn-add-log" onclick="addLog('${day}', '${id}')">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                <div class="logs-list">${logsHtml}</div>
            </div>
        </div>
    `;
    container.appendChild(card);
}

// Funkcja obsługująca rozwijanie kart
function toggleCard(header) {
    const card = header.parentElement;
    card.classList.toggle('open');
}

function updateProfileUI(user) {
    const emailEl = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    if(emailEl) emailEl.textContent = user.displayName || user.email;
    if(avatarEl) avatarEl.textContent = (user.email ? user.email[0] : 'U').toUpperCase();
}

function loadProfileStats() {
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("history").get().then(qs => {
        const total = qs.size;
        let last = '-';
        if(!qs.empty) last = qs.docs[0].data().displayDate || qs.docs[0].data().dateIso.split('T')[0];
        
        const totEl = document.getElementById('total-workouts');
        const lastEl = document.getElementById('last-workout-date');
        if(totEl) totEl.textContent = total;
        if(lastEl) lastEl.textContent = last;
        
        // ZMODYFIKOWANE: Pobieranie awatara
        db.collection("publicUsers").doc(user.uid).get().then(doc => {
            let pts = 0;
            let currentAvatar = (user.displayName ? user.displayName[0] : user.email[0]).toUpperCase(); 
            
            if(doc.exists) {
                const data = doc.data();
                pts = data.totalPoints || 0;
                if (data.avatar) currentAvatar = data.avatar;
            }
            
            const kudosEl = document.getElementById('profile-kudos');
            const avatarEl = document.getElementById('profile-avatar');
            
            if(kudosEl) kudosEl.innerHTML = `${pts} <br><span style='font-size:0.6rem; color:#ffd700'>${getRankName(pts)}</span>`;
            if(avatarEl) avatarEl.textContent = currentAvatar;
            
            publishProfileStats(user, total, last, pts, currentAvatar);
        });
    });
}
function publishProfileStats(user, total, last, pts, avatar) {
    const dataToUpdate = {
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        totalWorkouts: total,
        lastWorkout: last,
        totalPoints: pts || 0,
        uid: user.uid
    };
    if (avatar) dataToUpdate.avatar = avatar;
    
    db.collection("publicUsers").doc(user.uid).set(dataToUpdate, { merge: true });
}

// NOWA HISTORIA: GRUPOWANIE + TABELA
function loadHistoryFromFirestore(dayFilterKey) {
    const container = document.getElementById("history-list");
    if(!container) return;
    container.innerHTML = '<p style="text-align:center;color:#666">Ładowanie...</p>';
    const user = auth.currentUser;
    
    db.collection("users").doc(user.uid).collection("history").orderBy("dateIso", "desc").limit(50).get()
    .then(qs => {
        container.innerHTML = "";
        let docs = [];
        qs.forEach(d => docs.push({ data: d.data(), id: d.id }));
        
        if (dayFilterKey) {
            const polishName = dayMap[dayFilterKey];
            docs = docs.filter(doc => doc.data.dayKey === dayFilterKey || doc.data.dayName === polishName);
        }
        
        if (docs.length === 0) { container.innerHTML = `<p style="text-align:center; color:#666;">Brak historii.</p>`; return; }

        // Logika grupowania miesiącami
        let currentMonth = "";
        docs.forEach(item => {
             const date = new Date(item.data.dateIso);
             // Używamy polskiej nazwy miesiąca
             const monthName = date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' }).toUpperCase();
             
             if (monthName !== currentMonth) {
                 container.innerHTML += `<div class="history-month-header">${monthName}</div>`;
                 currentMonth = monthName;
             }
             renderHistoryCard(container, item);
        });
    })
    .catch(e => {
        container.innerHTML = `<p style="text-align:center; color:#666;">Błąd: ${e.message}</p>`;
    });
}

function renderHistoryCard(container, item) {
    const data = item.data;
    const id = item.id;
    const card = document.createElement('div');
    card.className = `history-card ${data.isChallenge ? 'gold-border' : ''}`;
    
    let authorHtml = '';
    if (data.isChallenge && data.originalAuthorName) {
        authorHtml = `<div class="challenge-author-info"><i class="fa-solid fa-crown"></i> Plan od: ${escapeHTML(data.originalAuthorName)} (+${data.pointsEarned||0} pkt)</div>`;
    }

    let detailsHtml = '';
    if (data.details && Array.isArray(data.details)) {
        detailsHtml = data.details.map(ex => {
            // Generowanie wierszy tabeli
            let rows = '';
            if (Array.isArray(ex.sets)) {
                rows = ex.sets.map((s, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td class="strong">${s.weight} kg</td>
                        <td>${s.reps} powt.</td>
                    </tr>
                `).join('');
            }

            // Zwracamy blok z nagłówkiem (klikowalnym) i ukrytą tabelą
            return `
                <div class="history-ex-block">
                    <div class="ex-header" onclick="toggleHistoryExercise(this)">
                        <span>${escapeHTML(ex.name)}</span>
                        <i class="fa-solid fa-chevron-down ex-toggle-icon"></i>
                    </div>
                    <div class="history-ex-details">
                        <table class="history-table">
                            <tr><th>Seria</th><th>Kg</th><th>Powt</th></tr>
                            ${rows}
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }

    card.innerHTML = `
        <div class="history-card-header" onclick="toggleHistoryCard(this)">
            <div class="history-info">
                ${authorHtml}
                <h4>${escapeHTML(data.workoutName || data.dayName || 'Trening')}</h4>
                <div class="history-meta">
                    <span>${data.displayDate || data.dateIso.split('T')[0]}</span>
                    <span><i class="fa-solid fa-stopwatch"></i> ${data.duration}</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-delete-btn" onclick="deleteHistoryEntry(event, '${id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <i class="fa-solid fa-chevron-down history-toggle-icon"></i>
            </div>
        </div>
        <div class="history-card-details">${detailsHtml || '<p>Brak szczegółów</p>'}</div>
    `;
    container.appendChild(card);
}
// Nowa funkcja do otwierania pojedynczych ćwiczeń w historii
window.toggleHistoryExercise = function(header) {
    event.stopPropagation(); // Żeby nie zamykało całej karty dnia
    header.parentElement.classList.toggle('open');
};

window.toggleHistoryCard = function(h) { if(event.target.closest('.history-delete-btn')) return; h.parentElement.classList.toggle('open'); }
window.deleteHistoryEntry = function(e, id) { e.stopPropagation(); if(!confirm("Usunąć?")) return; db.collection("users").doc(auth.currentUser.uid).collection("history").doc(id).delete().then(()=>e.target.closest('.history-card').remove()); }

function loadCommunity() {
    const container = document.getElementById("community-list");
    if(!container) return;
    container.innerHTML = '<p style="text-align:center;color:#666">Ładowanie...</p>';
    db.collection("publicUsers").orderBy("totalPoints", "desc").limit(20).get().then(qs => {
        container.innerHTML = "";
        if(qs.empty) {
             container.innerHTML = '<p style="text-align:center;color:#666">Brak nikogo... Bądź pierwszy!</p>';
             return;
        }
        qs.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div');
            card.className = 'user-card';
            // ZMODYFIKOWANE: Wyświetlanie awatara
            card.innerHTML = `
                <div class="user-card-avatar">${d.avatar ? d.avatar : (d.displayName ? d.displayName[0].toUpperCase() : '?')}</div>
                <div class="user-card-name">${escapeHTML(d.displayName)}</div>
                <div class="user-card-stats">
                    <div style="color:#ffd700; font-size:0.8rem; margin-bottom:5px;">${getRankName(d.totalPoints||0)}</div>
                    <div>${d.totalPoints || 0} pkt</div>
                </div>`;
            card.onclick = () => openPublicProfile(d);
            container.appendChild(card);
        });
    }).catch(e => {
        container.innerHTML = `<p style="text-align:center; color:#666;">Błąd pobierania: ${e.message}</p>`;
    });
}
function openPublicProfile(u) {
    viewingUserId = u.uid;
    triggerFeedback('light');
    // ZMODYFIKOWANE: Wyświetlanie awatara w podglądzie
    document.getElementById('pub-avatar').textContent = u.avatar ? u.avatar : (u.displayName ? u.displayName[0].toUpperCase() : '?');
    document.getElementById('pub-name').textContent = u.displayName;
    document.getElementById('pub-total').textContent = u.totalWorkouts;
    document.getElementById('pub-last').textContent = u.lastWorkout || '-';
    document.getElementById('pub-kudos-count').innerHTML = `${u.totalPoints||0} <br><span style='font-size:0.6rem;color:#ffd700'>${getRankName(u.totalPoints||0)}</span>`;
    loadSharedPlansForUser(u.uid); 
    const o = document.getElementById('public-profile-overlay');
    o.classList.remove('hidden'); setTimeout(()=>o.classList.add('active'),10);
}
function closePublicProfile() { viewingUserId=null; const o=document.getElementById('public-profile-overlay'); o.classList.remove('active'); setTimeout(()=>o.classList.add('hidden'),300); }

function loadSharedPlansForUser(targetUid) {
    const container = document.getElementById('public-plans-list');
    container.innerHTML = '<p>Sprawdzam...</p>';
    const currentUser = auth.currentUser;
    const isMyProfile = (currentUser && currentUser.uid === targetUid); 

    db.collection("publicUsers").doc(targetUid).get().then(uDoc => {
        const uData = uDoc.data();
        const pts = uData ? (uData.totalPoints || 0) : 0;
        const rank = getRankName(pts);

        let rankHtml = `<div style="text-align:center; margin-bottom:15px; padding:10px; background:#1a1a1a; border-radius:8px; border:1px solid #333;">
            <div style="color:#888; font-size:0.7rem; letter-spacing:1px;">STANOWISKO</div>
            <div style="color:#ffd700; font-weight:bold; font-size:1.1rem; margin:5px 0;">${rank}</div>
            <div style="color:#666; font-size:0.8rem;">${pts} pkt</div>
        </div>`;

        db.collection("publicUsers").doc(targetUid).collection("sharedPlans").get().then(qs => {
            container.innerHTML = rankHtml;
            if(qs.empty) { container.innerHTML += "<p style='text-align:center;color:#666;font-size:0.8rem;'>Brak planów na szychcie.</p>"; return; }
            qs.forEach(doc => {
                const data = doc.data();
                const planItem = document.createElement('div');
                planItem.className = 'shared-plan-item';
                planItem.style.cssText = 'background:#242426; margin-bottom:10px; padding:10px; border:1px solid #333; border-radius:8px;';
                const exList = data.exercises.map(e => `<div style="color:#ccc; margin-top:6px; padding-left:10px; border-left:2px solid var(--primary-color);"><strong>${escapeHTML(e.exercise)}</strong> <span style="color:#666; font-size:0.8em;">(${e.series}s x ${e.reps}r)</span></div>`).join('');
                
                let btn = '';
                if(isMyProfile) btn = `<button onclick="deleteSharedPlan('${data.dayKey}')" style="float:right;color:red;background:none;border:none;cursor:pointer;"><i class="fa-solid fa-trash"></i></button>`;
                else btn = `<button onclick='startChallenge("${data.dayKey}", ${JSON.stringify(JSON.stringify(data.exercises))}, "${targetUid}")' style="width:100%;margin-top:10px;background:#ffd700;color:black;border:none;padding:8px;font-weight:bold;border-radius:4px;cursor:pointer;">PODEJMIJ WYZWANIE</button>`;

                planItem.innerHTML = `<div style="font-weight:bold; color:white;">${data.dayName}</div>${btn}<div style="margin-top:5px;">${exList}</div>`;
                container.appendChild(planItem);
            });
        });
    });
}
function deleteSharedPlan(k) { if(confirm("Usunąć?")) db.collection("publicUsers").doc(auth.currentUser.uid).collection("sharedPlans").doc(k).delete().then(()=>loadSharedPlansForUser(auth.currentUser.uid)); }
async function shareCurrentDay() {
    triggerFeedback('medium');
    const d = currentSelectedDay;
    if(!confirm("Udostępnić ten dzień?")) return;
    const u = auth.currentUser;
    const s = await db.collection("users").doc(u.uid).collection("days").doc(d).collection("exercises").orderBy("order").get();
    let ex=[]; s.forEach(doc=>ex.push(doc.data()));
    if(ex.length===0) return alert("Pusto!");
    await db.collection("publicUsers").doc(u.uid).collection("sharedPlans").doc(d).set({ dayKey:d, dayName:dayMap[d], exercises:ex });
    alert("Opublikowano na Szychcie!");
}

function openAddModal(){ 
    if(currentSelectedDay === 'challenge') return alert("Tu nie dodajemy ćwiczeń ręcznie!");
    triggerFeedback('light');
    currentModalDay=currentSelectedDay; 
    
    // Resetujemy edycję
    editInfo = { day: null, docId: null };
    document.getElementById('modal-title').textContent = "Dodaj ćwiczenie";
    document.getElementById('modal-exercise').value = "";
    document.getElementById('modal-series').value = "";
    document.getElementById('modal-reps').value = "";
    document.getElementById('modal-weight').value = "";
    document.getElementById('modal-notes').value = "";

    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('hidden'); 
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeAddModal(){ 
    triggerFeedback('light');
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function saveFromModal(){ 
    const ex = document.getElementById('modal-exercise').value; 
    const s = document.getElementById('modal-series').value; 
    const r = document.getElementById('modal-reps').value; 
    const w = document.getElementById('modal-weight').value;
    
    if(!ex) return; 

    triggerFeedback('medium');
    
    const d = {
        exercise: ex,
        series: s,
        reps: r,
        weight: w, 
        notes: document.getElementById('modal-notes').value,
        order: Date.now()
    }; 
    
    const u=auth.currentUser;
    if(editInfo.docId) db.collection("users").doc(u.uid).collection("days").doc(currentModalDay).collection("exercises").doc(editInfo.docId).update(d);
    else db.collection("users").doc(u.uid).collection("days").doc(currentModalDay).collection("exercises").add(d);
    
    closeAddModal(); 
    loadCardsDataFromFirestore(currentModalDay);
}
window.triggerEdit=function(day,id){ 
    triggerFeedback('light');
    editInfo={day,docId:id}; 
    currentModalDay=day; 
    
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(id).get()
    .then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('modal-exercise').value = data.exercise;
            document.getElementById('modal-series').value = data.series;
            document.getElementById('modal-reps').value = data.reps;
            document.getElementById('modal-weight').value = data.weight || "";
            document.getElementById('modal-notes').value = data.notes || "";
            document.getElementById('modal-title').textContent = "Edytuj ćwiczenie";
            
            const modal = document.getElementById('modal-overlay');
            modal.classList.remove('hidden'); 
            setTimeout(()=>modal.classList.add('active'), 10);
        }
    });
}
function deleteCard(d,i){ 
    triggerFeedback('heavy');
    if(confirm("Usunąć?")) db.collection("users").doc(auth.currentUser.uid).collection("days").doc(d).collection("exercises").doc(i).delete().then(()=>loadCardsDataFromFirestore(d)); 
}
function saveMuscleGroups(){ const v=event.target.value; const u=auth.currentUser; db.collection("users").doc(u.uid).collection("days").doc(currentSelectedDay).set({muscleGroup:v},{merge:true}); }
function loadMuscleGroupFromFirestore(d){ db.collection("users").doc(auth.currentUser.uid).collection("days").doc(d).get().then(doc=>{ if(doc.exists) document.getElementById(`${d}-muscle-group`).value=doc.data().muscleGroup||""; }); }

function escapeHTML(str){ if(!str) return ""; return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
async function signIn(){ triggerFeedback('light'); try{ await auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-password').value); }catch(e){alert(e.message);} }
async function signUp(){ triggerFeedback('light'); try{ await auth.createUserWithEmailAndPassword(document.getElementById('register-email').value, document.getElementById('register-password').value); switchAuthTab('login'); alert("Konto założone!"); }catch(e){alert(e.message);} }
async function signOut(){ triggerFeedback('light'); await auth.signOut(); location.reload(); }
async function forceAppUpdate(){ 
    triggerFeedback('light');
    if(!confirm("Aktualizować?")) return; 
    const regs=await navigator.serviceWorker.getRegistrations(); 
    for(let r of regs) r.unregister(); 
    caches.keys().then(k=>k.forEach(c=>caches.delete(c))); 
    location.reload(true); 
}
function giveKudos(){
    triggerFeedback('medium');
    if(!viewingUserId) return;
    const currentUser = auth.currentUser;
    if(viewingUserId === currentUser.uid) return alert("Nie sobie!");
    const interactionRef = db.collection("users").doc(currentUser.uid).collection("givenKudos").doc(viewingUserId);
    interactionRef.get().then(docSnap => {
        if (docSnap.exists && docSnap.data().date === new Date().toISOString().split('T')[0]) return alert("Już przybita!");
        db.batch().update(db.collection("publicUsers").doc(viewingUserId), { totalPoints: firebase.firestore.FieldValue.increment(1) }).set(interactionRef, { date: new Date().toISOString().split('T')[0] }).commit()
        .then(() => alert("Piątka przybita! (+1 pkt dla Hajera)"));
    });
}

function updateUsername() {
    const newName = document.getElementById('new-username').value;
    if(!newName) return;
    const user = auth.currentUser;
    user.updateProfile({ displayName: newName }).then(() => {
        db.collection("publicUsers").doc(user.uid).set({ displayName: newName }, { merge: true });
        updateProfileUI(user);
        alert("Nazwa zmieniona!");
    }).catch(e => alert(e.message));
}

function changePassword() {
    const newPass = document.getElementById('new-password').value;
    if(!newPass) return;
    const user = auth.currentUser;
    user.updatePassword(newPass).then(() => {
        alert("Hasło zmienione!");
    }).catch(e => alert("Zaloguj się ponownie, aby zmienić hasło. " + e.message));
}

async function exportData() {
    const user = auth.currentUser;
    const data = {};
    const daysSnap = await db.collection("users").doc(user.uid).collection("days").get();
    
    // Pobieramy dni równolegle
    await Promise.all(daysSnap.docs.map(async (doc) => {
        const dayKey = doc.id;
        data[dayKey] = { muscleGroup: doc.data().muscleGroup || "", exercises: [] };
        const exSnap = await doc.ref.collection("exercises").orderBy("order").get();
        exSnap.forEach(ex => data[dayKey].exercises.push(ex.data()));
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gympro_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function hardResetProfile() {
    if(!confirm("CZY NA PEWNO?! To usunie WSZYSTKIE Twoje dane, historię i konto. Tego nie da się cofnąć.")) return;
    if(!confirm("Ostateczne potwierdzenie. Usuwam konto?")) return;
    
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).delete().then(() => {
        db.collection("publicUsers").doc(user.uid).delete();
        user.delete().then(() => {
            alert("Konto usunięte. Żegnaj!");
            location.reload();
        });
    });
}

/*************************************************************
  7. OBSŁUGA AWATARÓW (NOWE)
*************************************************************/
const AVATAR_LIST = [
    "💀", "👽", "💪", "🦁", "🦍", "🐺", "🐗", "🦈", 
    "🐂", "🐲", "🤖", "👺", "🤡", "💩", "🤴", "🧙‍♂️",
    "🧛", "🧟", "🏋️", "🥊", "🥋", "⛹️", "🚴", "🤸",
    "🥇", "🏆", "💣", "🧨", "🔨", "⛏️", "⚙️", "☢️"
];

function openAvatarModal() {
    triggerFeedback('light');
    const grid = document.getElementById('avatar-grid-container');
    const modal = document.getElementById('avatar-modal');
    
    // Generowanie siatki tylko raz
    if (grid.children.length === 0) {
        AVATAR_LIST.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'avatar-option'; 
            // Dodajmy trochę stylu inline, jeśli nie ma w CSS
            btn.style.fontSize = "2rem";
            btn.style.background = "none";
            btn.style.border = "1px solid #333";
            btn.style.borderRadius = "8px";
            btn.style.cursor = "pointer";
            btn.style.padding = "10px";
            btn.textContent = emoji;
            btn.onclick = () => saveAvatar(emoji);
            grid.appendChild(btn);
        });
        // Dodaj style grida dynamicznie, jeśli brakuje w CSS
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(60px, 1fr))";
        grid.style.gap = "10px";
    }
    
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeAvatarModal() {
    triggerFeedback('light');
    const modal = document.getElementById('avatar-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function saveAvatar(emoji) {
    const user = auth.currentUser;
    if (!user) return;
    triggerFeedback('medium');

    // Aktualizacja w bazie danych (Publiczny profil)
    db.collection("publicUsers").doc(user.uid).set({
        avatar: emoji
    }, { merge: true }).then(() => {
        // Aktualizacja lokalnego widoku
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) avatarEl.textContent = emoji;
        
        closeAvatarModal();
        alert("Awatar zmieniony!");
    }).catch(e => {
        console.error(e);
        alert("Błąd zapisu: " + e.message);
    });
}

/*************************************************************
  8. INSTALACJA APLIKACJI (PWA) - DODAJ NA KOŃCU
*************************************************************/
let deferredPrompt; // Tu przechowamy "zaproszenie" od przeglądarki

window.addEventListener('beforeinstallprompt', (e) => {
    // 1. Zatrzymujemy domyślne, nudne okienko przeglądarki
    e.preventDefault();
    // 2. Zapisujemy je na później
    deferredPrompt = e;
    // 3. Pokazujemy Twój elegancki baner (z index.html)
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.remove('hidden');
        triggerFeedback('medium'); // Dźwięk, że coś się pojawiło
    }
});

async function installApp() {
    if (!deferredPrompt) return;
    triggerFeedback('light'); // Kliknięcie

    // 1. Pokazujemy natywne okienko "Dodaj do ekranu głównego"
    deferredPrompt.prompt();
    
    // 2. Czekamy na decyzję użytkownika
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Decyzja: ${outcome}`);
    
    // 3. Resetujemy zmienną (można jej użyć tylko raz)
    deferredPrompt = null;
    
    // 4. Ukrywamy baner bez względu na decyzję
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
}

// Gdy aplikacja zostanie pomyślnie zainstalowana
window.addEventListener('appinstalled', () => {
    triggerFeedback('siren'); // Syrena radości - mamy nową apkę!
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
    console.log('Szychta zainstalowana na telefonie!');
});
