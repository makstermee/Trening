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
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  const loginInfo = document.getElementById('login-info');
  const loginError = document.getElementById('login-error');
  loginInfo.textContent = "Próba logowania...";
  loginError.textContent = "";

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    loginInfo.textContent = `Zalogowano jako: ${user.email}`;
    console.log("Logowanie zakończone sukcesem:", user);
  } catch (error) {
    loginError.textContent = `Błąd logowania: ${error.message}`;
    console.error("Logowanie nieudane:", error);
  }
}

// Rejestracja użytkownika
async function signUp() {
  const name = document.getElementById('register-name').value.trim();
  const surname = document.getElementById('register-surname').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();
  const confirmPassword = document.getElementById('confirm-password').value.trim();

  const registerInfo = document.getElementById('login-info');
  const registerError = document.getElementById('login-error');
  registerInfo.textContent = "Próba rejestracji...";
  registerError.textContent = "";

  // Sprawdzenie hasła
  if (password !== confirmPassword) {
    registerError.textContent = "Hasła nie są zgodne!";
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Zapisanie dodatkowych danych użytkownika w Firestore
    await db.collection('users').doc(user.uid).set({
      name: name,
      surname: surname,
      email: email,
      createdAt: new Date()
    });

    registerInfo.textContent = `Zarejestrowano pomyślnie jako: ${user.email}`;
    console.log("Rejestracja zakończona sukcesem:", user);
    toggleRegisterForm(); // Powrót do formularza logowania
  } catch (error) {
    registerError.textContent = `Błąd rejestracji: ${error.message}`;
    console.error("Rejestracja nieudana:", error);
  }
}

// Wylogowanie użytkownika
async function signOut() {
  const loginInfo = document.getElementById('login-info');
  const loginError = document.getElementById('login-error');

  loginInfo.textContent = "Wylogowywanie...";
  loginError.textContent = "";

  try {
    await auth.signOut();
    loginInfo.textContent = "Wylogowano pomyślnie.";
    console.log("Wylogowano użytkownika.");
  } catch (error) {
    loginError.textContent = `Błąd wylogowania: ${error.message}`;
    console.error("Wylogowanie nieudane:", error);
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

// Resetowanie ćwiczeń
function resetCards(day) {
  const cardContainer = document.getElementById(`${day}-cards`);
  cardContainer.innerHTML = '';
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
