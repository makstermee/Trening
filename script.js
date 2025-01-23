/*************************************************************
  MAPA DNI TYGODNIA (polskie nazwy)
*************************************************************/
const dayMap = {
  monday: "Poniedziałek",
  tuesday: "Wtorek",
  wednesday: "Środa",
  thursday: "Czwartek",
  friday: "Piątek",
  saturday: "Sobota",
  sunday: "Niedziela"
};

// Lista wszystkich dni
const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

/*************************************************************
  ZMIENNA GLOBALNA – INFORMACJA O EDYCJI
*************************************************************/
let editInfo = {
  day: null,    // Nazwa dnia (monday, tuesday, ...)
  docId: null  // ID dokumentu w Firestore
};

/*************************************************************
  1. FUNKCJA POKAZUJĄCA WYBRANĄ SEKCJĘ
*************************************************************/
function showSection() {
  const sections = document.querySelectorAll(".day-section");
  sections.forEach(sec => sec.classList.add("hidden"));

  const selected = document.getElementById("day-selector").value;
  const toShow = document.getElementById(selected);
  if (toShow) {
    toShow.classList.remove("hidden");
    if (selected === "history") {
      loadHistoryFromFirestore();
    }
  }
}

/*************************************************************
  2. INICJALIZACJA PO ZAŁADOWANIU STRONY
*************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Początkowo ukryj sekcje planu treningowego
  document.querySelector('.container').style.display = 'none';

  allDays.forEach(day => {
    loadCardsDataFromFirestore(day);
    loadMuscleGroupFromFirestore(day);
  });
});

/*************************************************************
  3. DODAWANIE LUB AKTUALIZOWANIE KARTY
*************************************************************/
function addCard(day) {
  if (editInfo.day === day && editInfo.docId !== null) {
    // Aktualizujemy istniejącą kartę
    updateCard(day, editInfo.docId);
  } else {
    // Tworzymy nową kartę
    createNewCard(day);
  }
}

/*************************************************************
  3a. TWORZENIE NOWEJ KARTY
*************************************************************/
function createNewCard(day) {
  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series   = document.getElementById(`${day}-series`).value.trim();
  const reps     = document.getElementById(`${day}-reps`).value.trim();
  const weight   = document.getElementById(`${day}-weight`).value.trim();
  const notes    = document.getElementById(`${day}-notes`).value.trim();

  if (!exercise && !series && !reps && !weight && !notes) return;

  const cardData = { exercise, series, reps, weight, notes };

  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby dodawać ćwiczenia.");
    return;
  }

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").add(cardData)
    .then(() => {
      // Czyścimy formularz
      document.getElementById(`${day}-exercise`).value = "";
      document.getElementById(`${day}-series`).value   = "";
      document.getElementById(`${day}-reps`).value     = "";
      document.getElementById(`${day}-weight`).value   = "";
      document.getElementById(`${day}-notes`).value    = "";

      loadCardsDataFromFirestore(day);
    })
    .catch(error => {
      console.error("Błąd przy dodawaniu ćwiczenia: ", error);
    });
}

/*************************************************************
  3b. AKTUALIZACJA ISTNIEJĄCEJ KARTY
*************************************************************/
function updateCard(day, docId) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby aktualizować ćwiczenia.");
    return;
  }

  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series   = document.getElementById(`${day}-series`).value.trim();
  const reps     = document.getElementById(`${day}-reps`).value.trim();
  const weight   = document.getElementById(`${day}-weight`).value.trim();
  const notes    = document.getElementById(`${day}-notes`).value.trim();

  const updatedData = { exercise, series, reps, weight, notes };

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).update(updatedData)
    .then(() => {
      // Czyścimy formularz
      document.getElementById(`${day}-exercise`).value = "";
      document.getElementById(`${day}-series`).value   = "";
      document.getElementById(`${day}-reps`).value     = "";
      document.getElementById(`${day}-weight`).value   = "";
      document.getElementById(`${day}-notes`).value    = "";

      // Wyłączamy tryb edycji
      editInfo.day = null;
      editInfo.docId = null;

      // Przywracamy główny przycisk do "Dodaj ćwiczenie"
      const addBtn = document.querySelector(`#${day} .exercise-form button#${day}-add-btn`);
      if (addBtn) addBtn.textContent = "Dodaj ćwiczenie";

      // Ukrywamy przycisk Anuluj
      const cancelBtn = document.getElementById(`${day}-cancel-btn`);
      if (cancelBtn) {
        cancelBtn.classList.add("hidden");
      }

      loadCardsDataFromFirestore(day);
    })
    .catch(error => {
      console.error("Błąd przy aktualizacji ćwiczenia: ", error);
    });
}

