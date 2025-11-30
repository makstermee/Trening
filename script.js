/*************************************************************
  ZMIENNE GLOBALNE I KONFIGURACJA
*************************************************************/
// 1. WPISZ SWÓJ EMAIL ADMINA (Dla korony 👑)
const ADMIN_EMAIL = "michalnowicki000@gmail.com"; 

const firebaseConfig = {
  apiKey: "AIzaSyDNt_K6lkFKHZeFXyBMLOpePge967aAEh8",
  authDomain: "plan-treningowy-a9d00.firebaseapp.com",
  projectId: "plan-treningowy-a9d00",
  storageBucket: "plan-treningowy-a9d00.firebasestorage.app",
  messagingSenderId: "1087845341451",
  appId: "1:1087845341451:web:08201e588c56d73013aa0e",
  measurementId: "G-EY88TE8L7H"
};

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

// --- LISTA 52 WYZWAŃ NA CAŁY ROK ---
const YEARLY_CHALLENGES = [
    { title: "Wulkan Nóg", desc: "Zrób łącznie 100 przysiadów (bez ciężaru) w jak najkrótszym czasie.", icon: "🌋" },
    { title: "Żelazny Uchwyt", desc: "Zwis na drążku na maksa. Minimum 60 sekund w jednej serii.", icon: "✊" },
    { title: "Klub 1000kg", desc: "Podczas jednego treningu przerzuć łącznie 1000 kg (serie x powt x ciężar).", icon: "⚖️" },
    { title: "Bieg Sztygara", desc: "Przebiegnij 3 km na bieżni lub w terenie w tempie poniżej 6:00 min/km.", icon: "🏃" },
    { title: "Pompki Górnicze", desc: "Zrób 30 pompek klasycznych w jednej serii. Technika ważniejsza niż tempo!", icon: "💪" },
    { title: "Plank Morderca", desc: "Utrzymaj deskę (plank) przez 2 minuty bez przerwy.", icon: "🪵" },
    { title: "Schody do Nieba", desc: "Wejdź na 100 pięter (na maszynie schodowej) lub zrób 200 wejść na skrzynię.", icon: "🪜" },
    { title: "Wiosłowanie", desc: "Przepłyń 500m na ergometrze wioślarskim poniżej 2 minut.", icon: "🚣" },
    { title: "Bicepsy ze Stali", desc: "Zrób łącznie 50 powtórzeń uginania ramion ze sztangą (pusty gryf 20kg).", icon: "🦾" },
    { title: "Burpee Challenge", desc: "Wykonaj 50 burpees w jak najkrótszym czasie.", icon: "🥵" },
    { title: "Wyciskanie Własne", desc: "Wyciśnij na klatę równowartość swojej wagi ciała (przynajmniej 1 raz).", icon: "🏋️" },
    { title: "Przysiad z Pauzą", desc: "Zrób przysiad z 3-sekundową pauzą na dole. 5 serii po 5 powtórzeń.", icon: "⏸️" },
    { title: "Martwy Ciąg x10", desc: "Wykonaj serię Martwego Ciągu z ciężarem 100kg na 10 powtórzeń.", icon: "💀" },
    { title: "Pajacyki", desc: "Zrób 200 pajacyków bez zatrzymania na rozgrzewkę.", icon: "🤸" },
    { title: "Wykroki Śmierci", desc: "Przejdź 50 metrów wykrokami z hantlami w rękach (spacer farmera).", icon: "🚶" },
    { title: "Podciąganie", desc: "Podciągnij się na drążku nachwytem 5 razy (pełny zakres).", icon: "🆙" },
    { title: "Dipy", desc: "Wykonaj 15 pompek na poręczach (dipy) w jednej serii.", icon: "👐" },
    { title: "Skakanka", desc: "Skacz na skakance przez 3 minuty bez skuchy.", icon: "🪢" },
    { title: "Brzuszki", desc: "Zrób 50 brzuszków w 2 minuty.", icon: "🍫" },
    { title: "Łydki ze Skały", desc: "Wspięcia na palce: 4 serie po 25 powtórzeń.", icon: "⛰️" },
    { title: "Interwały", desc: "Bieżnia: 30 sekund sprintu / 30 sekund marszu. Powtórz 10 razy.", icon: "⚡" },
    { title: "Wyciskanie Żołnierskie", desc: "Wyciśnij nad głowę (OHP) połowę swojej wagi ciała (x5).", icon: "🪖" },
    { title: "Box Jump", desc: "Wskocz na skrzynię (ok. 60cm) 30 razy.", icon: "📦" },
    { title: "Kettlebell Swing", desc: "Zrób 50 wymachów kettlem (min. 16kg) w jednej serii.", icon: "🔔" },
    { title: "Wall Sit", desc: "Krzesełko przy ścianie – wytrzymaj 2.5 minuty.", icon: "🪑" },
    { title: "Spacer Farmera", desc: "Przejdź 100m trzymając w rękach najcięższe hantle jakie znajdziesz.", icon: "🚜" },
    { title: "Bieg 10k", desc: "Przebiegnij 10 kilometrów w dowolnym czasie (może być w terenie).", icon: "🌲" },
    { title: "Triceps Piekło", desc: "Pompki diamentowe: Zrób tyle ile dasz radę (min. 15).", icon: "💎" },
    { title: "Rowerek", desc: "Przejedź 10km na rowerku stacjonarnym w max 20 minut.", icon: "🚴" },
    { title: "Przysiad Bułgarski", desc: "Zrób po 15 przysiadów bułgarskich na każdą nogę (bez ciężaru).", icon: "🇧🇬" },
    { title: "Tureckie Wstawanie", desc: "Zrób 5 pełnych powtórzeń TGU (Turkish Get Up) na stronę.", icon: "🇹🇷" },
    { title: "Pompki na rękach", desc: "Spróbuj zrobić pompkę w staniu na rękach (przy ścianie).", icon: "🤸‍♂️" },
    { title: "Wyciskanie Wąskie", desc: "Wyciskanie sztangi wąskim chwytem – 20 powtórzeń (pusty gryf).", icon: "📏" },
    { title: "L-Sit", desc: "Utrzymaj L-Sit na poręczach lub podłodze przez 15 sekund.", icon: "📐" },
    { title: "Muscle Up", desc: "Spróbuj wykonać Muscle Up (lub 10 wysokich podciągnięć).", icon: "🚀" },
    { title: "Przysiad Przedni", desc: "Front Squat: 5 serii po 5 powtórzeń (technika!).", icon: "🏋️‍♂️" },
    { title: "Hip Thrust", desc: "Wypychanie bioder: 3 serie po 12 powtórzeń z solidnym ciężarem.", icon: "🍑" },
    { title: "Arnoldki", desc: "Wyciskanie hantli sposobem Arnolda: 4 serie po 10 powtórzeń.", icon: "🤖" },
    { title: "Deska Bokiem", desc: "Side Plank: Wytrzymaj po 60 sekund na każdą stronę.", icon: "📐" },
    { title: "Skoki na skakance", desc: "Zrób 100 'podwójnych skoków' (Double Unders) lub 300 zwykłych.", icon: "🐇" },
    { title: "Wioślarz 2k", desc: "Przepłyń 2000m na ergometrze w czasie poniżej 9 minut.", icon: "🌊" },
    { title: "Bieg Interwałowy", desc: "400m sprintu, 2 min odpoczynku. Powtórz 4 razy.", icon: "🏁" },
    { title: "Wyciskanie Hantli", desc: "Wyciskanie hantli na ławce skośnej: 4 serie po 12 powtórzeń.", icon: "↗️" },
    { title: "Rozpiętki", desc: "Rozpiętki na maszynie lub hantlami: 100 powtórzeń łącznie.", icon: "🦋" },
    { title: "Face Pull", desc: "Przyciąganie linki do twarzy: 4 serie po 15 powtórzeń (zdrowe barki!).", icon: "👺" },
    { title: "Goblet Squat", desc: "Przysiad z hantlem przy klatce: 4 serie po 15 powtórzeń.", icon: "🏆" },
    { title: "Russian Twist", desc: "Skręty tułowia z ciężarem: 50 powtórzeń (łącznie).", icon: "🇷🇺" },
    { title: "Supermen", desc: "Leżąc na brzuchu unoś ręce i nogi. Wytrzymaj w górze 3 sekundy x 20.", icon: "🦸" },
    { title: "Wspięcia Siedząc", desc: "Wspięcia na łydki siedząc (maszyna lub sztanga na kolanach): 50 powt.", icon: "🪑" },
    { title: "Zwis na jednej ręce", desc: "Spróbuj wisieć na drążku na jednej ręce (min. 5 sek na stronę).", icon: "🐒" },
    { title: "Legenda Kopalni", desc: "Zrób trening trwający bite 2 godziny (bez siedzenia na telefonie!).", icon: "⌛" },
    { title: "Maksymilian", desc: "Sprawdź swojego maxa (1RM) w wybranym boju (Klatka/Przysiad/Martwy).", icon: "🥇" }
];

