// Przełączanie widoczności formularzy
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