/*************************************************************
  FUNKCJA ANULUJĄCA EDYCJĘ
*************************************************************/
function cancelEdit(day) {
  // Czyścimy formularz
  document.getElementById(`${day}-exercise`).value = "";
  document.getElementById(`${day}-series`).value   = "";
  document.getElementById(`${day}-reps`).value     = "";
  document.getElementById(`${day}-weight`).value   = "";
  document.getElementById(`${day}-notes`).value    = "";

  // Wyłączamy tryb edycji
  editInfo.day = null;
  editInfo.docId = null;

  // Przywracamy główny przycisk do "Dodaj ćwiczenie"
  const addBtn = document.querySelector(`#${day} .exercise-form button#${day}-add-btn`);
  if (addBtn) {
    addBtn.textContent = "Dodaj ćwiczenie";
  }

  // Ukrywamy "Anuluj"
  const cancelBtn = document.getElementById(`${day}-cancel-btn`);
  if (cancelBtn) {
    cancelBtn.classList.add("hidden");
  }
}

/*************************************************************
  4. ŁADOWANIE KART Z FIRESTORE
*************************************************************/
function loadCardsDataFromFirestore(day) {
  const container = document.getElementById(`${day}-cards`);
  if (!container) return;

  container.innerHTML = "";

  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        const card = doc.data();
        const docId = doc.id; // ID dokumentu

        const cardDiv = document.createElement("div");
        cardDiv.classList.add("exercise-card");

        // Nagłówek
        const headerDiv = document.createElement("div");
        headerDiv.classList.add("exercise-card-header");
        headerDiv.textContent = card.exercise || "(brak ćwiczenia)";

        // Detale
        const detailsDiv = document.createElement("div");
        detailsDiv.classList.add("exercise-card-details");
        detailsDiv.innerHTML = `
          <p><strong>Serie:</strong> ${escapeHTML(card.series) || "-"}</p>
          <p><strong>Powtórzenia:</strong> ${escapeHTML(card.reps) || "-"}</p>
          <p><strong>Ciężar (kg):</strong> ${escapeHTML(card.weight) || "-"}</p>
          <p><strong>Notatki:</strong> ${escapeHTML(card.notes) || "-"}</p>

          <button class="btn-reset" onclick="deleteCard('${day}', '${docId}')">Usuń</button>
          <button class="btn-save" onclick="editCard('${day}', '${docId}')">Edytuj</button>
        `;

        // Kliknięcie w nagłówek -> pokaż/ukryj szczegóły
        headerDiv.addEventListener("click", () => {
          detailsDiv.classList.toggle("show");
          headerDiv.classList.toggle("expanded");
        });

        cardDiv.appendChild(headerDiv);
        cardDiv.appendChild(detailsDiv);
        container.appendChild(cardDiv);
      });
    })
    .catch(error => {
      console.error("Błąd przy ładowaniu ćwiczeń: ", error);
    });
}

/*************************************************************
  5. USUWANIE KARTY
*************************************************************/
function deleteCard(day, docId) {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).delete()
    .then(() => {
      console.log("Ćwiczenie usunięte pomyślnie.");
      loadCardsDataFromFirestore(day);
    })
    .catch(error => {
      console.error("Błąd przy usuwaniu ćwiczenia: ", error);
    });
}

/*************************************************************
  6. RESETOWANIE KART
*************************************************************/
function resetCards(day) {
  if (confirm("Czy na pewno chcesz zresetować wszystkie ćwiczenia?")) {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert("Musisz być zalogowany, aby resetować ćwiczenia.");
      return;
    }

    db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
      .then(querySnapshot => {
        const batch = db.batch();
        querySnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      })
      .then(() => {
        console.log("Wszystkie ćwiczenia zostały zresetowane.");
        loadCardsDataFromFirestore(day);
      })
      .catch(error => {
        console.error("Błąd przy resetowaniu ćwiczeń: ", error);
      });
  }
}