// AWATARY (Korona na końcu)
const AVATARS = [
    "👷", "⛑️", "🏋️", "🤸", "🤺", "🤼", "🦍", "🐂", 
    "🐗", "🤖", "💀", "👹", "👺", "👽", "👾", "👑"
];

let editInfo = { day: null, docId: null };
let currentModalDay = null;
let timerInterval = null;

let currentMode = 'plan'; 
let currentSelectedDay = 'monday'; 
let viewingUserId = null; 

// Zmienne do obsługi wyzwań
let tempWorkoutResult = null; 
let currentRatingScore = 0;   

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
      // Ładowanie Szychty (zawsze, na wypadek odświeżenia)
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

// ALGORYTM WYZWANIA TYGODNIA
function getWeeklyChallenge() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const weekNumber = Math.ceil(dayOfYear / 7); 
    const index = (weekNumber - 1) % YEARLY_CHALLENGES.length;
    return YEARLY_CHALLENGES[index];
}

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
    sessionStorage.setItem('GEM_saved_mode', mode);
    currentMode = mode;

    // Aktualizacja podświetlenia ikon
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
    
    // Ukrywanie przycisku PLUS
    if(fab) {
        fab.style.display = (mode === 'plan' && currentSelectedDay !== 'challenge') ? 'flex' : 'none';
    }

    if (mode === 'history' && historySection) {
        historySection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'block'; 
        loadHistoryFromFirestore(currentSelectedDay); // Filtruj po wybranym dniu
    } 
    else if (mode === 'community' && communitySection) {
        communitySection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
        loadCommunity(); // Ładuje kartę wyzwania
    } 
    else if (mode === 'rules' && rulesSection) {
        rulesSection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
    } 
    else if (mode === 'profile' && profileSection) {
        profileSection.classList.remove('hidden');
        if(daysNav) daysNav.style.display = 'none'; 
        loadProfileStats(); 
    } 
    else {
        // Domyślnie PLAN
        if(daysNav) daysNav.style.display = 'block'; 
        showPlanSection(currentSelectedDay);
    }
    updateHeaderTitle();
}

