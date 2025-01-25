/*************************************************************
  INICJALIZACJA FIREBASE
*************************************************************/
const auth = firebase.auth();
const db = firebase.firestore();

/*************************************************************
  FUNKCJE LOGOWANIA I REJESTRACJI
*************************************************************/

// Logowanie użytkownika
async function signIn() {
  console.log("Logowanie rozpoczęte...");

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    document.getElementById('login-info').textContent = `Zalogowano jako: ${user.email}`;
    document.getElementById('login-error').textContent = "";
    console.log("Logowanie zakończone sukcesem.");
  } catch (error) {
    console.error("Błąd logowania:", error);
    document.getElementById('login-error').textContent = error.message;
  }
}

// Rejestracja użytkownika
async function signUp() {
  console.log("Rozpoczęto rejestrację...");

  const name = document.getElementById('register-name').value.trim();
  const surname = document.getElementById('register-surname').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const confirmPassword = document.getElementById('confirm-password').value.trim();

  if (password !== confirmPassword) {
    document.getElementById('login-error').textContent = "Hasła nie są zgodne!";
    console.error("Hasła nie są zgodne.");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Zapisanie danych użytkownika w Firestore
    await db.collection('users').doc(user.uid).set({
      name: name,
      surname: surname,
      email: email,
      createdAt: new Date()
    });

    document.getElementById('login-info').textContent = `Zarejestrowano: ${user.email}`;
    document.getElementById('login-error').textContent = "";
    console.log("Rejestracja zakończona sukcesem.");
    toggleRegisterForm(); // Przełącz na formularz logowania
  } catch (error) {
    console.error("Błąd rejestracji:", error);
    document.getElementById('login-error').textContent = error.message;
  }
}

// Wylogowanie użytkownika
async function signOut() {
  console.log("Wylogowywanie...");

  try {
    await auth.signOut();
    document.getElementById('login-info').textContent = "Wylogowano.";
    console.log("Wylogowano pomyślnie.");
  } catch (error) {
    console.error("Błąd wylogowania:", error);
    document.getElementById('login-error').textContent = error.message;
  }
}

/*************************************************************
  FUNKCJE NAWIGACJI I SEKCJI
*************************************************************/

// Przełączanie widoczności formularzy logowania/rejestracji
function toggleRegisterForm() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (registerForm.style.display === 'none') {
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
  } else {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  }
}

// Przełączanie widoczności sekcji
function showSection() {
  const selectedDay = document.getElementById('day-selector').value;
  const allSections = document.querySelectorAll('.day-section');

  allSections.forEach(section => section.classList.add('hidden'));

  if (selectedDay) {
    const activeSection = document.getElementById(selectedDay);
    if (activeSection) activeSection.classList.remove('hidden');
  }
}

/*************************************************************
  FUNKCJE ĆWICZEŃ
*************************************************************/

// Dodawanie ćwiczenia do karty
function addCard(day) {
  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series = document.getElementById(`${day}-series`).value.trim();
  const reps = document.getElementById(`${day}-reps`).value.trim();
  const weight = document.getElementById(`${day}-weight`).value.trim();
  const notes = document.getElementById(`${day}-notes`).value.trim();

  if (!exercise || !series || !reps || !weight) {
    alert("Proszę uzupełnić wszystkie wymagane pola.");
    return;
  }

  const cardContainer = document.getElementById(`${day}-cards`);
  const card = document.createElement('div');
  card.classList.add('exercise-card');
  card.innerHTML = `
    <p><strong>Ćwiczenie:</strong> ${exercise}</p>
    <p><strong>Serie:</strong> ${series}</p>
    <p><strong>Powtórzenia:</strong> ${reps}</p>
    <p><strong>Ciężar (kg):</strong> ${weight}</p>
    <p><strong>Notatki:</strong> ${notes}</p>
  `;
  cardContainer.appendChild(card);

  // Reset formularza po dodaniu ćwiczenia
  document.getElementById(`${day}-exercise`).value = '';
  document.getElementById(`${day}-series`).value = '';
  document.getElementById(`${day}-reps`).value = '';
  document.getElementById(`${day}-weight`).value = '';
  document.getElementById(`${day}-notes`).value = '';
}

// Zapisanie ćwiczeń do historii
function saveToHistory(day) {
  const cards = document.querySelectorAll(`#${day}-cards .exercise-card`);
  const history = [];

  cards.forEach(card => {
    const data = {};
    card.querySelectorAll('p').forEach(p => {
      const [key, value] = p.textContent.split(': ');
      data[key] = value;
    });
    history.push(data);
  });

  // Zapisanie danych do Firebase
  db.collection('history').add({
    day,
    exercises: history,
    timestamp: new Date()
  }).then(() => {
    alert("Dane zostały zapisane w historii.");
  }).catch(error => {
    console.error("Błąd zapisywania danych:", error);
    alert("Nie udało się zapisać danych.");
  });
}

// Resetowanie ćwiczeń
function resetCards(day) {
  const cardContainer = document.getElementById(`${day}-cards`);
  cardContainer.innerHTML = '';
}