/*************************************************************
  7. EDYTOWANIE ISTNIEJĄCEJ KARTY
*************************************************************/
function editCard(day, docId) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby edytować ćwiczenia.");
    return;
  }

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").doc(docId).get()
    .then(doc => {
      if (!doc.exists) {
        console.log("Ćwiczenie nie istnieje.");
        return;
      }

      const card = doc.data();
      document.getElementById(`${day}-exercise`).value = card.exercise || "";
      document.getElementById(`${day}-series`).value   = card.series   || "";
      document.getElementById(`${day}-reps`).value     = card.reps     || "";
      document.getElementById(`${day}-weight`).value   = card.weight   || "";
      document.getElementById(`${day}-notes`).value    = card.notes    || "";

      editInfo.day = day;
      editInfo.docId = docId;

      // ZMIANA NAPISU PRZYCISKU NA "Zapisz zmiany"
      const addBtn = document.querySelector(`#${day} .exercise-form button#${day}-add-btn`);
      if (addBtn) {
        addBtn.textContent = "Zapisz zmiany";
      }

      // Pokazujemy przycisk Anuluj
      const cancelBtn = document.getElementById(`${day}-cancel-btn`);
      if (cancelBtn) {
        cancelBtn.classList.remove("hidden");
      }
    })
    .catch(error => {
      console.error("Błąd przy edytowaniu ćwiczenia: ", error);
    });
}

/*************************************************************
  8. ZAPIS GRUP MIĘŚNIOWYCH
*************************************************************/
function saveMuscleGroups() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany. Nie można zapisać grup mięśniowych.");
    return;
  }

  allDays.forEach(day => {
    const inp = document.getElementById(`${day}-muscle-group`);
    if (!inp) return;
    const muscleGroup = inp.value.trim();
    db.collection("users").doc(user.uid).collection("days").doc(day).set({
      muscleGroup: muscleGroup
    }, { merge: true })
      .then(() => {
        console.log(`Grupa mięśniowa dla ${dayMap[day]} została zapisana.`);
      })
      .catch(error => {
        console.error(`Błąd przy zapisywaniu grupy mięśniowej dla ${dayMap[day]}: `, error);
      });
  });
}

function loadMuscleGroupFromFirestore(day) {
  const inp = document.getElementById(`${day}-muscle-group`);
  if (!inp) return;

  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  db.collection("users").doc(user.uid).collection("days").doc(day).get()
    .then(doc => {
      if (doc.exists && doc.data().muscleGroup) {
        inp.value = doc.data().muscleGroup;
      }
    })
    .catch(error => {
      console.error("Błąd przy ładowaniu grupy mięśniowej: ", error);
    });
}

/*************************************************************
  9. ZAPIS (SAVE) KART DO HISTORII
*************************************************************/
function saveToHistory(day) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Musisz być zalogowany, aby zapisywać dane do historii.");
    return;
  }

  db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").get()
    .then(querySnapshot => {
      const date = new Date().toLocaleDateString();
      const dayName = dayMap[day] || "Nieznany dzień";

      querySnapshot.forEach(doc => {
        const card = doc.data();
        if (Object.values(card).some(val => val !== "")) {
          db.collection("users").doc(user.uid).collection("history").add({
            date,
            day: dayName,
            exercise: card.exercise,
            series: card.series,
            reps: card.reps,
            weight: card.weight,
            notes: card.notes
          })
            .then(() => {
              console.log("Dane zostały zapisane do historii.");
            })
            .catch(error => {
              console.error("Błąd przy zapisywaniu do historii: ", error);
            });
        }
      });

      alert("Dane zostały zapisane do historii!");
    })
    .catch(error => {
      console.error("Błąd przy zapisywaniu do historii: ", error);
    });
}

