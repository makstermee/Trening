/*************************************************************
  ZMIENNE GLOBALNE I KONFIGURACJA
*************************************************************/
// *** TUTAJ WPISZ SWÓJ EMAIL ADMINISTRATORA ***
const ADMIN_EMAILS = ["TWOJ_EMAIL@GMAIL.COM"]; 

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
    thursday: "Czwartek", friday: "Piątek", saturday: "Sobota", sunday: "Niedziela"
};
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

let editInfo = { day: null, docId: null };
let currentModalDay = null;
let timerInterval = null;

let currentMode = 'plan'; 
let currentSelectedDay = 'monday'; 
let viewingUserId = null; 

let tempWorkoutResult = null; 

// USTAWIENIA APLIKACJI (Audio/Haptic)
let appSettings = JSON.parse(localStorage.getItem('gympro_settings')) || { audio: true, haptic: true };

/*************************************************************
  0. SYSTEM AUDIO I HAPTYKI
*************************************************************/
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function triggerFeedback(type) {
    if (appSettings.haptic && navigator.vibrate) {
        if (type === 'light') navigator.vibrate(10);
        if (type === 'medium') navigator.vibrate(40);
        if (type === 'heavy') navigator.vibrate([100, 50, 100]);
        if (type === 'siren') navigator.vibrate([500, 100, 500]);
    }

    if (appSettings.audio) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'light') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } 
        else if (type === 'medium') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
        else if (type === 'siren') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(600, now + 1);
            osc.frequency.linearRampToValueAtTime(300, now + 2);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 2.5);
            osc.start(now);
            osc.stop(now + 2.5);
        }
    }
}

function toggleAppSetting(key) {
    appSettings[key] = !appSettings[key];
    localStorage.setItem('gympro_settings', JSON.stringify(appSettings));
    updateSettingsUI();
    if (appSettings[key]) triggerFeedback(key === 'audio' ? 'medium' : 'light');
}

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
      
      allDays.forEach(day => {
        loadCardsDataFromFirestore(day);
        loadMuscleGroupFromFirestore(day);
      });

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
    triggerFeedback('light');
    sessionStorage.setItem('GEM_saved_mode', mode);
    currentMode = mode;
      
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${mode}'`)) {
            btn.classList.add('active');
        }
    });
    
    const historySection = document.getElementById('history');
    const communitySection = document.getElementById('community');
    const rulesSection = document.getElementById('rules');
    const profileSection = document.getElementById('profile');
    const daysNav = document.getElementById('days-nav-container');
    const fab = document.getElementById('fab-add'); 

    document.querySelectorAll(".day-section").forEach(sec => sec.classList.add("hidden"));
    
    if(fab) {
        fab.style.display = (mode === 'plan') ? 'flex' : 'none';
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
        updateSettingsUI();
    } 
    else {
        if(daysNav) daysNav.style.display = 'block'; 
        showPlanSection(currentSelectedDay);
    }
    updateHeaderTitle();
}