function selectDay(dayValue) {
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

    // Ukrywanie Plusa w Szychcie
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
    const now = Date.now();
    const workoutData = { day: day, startTime: now, isChallenge: false };
    localStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    checkActiveWorkout();
    alert("Szychta rozpoczęta! Do roboty 💪");
}

// --- AKCEPTACJA WYZWANIA ---
function acceptWeeklyChallenge() {
    const challenge = getWeeklyChallenge();
    const todayIndex = new Date().getDay();
    const jsDayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDay = jsDayMap[todayIndex]; 
    
    const user = auth.currentUser;
    if(!user) return;

    if(!confirm(`Dodać wyzwanie "${challenge.title}" do Twojego planu na DZIŚ?`)) return;

    db.collection("users").doc(user.uid).collection("days").doc(targetDay).collection("exercises").add({
        exercise: `🏆 ${challenge.title}`,
        series: 1,
        reps: 1,
        weight: 0,
        notes: challenge.desc,
        order: -1 
    }).then(() => {
        alert(`Wyzwanie dodane do: ${dayMap[targetDay]}! Powodzenia.`);
        switchMode('plan');
        selectDay(targetDay);
    });
}

// Pusta funkcja dla kompatybilności
async function surrenderChallenge() {}

async function finishWorkout(day) {
    const activeData = JSON.parse(localStorage.getItem('activeWorkout'));
    const isChallenge = activeData && activeData.isChallenge;

    const timerText = document.getElementById('workout-timer').textContent; 
    const parts = timerText.split(':');
    const totalMinutes = (parseInt(parts[0]) * 60) + parseInt(parts[1]);

    if (isChallenge && totalMinutes < 10) {
        return alert(`Za krótko, chopie! Szychta musi trwać minimum 10 minut.`);
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
            workoutName: muscleName 
        };

        if (isChallenge) {
            openChallengeEndModal(); 
        } else {
            await saveHistoryAndPoints(2, null, 0, tempWorkoutResult); 
            alert("Fajrant! Trening zapisany (+2 pkt).");
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
    // Stary modal oceny (zostawiamy pusty lub można usunąć, jeśli nie używamy)
    // W nowym systemie nie ma oceny, więc od razu kończymy
}

function selectRating(score, btn) {}
function showDaySelectorForSave() {}
function finalizeChallenge() {}

async function saveHistoryAndPoints(myPoints, authorId, ratingPoints, resultData) {
    const user = auth.currentUser;
    const batch = db.batch();

    const historyRef = db.collection("users").doc(user.uid).collection("history").doc();
    let authorName = "Nieznany";
    if (authorId) {
        const authorSnap = await db.collection("publicUsers").doc(authorId).get();
        if(authorSnap.exists) authorName = authorSnap.data().displayName;
    }

    batch.set(historyRef, {
        ...resultData,
        dayName: dayMap[resultData.dayKey],
        // Jeśli workoutName jest pusty, użyj dayName
        workoutName: resultData.workoutName || dayMap[resultData.dayKey],
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
  5. SPOŁECZNOŚĆ I AWATARY
*************************************************************/
function loadCommunity() {
    const container = document.getElementById("community-list");
    if(!container) return;
    
    const challenge = getWeeklyChallenge();
    const challengeHTML = `
        <div class="weekly-challenge-card">
            <div class="wc-badge">WYZWANIE TYGODNIA</div>
            <div style="font-size: 3rem;">${challenge.icon}</div>
            <h3 class="wc-title">${challenge.title}</h3>
            <p class="wc-desc">${challenge.desc}</p>
            <button class="btn-accept-challenge" onclick="acceptWeeklyChallenge()">PODEJMIJ</button>
        </div>
    `;

    container.innerHTML = challengeHTML + '<p style="text-align:center;color:#666; margin-top:20px;">Ładowanie górników...</p>';
    
    db.collection("publicUsers").orderBy("totalPoints", "desc").limit(20).get().then(qs => {
        const usersContainer = document.createElement('div');
        usersContainer.className = 'community-grid';
        
        if(qs.empty) {
             usersContainer.innerHTML = '<p style="text-align:center;color:#666">Brak nikogo...</p>';
        }
        qs.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div');
            card.className = 'user-card';
            
            let avatarContent = d.displayName ? d.displayName[0].toUpperCase() : '?';
            if (d.avatar) avatarContent = d.avatar;

            card.innerHTML = `
                <div class="user-card-avatar">${avatarContent}</div>
                <div class="user-card-name">${escapeHTML(d.displayName)}</div>
                <div class="user-card-stats">
                    <div style="color:#ffd700; font-size:0.8rem; margin-bottom:5px;">${getRankName(d.totalPoints||0)}</div>
                    <div>${d.totalPoints || 0} pkt</div>
                </div>`;
            card.onclick = () => openPublicProfile(d);
            usersContainer.appendChild(card);
        });
        container.appendChild(usersContainer);
    }).catch(e => {
        container.innerHTML += `<p style="text-align:center; color:#666;">Błąd pobierania: ${e.message}</p>`;
    });
}

function openAvatarModal() {
    const user = auth.currentUser;
    const container = document.getElementById('avatar-grid-container');
    container.innerHTML = '';

    AVATARS.forEach(avatar => {
        if (avatar === '👑' && user.email !== ADMIN_EMAIL) return;
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.textContent = avatar;
        div.onclick = () => saveAvatar(avatar);
        container.appendChild(div);
    });

    const modal = document.getElementById('avatar-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeAvatarModal() {
    const modal = document.getElementById('avatar-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function saveAvatar(symbol) {
    const user = auth.currentUser;
    db.collection("publicUsers").doc(user.uid).set({
        avatar: symbol
    }, { merge: true }).then(() => {
        updateProfileUI(user);
        closeAvatarModal();
    });
}

function openPublicProfile(u) {
    viewingUserId = u.uid;
    const avatarEl = document.getElementById('pub-avatar');
    if (u.avatar) {
        avatarEl.textContent = u.avatar;
        avatarEl.style.fontSize = "3rem";
    } else {
        avatarEl.textContent = u.displayName ? u.displayName[0].toUpperCase() : '?';
        avatarEl.style.fontSize = "2.5rem";
    }
    document.getElementById('pub-name').textContent = u.displayName;
    document.getElementById('pub-total').textContent = u.totalWorkouts;
    document.getElementById('pub-last').textContent = u.lastWorkout || '-';
    document.getElementById('pub-kudos-count').innerHTML = `${u.totalPoints||0} <br><span style='font-size:0.6rem;color:#ffd700'>${getRankName(u.totalPoints||0)}</span>`;
    
    document.getElementById('public-plans-list').innerHTML = "<p style='text-align:center; color:#666; font-size:0.8rem;'>Wyzwania znajdziesz na tablicy głównej.</p>";
    
    const o = document.getElementById('public-profile-overlay');
    o.classList.remove('hidden'); setTimeout(()=>o.classList.add('active'),10);
}
function closePublicProfile() { viewingUserId=null; const o=document.getElementById('public-profile-overlay'); o.classList.remove('active'); setTimeout(()=>o.classList.add('hidden'),300); }

// Puste funkcje starego systemu
function openNotificationsModal() { alert("Powiadomienia wkrótce!"); }
function closeNotificationsModal() {}
function switchNotifTab(t){}
function checkNotificationsCount(){}
function shareCurrentDay() { alert("Użyj Wyzwania Tygodnia w Społeczności!"); }

/*************************************************************
  6. FUNKCJE POMOCNICZE UI (Logi, Karty, Auth)
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
        // Stara logika szychty - ignorujemy
        if (activeData.day === 'challenge') {} 
        
        updateActionButtons(activeData.day);
    } else {
        if(titleEl) titleEl.style.display = 'block';
        if(shareBtn) shareBtn.style.display = ''; 
        if(timerEl) timerEl.classList.add('hidden');
        if (timerInterval) clearInterval(timerInterval);
        
        if(nav) {
            if (currentMode === 'plan' || currentMode === 'history') nav.style.display = 'block';
            else nav.style.display = 'none';
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
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId)
      .update({ currentLogs: firebase.firestore.FieldValue.arrayUnion({ weight: w, reps: r, id: Date.now() }) }) 
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
    
    // Lista serii (Tabela)
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
                    <input type="number" id="log-w-${id}" placeholder="kg" value="${data.weight || ''}">
                    <input type="number" id="log-r-${id}" placeholder="powt." value="${data.reps || ''}">
                    <button class="btn-add-log" onclick="addLog('${day}', '${id}')">
                        <i class="fa-solid fa-plus"></i>
                    </button>
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

window.toggleCard = function(h) { 
    if(event.target.closest('input') || event.target.closest('button') || event.target.closest('.log-delete-btn')) return;
    h.parentElement.classList.toggle('open'); 
};

function updateProfileUI(user) {
    const emailEl = document.getElementById('profile-email');
    const avatarEl = document.getElementById('profile-avatar');
    if(emailEl) emailEl.textContent = user.displayName || user.email;

    db.collection("publicUsers").doc(user.uid).get().then(doc => {
        if(doc.exists) {
            const d = doc.data();
            if(d.avatar) {
                avatarEl.textContent = d.avatar; 
                avatarEl.style.fontSize = "3rem"; 
            } else {
                avatarEl.textContent = (user.email ? user.email[0] : 'U').toUpperCase();
                avatarEl.style.fontSize = "2.5rem";
            }
        }
    });
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
    db.collection("publicUsers").doc(user.uid).set({
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        totalWorkouts: total,
        lastWorkout: last,
        totalPoints: pts || 0,
        uid: user.uid
    }, { merge: true });
}

// --- NOWA HISTORIA (Grupowanie + Podwójny Akordeon) ---
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
    card.className = `history-card ${data.isChallenge ? 'gold-border' : ''}`;
    
    let authorHtml = '';
    if (data.isChallenge && data.originalAuthorName) {
        authorHtml = `<div class="challenge-author-info"><i class="fa-solid fa-crown"></i> Plan od: ${escapeHTML(data.originalAuthorName)} (+${data.pointsEarned||0} pkt)</div>`;
    }

    // Pobieranie tytułu (nazwa partii lub dzień)
    const titleToShow = data.workoutName ? data.workoutName : (data.dayName || 'Trening');

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
            
            // Podwójny akordeon (nagłówek + tabela)
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
                <h4>${escapeHTML(titleToShow)}</h4>
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

// Nowa funkcja do otwierania ćwiczeń w historii
window.toggleHistoryExercise = function(header) {
    event.stopPropagation(); 
    header.parentElement.classList.toggle('open');
};

window.toggleHistoryCard = function(h) { if(event.target.closest('.history-delete-btn')) return; h.parentElement.classList.toggle('open'); }
window.deleteHistoryEntry = function(e, id) { e.stopPropagation(); if(!confirm("Usunąć?")) return; db.collection("users").doc(auth.currentUser.uid).collection("history").doc(id).delete().then(()=>e.target.closest('.history-card').remove()); }

// --- FUNKCJE EDYCJI I ZAPISU ---
function openAddModal(){ 
    if(currentSelectedDay === 'challenge') return alert("Tu nie dodajemy ćwiczeń ręcznie!");
    currentModalDay=currentSelectedDay; 
    
    // Reset edycji = czyste okno
    editInfo = { day: null, docId: null };
    document.getElementById('modal-title').textContent = "Dodaj ćwiczenie";
    document.getElementById('modal-exercise').value = "";
    document.getElementById('modal-series').value = "";
    document.getElementById('modal-reps').value = "";
    document.getElementById('modal-weight').value = "";
    document.getElementById('modal-notes').value = "";

    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('hidden'); 
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeAddModal(){ 
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function saveFromModal(){ 
    const ex = document.getElementById('modal-exercise').value; 
    const s = document.getElementById('modal-series').value; 
    const r = document.getElementById('modal-reps').value; 
    const w = document.getElementById('modal-weight').value;
    
    if(!ex) return; 
    
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
function deleteCard(d,i){ if(confirm("Usunąć?")) db.collection("users").doc(auth.currentUser.uid).collection("days").doc(d).collection("exercises").doc(i).delete().then(()=>loadCardsDataFromFirestore(d)); }
function saveMuscleGroups(){ const v=event.target.value; const u=auth.currentUser; db.collection("users").doc(u.uid).collection("days").doc(currentSelectedDay).set({muscleGroup:v},{merge:true}); }
function loadMuscleGroupFromFirestore(d){ db.collection("users").doc(auth.currentUser.uid).collection("days").doc(d).get().then(doc=>{ if(doc.exists) document.getElementById(`${d}-muscle-group`).value=doc.data().muscleGroup||""; }); }

function escapeHTML(str){ if(!str) return ""; return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
async function signIn(){ try{ await auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-password').value); }catch(e){alert(e.message);} }
async function signUp(){ try{ await auth.createUserWithEmailAndPassword(document.getElementById('register-email').value, document.getElementById('register-password').value); switchAuthTab('login'); alert("Konto założone!"); }catch(e){alert(e.message);} }
async function signOut(){ await auth.signOut(); location.reload(); }
async function forceAppUpdate(){ 
    if(!confirm("Aktualizować?")) return; 
    const regs=await navigator.serviceWorker.getRegistrations(); 
    for(let r of regs) r.unregister(); 
    caches.keys().then(k=>k.forEach(c=>caches.delete(c))); 
    location.reload(true); 
}
function giveKudos(){
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