/*************************************************************
  10. FILTROWANIE HISTORII
*************************************************************/
function showDatesForDay() {
  const selectedDay = document.getElementById("filter-day").value;
  const dateFilter = document.getElementById("date-filter");
  const historyBody = document.getElementById("history-table-body");

  if (!selectedDay) {
    dateFilter.classList.add("hidden");
    historyBody.innerHTML = "";
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  db.collection("users").doc(user.uid).collection("history")
    .where("day", "==", selectedDay)
    .get()
    .then(querySnapshot => {
      const uniqueDates = [...new Set(
        querySnapshot.docs.map(doc => doc.data().date)
      )];
      if (uniqueDates.length === 0) {
        dateFilter.classList.add("hidden");
        historyBody.innerHTML = "";
        return;
      }

      dateFilter.classList.remove("hidden");
      const dateSelect = document.getElementById("filter-date");
      dateSelect.innerHTML = `<option value="">Wybierz datę</option>`;
      uniqueDates.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        dateSelect.appendChild(opt);
      });
      historyBody.innerHTML = "";
    })
    .catch(error => {
      console.error("Błąd przy filtrowaniu historii: ", error);
    });
}

function loadHistoryForDate() {
  const selectedDay = document.getElementById("filter-day").value;
  const selectedDate= document.getElementById("filter-date").value;
  const historyBody = document.getElementById("history-table-body");

  if (!selectedDate) {
    historyBody.innerHTML = "";
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  db.collection("users").doc(user.uid).collection("history")
    .where("day", "==", selectedDay)
    .where("date", "==", selectedDate)
    .get()
    .then(querySnapshot => {
      historyBody.innerHTML = "";
      if (querySnapshot.empty) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `
          <td colspan="8" style="text-align:center;color:#999;">Brak danych dla wybranej daty</td>`;
        historyBody.appendChild(emptyRow);
        return;
      }

      querySnapshot.forEach(doc => {
        const entry = doc.data();
        const docId = doc.id;
        const row= document.createElement("tr");
        row.innerHTML=`
          <td>${escapeHTML(entry.date)}</td>
          <td>${escapeHTML(entry.day)}</td>
          <td>${escapeHTML(entry.exercise)}</td>
          <td>${escapeHTML(entry.series)}</td>
          <td>${escapeHTML(entry.reps)}</td>
          <td>${escapeHTML(entry.weight)}</td>
          <td>${escapeHTML(entry.notes)}</td>
          <td><button class="btn-reset" onclick="deleteHistoryEntry('${docId}')">Usuń</button></td>
        `;
        historyBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error("Błąd przy ładowaniu historii: ", error);
    });
}

/*************************************************************
  USUWANIE WPISÓW Z HISTORII
*************************************************************/
function loadHistoryFromFirestore(){
  const historyBody= document.getElementById("history-table-body");
  if(!historyBody) return;
  historyBody.innerHTML='';
  
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  db.collection("users").doc(user.uid).collection("history").get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        const emptyRow= document.createElement('tr');
        emptyRow.innerHTML=`
          <td colspan="8" style="text-align:center;color:#999;">Brak zapisanej historii</td>`;
        historyBody.appendChild(emptyRow);
        return;
      }
      querySnapshot.forEach(doc => {
        const entry = doc.data();
        const docId = doc.id;
        const row= document.createElement("tr");
        row.innerHTML=`
          <td>${escapeHTML(entry.date)}</td>
          <td>${escapeHTML(entry.day)}</td>
          <td>${escapeHTML(entry.exercise)}</td>
          <td>${escapeHTML(entry.series)}</td>
          <td>${escapeHTML(entry.reps)}</td>
          <td>${escapeHTML(entry.weight)}</td>
          <td>${escapeHTML(entry.notes)}</td>
          <td><button class="btn-reset" onclick="deleteHistoryEntry('${docId}')">Usuń</button></td>
        `;
        historyBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error("Błąd przy ładowaniu historii: ", error);
    });
}

function deleteHistoryEntry(docId){
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany.");
    return;
  }

  db.collection("users").doc(user.uid).collection("history").doc(docId).delete()
    .then(() => {
      console.log("Wpis historii usunięty pomyślnie.");
      loadHistoryFromFirestore();
    })
    .catch(error => {
      console.error("Błąd przy usuwaniu wpisu historii: ", error);
    });
}