function selectDay(dayValue) {
    triggerFeedback('light');
    sessionStorage.setItem('GEM_saved_day', dayValue);
    currentSelectedDay = dayValue;
    const selector = document.getElementById('day-selector');
    if(selector) selector.value = dayValue; 
    
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    
    const idx = allDays.indexOf(dayValue);
    if (idx !== -1) {
        const pills = document.querySelectorAll('.days-pills .pill');
        if(pills[idx]) pills[idx].classList.add('active');
    }

    const fab = document.getElementById('fab-add');
    if (fab) {
        fab.style.display = (currentMode === 'plan') ? 'flex' : 'none';
    }

    if (currentMode === 'plan') showPlanSection(dayValue);
    else if (currentMode === 'history') {
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
    const timer = document.getElementById('workout-timer');

    if (!titleEl) return;
    
    if (timer && !timer.classList.contains('hidden')) {
        if(shareBtn) shareBtn.classList.add('hidden');
        return; 
    }

    if(shareBtn) shareBtn.classList.add('hidden');

    if (currentMode === 'plan') {
        titleEl.textContent = `Plan: ${polishName}`;
        if(shareBtn) shareBtn.classList.remove('hidden'); 
    }
    else if (currentMode === 'history') titleEl.textContent = `Historia: ${polishName}`;
    else if (currentMode === 'community') titleEl.textContent = `Społeczność`;
    else if (currentMode === 'rules') titleEl.textContent = `Zasady i Rangi`;
    else if (currentMode === 'profile') titleEl.textContent = `Twój Profil`;
}

/*************************************************************
  3. TRENING (SMART DATE LOGIC)
*************************************************************/
function startWorkout(day) {
    triggerFeedback('siren');
    const now = Date.now();
    const workoutData = { day: day, startTime: now };
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    checkActiveWorkout();
    alert("Szychta rozpoczęta! Do roboty 💪");
}

async function finishWorkout(day) {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const timerText = document.getElementById('workout-timer').textContent; 

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

        let muscleName = "";
        const muscleInput = document.getElementById(`${day}-muscle-group`);
        if (muscleInput) muscleName = muscleInput.value;

        const jsDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const todayIndex = new Date().getDay();
        const actualDayKey = jsDays[todayIndex];

        tempWorkoutResult = {
            dateIso: new Date().toISOString(),
            duration: timerText,
            dayKey: actualDayKey, 
            originalPlanKey: day, 
            details: exercisesDone,
            workoutName: muscleName || `Plan: ${dayMap[day]}` 
        };

        triggerFeedback('siren'); 

        await saveHistoryAndPoints(2); 
        alert(`Fajrant! Trening zapisany w dniu: ${dayMap[actualDayKey]}`);
        localStorage.removeItem('activeWorkout');
        window.location.reload();

    } catch (e) {
        console.error(e);
        alert("BŁĄD ZAPISU: " + e.message);
    }
}

async function saveHistoryAndPoints(myPoints) {
    const user = auth.currentUser;
    const result = tempWorkoutResult;
    const batch = db.batch();

    const historyRef = db.collection("users").doc(user.uid).collection("history").doc();

    batch.set(historyRef, {
        ...result,
        dayName: dayMap[result.dayKey], 
        workoutName: result.workoutName,
        pointsEarned: myPoints
    });

    const myPublicRef = db.collection("publicUsers").doc(user.uid);
    batch.set(myPublicRef, {
        totalPoints: firebase.firestore.FieldValue.increment(myPoints),
        lastWorkout: new Date().toISOString()
    }, { merge: true });

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
}
function closeNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function checkNotificationsCount() {
    const badge = document.getElementById('profile-notif-badge');
    if(badge) badge.style.display = 'none';
}

/*************************************************************
  6. FUNKCJE POMOCNICZE UI (POPRAWIONE ZWIJANIE KART)
*************************************************************/
function checkActiveWorkout() {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const titleEl = document.getElementById('current-day-display');
    const timerEl = document.getElementById('workout-timer');
    const shareBtn = document.getElementById('btn-share-day');
    const nav = document.getElementById('days-nav-container');

    if (activeData) {
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
        container.innerHTML = `<button class="btn-start-workout" onclick="startWorkout('${currentViewDay}')"><i class="fa-solid fa-play"></i> START TRENINGU</button>`;
    } 
    else if (activeData && activeData.day !== currentViewDay) {
        container.innerHTML = `<p style="text-align:center; color:#666;">Trening trwa w: ${dayMap[activeData.day]}</p>`;
    }
}

function addLog(day, docId) {
    const w = document.getElementById(`log-w-${docId}`).value;
    const r = document.getElementById(`log-r-${docId}`).value;
    if (!w || !r) return;
    
    triggerFeedback('medium'); 

    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
      .update({ currentLogs: firebase.firestore.FieldValue.arrayUnion({ weight: w, reps: r, id: Date.now() }) }) 
      .then(() => loadCardsDataFromFirestore(day, docId)); // <--- PRZEKAZUJEMY docId
}

function removeLog(day, docId, w, r, lid) {
    triggerFeedback('light');
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
      .update({ currentLogs: firebase.firestore.FieldValue.arrayRemove({ weight: w, reps: r, id: Number(lid) }) })
      .then(() => loadCardsDataFromFirestore(day, docId)); // <--- PRZEKAZUJEMY docId
}

// Funkcja ładowania kart przyjmuje teraz opcjonalne ID karty, która ma być otwarta
function loadCardsDataFromFirestore(day, openCardId = null) {
    const container = document.getElementById(`${day}-cards`);
    if(!container) return;

    const user = auth.currentUser;
    if(!user) return;
    
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").orderBy("order", "asc").get()
    .then(qs => {
        container.innerHTML = ""; 
        if(qs.empty) return;
        // Przekazujemy openCardId dalej do funkcji renderującej
        qs.forEach(doc => renderAccordionCard(container, day, doc, openCardId));
    });
}

function renderAccordionCard(container, day, doc, openCardId) {
    const data = doc.data();
    const id = doc.id;
    const logs = data.currentLogs || []; 
    
    const card = document.createElement('div');
    card.className = 'exercise-card';
    
    // Jeśli ID tej karty zgadza się z ID ostatnio edytowanej, dodajemy klasę 'open'
    if (id === openCardId) {
        card.classList.add('open');
    }
    
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
    
    // POKAŻ PRZYCISK ADMINA JEŚLI USER JEST NA LIŚCIE
    const adminBtn = document.getElementById('btn-admin-panel');
    if (adminBtn) {
        if (ADMIN_EMAILS.includes(user.email)) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
    }
}