/*************************************************************
  FUNKCJE LOGOWANIA Firebase
*************************************************************/
// 1) Zalogowanie istniejącego użytkownika
async function signIn() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    document.getElementById('login-error').textContent = "";
    document.getElementById('login-info').textContent = "Zalogowano jako: " + userCredential.user.email;
  } catch (error) {
    document.getElementById('login-error').textContent = error.message;
  }
}

// 2) Rejestracja nowego użytkownika
async function signUp() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    document.getElementById('login-error').textContent = "";
    document.getElementById('login-info').textContent = "Utworzono konto: " + userCredential.user.email;
  } catch (error) {
    document.getElementById('login-error').textContent = error.message;
  }
}

// 3) Wylogowanie
async function signOut() {
  try {
    await firebase.auth().signOut();
    document.getElementById('login-info').textContent = "Wylogowano";
  } catch (error) {
    document.getElementById('login-error').textContent = error.message;
  }
}

/*************************************************************
  4. NASŁUCHIWANIE STANU UŻYTKOWNIKA
*************************************************************/
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // Zalogowano
    console.log("Zalogowano:", user.email);
    document.getElementById('login-info').textContent = "Zalogowano jako: " + user.email;

    // Pokazuj sekcje planu treningowego
    document.querySelector('.container').style.display = 'block';

    // Ukryj sekcję logowania
    document.getElementById('login-section').style.display = 'none';

    // Sprawdź, czy są dane w localStorage
    const hasLocalData = allDays.some(day => localStorage.getItem(`${day}-data`) || localStorage.getItem(`${day}-muscle-group`)) || localStorage.getItem("history-data");
    if (hasLocalData) {
      // Przeprowadź migrację
      await migrateLocalStorageToFirestore();
    }

    // Ładuj dane z Firestore
    allDays.forEach(day => {
      loadCardsDataFromFirestore(day);
      loadMuscleGroupFromFirestore(day);
    });
    loadHistoryFromFirestore();
  } else {
    // Wylogowano
    console.log("Wylogowano lub nikt nie zalogowany");
    document.getElementById('login-info').textContent = "";

    // Ukryj sekcje planu treningowego
    document.querySelector('.container').style.display = 'none';

    // Pokaz sekcję logowania
    document.getElementById('login-section').style.display = 'block';
  }
});

/*************************************************************
  5. MIGRACJA DANYCH Z LOCALSTORAGE DO FIRESTORE
*************************************************************/
async function migrateLocalStorageToFirestore() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log("Użytkownik nie jest zalogowany. Nie można przeprowadzić migracji.");
    return;
  }

  try {
    // Przechodzimy przez wszystkie dni tygodnia
    for (const day of allDays) {
      const dayData = JSON.parse(localStorage.getItem(`${day}-data`)) || [];
      const muscleGroup = localStorage.getItem(`${day}-muscle-group`) || "";

      // Zapisujemy grupę mięśniową
      if (muscleGroup) {
        await db.collection("users").doc(user.uid).collection("days").doc(day).set({
          muscleGroup: muscleGroup
        }, { merge: true });
      }

      // Zapisujemy ćwiczenia
      for (const exercise of dayData) {
        await db.collection("users").doc(user.uid).collection("days").doc(day).collection("exercises").add(exercise);
      }

      // Opcjonalnie: usuń dane z localStorage po migracji
      localStorage.removeItem(`${day}-data`);
      localStorage.removeItem(`${day}-muscle-group`);
    }

    // Przechowujemy historię treningów
    const historyData = JSON.parse(localStorage.getItem("history-data")) || [];
    for (const entry of historyData) {
      await db.collection("users").doc(user.uid).collection("history").add(entry);
    }
    localStorage.removeItem("history-data");

    console.log("Migracja danych zakończona pomyślnie!");
    alert("Migracja danych zakończona pomyślnie!");
  } catch (error) {
    console.error("Błąd przy migracji danych: ", error);
  }
}

/*************************************************************
  ZABEZPIECZENIE PRZED XSS
*************************************************************/
function escapeHTML(str){
  if(!str) return "";
  return str
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