function loadProfileStats() {
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("history").orderBy("dateIso", "desc").get().then(qs => {
        const total = qs.size;
        let last = '-';
        if(!qs.empty) {
            const latestDoc = qs.docs[0].data();
            last = latestDoc.dateIso ? latestDoc.dateIso.split('T')[0] : latestDoc.displayDate;
        }
        
        const totEl = document.getElementById('total-workouts');
        const lastEl = document.getElementById('last-workout-date');
        if(totEl) totEl.textContent = total;
        if(lastEl) lastEl.textContent = last;
        
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

        let currentMonth = "";
        docs.forEach(item => {
             const date = new Date(item.data.dateIso);
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
    card.className = `history-card`;
    
    let detailsHtml = '';
    if (data.details && Array.isArray(data.details)) {
        detailsHtml = data.details.map(ex => {
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
                <h4>${escapeHTML(data.workoutName || data.dayName || 'Trening')}</h4>
                <div class="history-meta">
                    <span>${data.dateIso.split('T')[0]} (${data.dayName})</span>
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

window.toggleHistoryExercise = function(header) {
    event.stopPropagation();
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
            if(qs.empty) { container.innerHTML += "<p style='text-align:center;color:#666;font-size:0.8rem;'>Brak planów.</p>"; return; }
            qs.forEach(doc => {
                const data = doc.data();
                const planItem = document.createElement('div');
                planItem.className = 'shared-plan-item';
                planItem.style.cssText = 'background:#242426; margin-bottom:10px; padding:10px; border:1px solid #333; border-radius:8px;';
                const exList = data.exercises.map(e => `<div style="color:#ccc; margin-top:6px; padding-left:10px; border-left:2px solid var(--primary-color);"><strong>${escapeHTML(e.exercise)}</strong> <span style="color:#666; font-size:0.8em;">(${e.series}s x ${e.reps}r)</span></div>`).join('');
                
                let btn = '';
                if(isMyProfile) btn = `<button onclick="deleteSharedPlan('${data.dayKey}')" style="float:right;color:red;background:none;border:none;cursor:pointer;"><i class="fa-solid fa-trash"></i></button>`;
                
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
    alert("Opublikowano!");
}

function openAddModal(){ 
    triggerFeedback('light');
    currentModalDay=currentSelectedDay; 
    
    // Resetujemy edycję
    editInfo = { day: null, docId: null };
    document.getElementById('modal-title').textContent = "Dodaj ćwiczenie";
    document.getElementById('modal-exercise').value = data.exercise || "";
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

// --- REJESTRACJA Z CHECKBOXEM ---
async function signUp(){ 
    triggerFeedback('light'); 
    
    const email = document.getElementById('register-email').value;
    const pass = document.getElementById('register-password').value;
    const terms = document.getElementById('terms-check').checked; // Sprawdzamy czy zaznaczono

    if(!email || !pass) return alert("Podaj e-mail i hasło.");
    
    // Walidacja Regulaminu
    if(!terms) {
        triggerFeedback('heavy'); 
        return alert("Musisz zaakceptować Regulamin, aby założyć konto.");
    }

    try{ 
        await auth.createUserWithEmailAndPassword(email, pass); 
        switchAuthTab('login'); 
        alert("Konto założone! Możesz się zalogować."); 
    } catch(e){
        alert("Błąd: " + e.message);
    } 
}

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
  7. OBSŁUGA AWATARÓW
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
    
    if (grid.children.length === 0) {
        AVATAR_LIST.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'avatar-option'; 
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

    db.collection("publicUsers").doc(user.uid).set({
        avatar: emoji
    }, { merge: true }).then(() => {
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
  8. INSTALACJA APLIKACJI (PWA)
*************************************************************/
let deferredPrompt; 

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.remove('hidden');
        triggerFeedback('medium'); 
    }
});

async function installApp() {
    if (!deferredPrompt) return;
    triggerFeedback('light'); 

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Decyzja: ${outcome}`);
    deferredPrompt = null;
    
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
}

window.addEventListener('appinstalled', () => {
    triggerFeedback('siren'); 
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
    console.log('Szychta zainstalowana na telefonie!');
});

// --- RESET HASŁA I REGULAMIN ---

function resetPasswordLogic() {
    triggerFeedback('light');
    const email = document.getElementById('login-email').value;
    
    if (!email) {
        triggerFeedback('medium');
        return alert("Wpisz swój adres e-mail w polu logowania, a potem kliknij 'Zapomniałeś hasła?', abyśmy wiedzieli, gdzie wysłać link.");
    }

    if (!confirm(`Wysłać link do resetowania hasła na adres: ${email}?`)) return;

    auth.sendPasswordResetEmail(email)
        .then(() => {
            triggerFeedback('medium'); 
            alert("E-mail wysłany! Sprawdź skrzynkę (również SPAM).");
        })
        .catch((error) => {
            triggerFeedback('heavy');
            alert("Błąd: " + error.message);
        });
}

function openTermsModal() {
    triggerFeedback('light');
    const modal = document.getElementById('terms-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeTermsModal() {
    triggerFeedback('light');
    const modal = document.getElementById('terms-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

/*************************************************************
  9. ADMIN PANEL LOGIC
*************************************************************/
function openAdminModal() {
    triggerFeedback('light');
    const modal = document.getElementById('admin-modal');
    const content = document.getElementById('admin-content-area');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
    
    content.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Ładowanie górników...</p>';
    loadAdminUsers();
}

function closeAdminModal() {
    triggerFeedback('light');
    const modal = document.getElementById('admin-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function loadAdminUsers() {
    const container = document.getElementById('admin-content-area');
    db.collection("publicUsers").orderBy("totalPoints", "desc").get().then(qs => {
        let html = '<div style="padding:15px;">';
        qs.forEach(doc => {
            const u = doc.data();
            html += `
            <div class="admin-user-row">
                <div class="admin-user-info">
                    <div style="font-size:1.2rem;">${u.avatar || '?'}</div>
                    <div>
                        <div style="font-weight:bold; color:white;">${u.displayName}</div>
                        <div style="font-size:0.75rem; color:#888;">${u.email}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#ffd700; font-weight:bold;">${u.totalPoints} pkt</div>
                    <button onclick="openUserInspection('${u.uid}')" style="background:#333; border:1px solid #555; color:white; padding:4px 8px; border-radius:4px; margin-top:4px; font-size:0.7rem;">EDYTUJ</button>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    });
}

function openUserInspection(targetUid) {
    triggerFeedback('light');
    const container = document.getElementById('admin-content-area');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Pobieranie akt...</p>';

    db.collection("publicUsers").doc(targetUid).get().then(uDoc => {
        const user = uDoc.data();
        
        // ZMIANA: Dodano .catch() dla obsługi błędów uprawnień
        db.collection("users").doc(targetUid).collection("history")
            .orderBy("dateIso", "desc").limit(10).get()
            .then(hQs => {
                let historyHtml = '';
                if(hQs.empty) historyHtml = '<p style="color:#666; font-size:0.8rem;">Brak historii treningów.</p>';
                else {
                    hQs.forEach(h => {
                        const hd = h.data();
                        historyHtml += `
                        <div class="admin-history-item">
                            <span style="color:white;">${hd.dateIso.split('T')[0]}</span>
                            <span style="color:#aaa;">${hd.duration}</span>
                            <span style="color:var(--primary-color);">${hd.workoutName || 'Trening'}</span>
                        </div>`;
                    });
                }
                renderInspectionView(container, user, targetUid, historyHtml);
            })
            .catch(error => {
                console.error(error);
                const errorHtml = `
                    <div style="padding:20px; text-align:center; color:red; border:1px dashed red; border-radius:8px;">
                        <i class="fa-solid fa-lock" style="font-size:1.5rem; margin-bottom:10px;"></i><br>
                        Brak dostępu do historii.<br>
                        <span style="font-size:0.7rem; color:#aaa;">(Wymagana zmiana reguł Firestore)</span>
                    </div>`;
                renderInspectionView(container, user, targetUid, errorHtml);
            });
    });
}

function renderInspectionView(container, user, targetUid, historyContent) {
    container.innerHTML = `
        <div style="padding:15px;">
            <button onclick="loadAdminUsers()" style="margin-bottom:15px; background:none; border:none; color:#aaa;"><i class="fa-solid fa-arrow-left"></i> Wróć do listy</button>
            
            <div style="text-align:center; margin-bottom:20px;">
                <div style="font-size:3rem;">${user.avatar || '?'}</div>
                <h2 style="margin:5px 0;">${user.displayName}</h2>
                <p style="color:#666; font-size:0.8rem;">${user.email}</p>
            </div>

            <div style="background:#222; padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid #444;">
                <label style="color:#888; font-size:0.8rem;">PUNKTY (Aktualnie: ${user.totalPoints})</label>
                <div style="display:flex; gap:10px; margin-top:5px;">
                    <input type="number" id="admin-new-points" value="${user.totalPoints}" style="flex:1; background:black; border:1px solid #555; color:white; padding:10px; border-radius:8px;">
                    <button onclick="saveUserPoints('${targetUid}')" style="background:var(--accent-color); color:black; border:none; padding:0 20px; border-radius:8px; font-weight:bold;">ZAPISZ</button>
                </div>
            </div>

            <h4 style="color:#888; margin-bottom:10px;">OSTATNIE TRENINGI:</h4>
            ${historyContent}
        </div>
    `;
}

function saveUserPoints(targetUid) {
    const newPts = parseInt(document.getElementById('admin-new-points').value);
    if(isNaN(newPts)) return alert("Błąd liczby");
    
    triggerFeedback('medium');
    db.collection("publicUsers").doc(targetUid).update({ totalPoints: newPts }).then(() => {
        alert("Punkty zaktualizowane!");
    });
}
