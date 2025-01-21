/*************************************************************
  MAPA DNI TYGODNIA:
  Angielskie ID (monday, tuesday...) -> Polskie nazwy (Poniedziałek, Wtorek...)
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

// Lista wszystkich dni w angielskich ID (do inicjalizacji)
const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Główna tablica historii (bezpośrednio z localStorage)
let trainingHistory = JSON.parse(localStorage.getItem('history-data')) || [];

/*************************************************************
  1. FUNKCJA POKAZUJĄCA WYBRANĄ SEKCJĘ DNIA
*************************************************************/
function showSection() {
  // Ukrywamy wszystkie sekcje
  const sections = document.querySelectorAll('.day-section');
  sections.forEach(section => section.classList.add('hidden'));

  // Pobieramy wartość z selecta
  const selectedDay = document.getElementById('day-selector').value;
  // Pokazujemy wybraną sekcję
  const sectionToShow = document.getElementById(selectedDay);

  if (sectionToShow) {
    sectionToShow.classList.remove('hidden');
  }
}

/*************************************************************
  2. INICJALIZACJA DANYCH PO ZAŁADOWANIU STRONY
*************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  // Ładujemy dane tabel dla każdego dnia
  allDays.forEach(day => {
    loadTableData(day);
    loadMuscleGroup(day);
  });

  // NIE wywołujemy loadHistory(), aby domyślnie Historia była pusta
  // loadHistory();
});

/*************************************************************
  3. DODAWANIE NOWEGO WIERSZA ĆWICZEŃ W DANEJ SEKCJI
*************************************************************/
function addRow(day) {
  const tableBody = document.getElementById(`${day}-body`);
  const newRow = document.createElement('tr');

  newRow.innerHTML = `
      <td><input type="text" placeholder="Ćwiczenie" oninput="saveTableData('${day}')"></td>
      <td><input type="number" placeholder="Serie" min="1" oninput="saveTableData('${day}')"></td>
      <td><input type="number" placeholder="Powtórzenia" min="1" oninput="saveTableData('${day}')"></td>
      <td><input type="number" placeholder="Ciężar (kg)" min="0" oninput="saveTableData('${day}')"></td>
      <td><input type="text" placeholder="Notatki" oninput="saveTableData('${day}')"></td>
      <td><button class="btn-reset" onclick="deleteRow(this, '${day}')">Usuń</button></td>
  `;

  tableBody.appendChild(newRow);
  saveTableData(day);
}

/*************************************************************
  4. ZAPIS (I ODCZYT) TABELI (DANE DNIA) W LOCALSTORAGE
*************************************************************/

/** ZAPISUJE dane w tabeli dnia (np. monday) do localStorage */
function saveTableData(day) {
  const tableBody = document.getElementById(`${day}-body`);
  const rows = tableBody.querySelectorAll('tr');
  const data = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const rowData = {
      exercise: cells[0].querySelector('input').value.trim(),
      series:   cells[1].querySelector('input').value.trim(),
      reps:     cells[2].querySelector('input').value.trim(),
      weight:   cells[3].querySelector('input').value.trim(),
      notes:    cells[4].querySelector('input').value.trim()
    };
    // Jeśli cokolwiek w wierszu jest wypełnione, dodajemy do data
    if (Object.values(rowData).some(value => value !== "")) {
      data.push(rowData);
    }
  });

  localStorage.setItem(`${day}-data`, JSON.stringify(data));
}

/** ŁADUJE dane z localStorage do tabeli wybranego dnia */
function loadTableData(day) {
  const tableBody = document.getElementById(`${day}-body`);
  const data = JSON.parse(localStorage.getItem(`${day}-data`)) || [];

  tableBody.innerHTML = '';
  data.forEach(rowData => {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td><input type="text" placeholder="Ćwiczenie" value="${escapeHTML(rowData.exercise)}" oninput="saveTableData('${day}')"></td>
      <td><input type="number" placeholder="Serie" min="1" value="${escapeHTML(rowData.series)}" oninput="saveTableData('${day}')"></td>
      <td><input type="number" placeholder="Powtórzenia" min="1" value="${escapeHTML(rowData.reps)}" oninput="saveTableData('${day}')"></td>
      <td><input type="number" placeholder="Ciężar (kg)" min="0" value="${escapeHTML(rowData.weight)}" oninput="saveTableData('${day}')"></td>
      <td><input type="text" placeholder="Notatki" value="${escapeHTML(rowData.notes)}" oninput="saveTableData('${day}')"></td>
      <td><button class="btn-reset" onclick="deleteRow(this, '${day}')">Usuń</button></td>
    `;
    tableBody.appendChild(newRow);
  });
}

/** USUWA pojedynczy wiersz z tabeli dnia */
function deleteRow(button, day) {
  const row = button.parentElement.parentElement;
  row.remove();
  saveTableData(day);
}

/*************************************************************
  5. ZAPIS GRUPY MIĘŚNIOWEJ (INPUT "Partia mięśniowa")
*************************************************************/
function saveMuscleGroups() {
  allDays.forEach(day => {
    const muscleGroupInput = document.getElementById(`${day}-muscle-group`);
    if (!muscleGroupInput) return;
    const muscleGroup = muscleGroupInput.value.trim();
    localStorage.setItem(`${day}-muscle-group`, muscleGroup);
  });
}

/** ŁADUJE grupę mięśniową z localStorage */
function loadMuscleGroup(day) {
  const muscleGroupInput = document.getElementById(`${day}-muscle-group`);
  if (!muscleGroupInput) return;
  const stored = localStorage.getItem(`${day}-muscle-group`) || '';
  muscleGroupInput.value = stored;
}

/*************************************************************
  6. ZAPIS (SAVE) DANYCH TABELI DNIA DO HISTORII
*************************************************************/
function saveToHistory(day) {
  const date = new Date().toLocaleDateString(); // Data zapisu
  const tableBody = document.getElementById(`${day}-body`);
  const rows = tableBody.querySelectorAll('tr');
  let historyData = JSON.parse(localStorage.getItem('history-data')) || [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const entry = {
      date: date,
      // Zamieniamy ID dnia (monday) na polską nazwę (Poniedziałek):
      day: dayMap[day] || "Nieznany dzień",
      exercise: cells[0].querySelector('input').value.trim(),
      series:   cells[1].querySelector('input').value.trim(),
      reps:     cells[2].querySelector('input').value.trim(),
      weight:   cells[3].querySelector('input').value.trim(),
      notes:    cells[4].querySelector('input').value.trim()
    };

    // Jeżeli w wierszu cokolwiek jest wypełnione
    if (Object.values(entry).some(value => value !== "")) {
      historyData.push(entry);
    }
  });

  localStorage.setItem('history-data', JSON.stringify(historyData));
  alert('Dane zostały zapisane do historii.');
  // Nie ładujemy tu całej historii, aby nie pokazywać poprzedniego stanu
  // loadHistory();
}

/*************************************************************
  7. ŁADOWANIE CAŁEJ HISTORII (SEKCJA "HISTORIA")
*************************************************************/
function loadHistory() {
  const historyBody = document.getElementById('history-table-body');
  if (!historyBody) return; // Bezpiecznik

  historyBody.innerHTML = '';
  const historyData = JSON.parse(localStorage.getItem('history-data')) || [];

  if (historyData.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" style="text-align: center; color: #999;">Brak zapisanej historii</td>
    `;
    historyBody.appendChild(emptyRow);
    return;
  }

  historyData.forEach((entry, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHTML(entry.exercise)}</td>
      <td>${escapeHTML(entry.series)}</td>
      <td>${escapeHTML(entry.reps)}</td>
      <td>${escapeHTML(entry.weight)}</td>
      <td>${escapeHTML(entry.notes)}</td>
      <td>
        <button class="btn-reset" onclick="deleteHistoryEntry(${index})">Usuń</button>
      </td>
    `;
    historyBody.appendChild(row);
  });
}

/*************************************************************
  8. USUWANIE WPISU Z HISTORII
*************************************************************/
function deleteHistoryEntry(index) {
  let historyData = JSON.parse(localStorage.getItem('history-data')) || [];
  if (index >= 0 && index < historyData.length) {
    historyData.splice(index, 1);
    localStorage.setItem('history-data', JSON.stringify(historyData));
    // Po usunięciu wpisu
    loadHistory(); 
  }
}

/*************************************************************
  9. FILTROWANIE W SEKCJI HISTORIA
  -> Filtr "Dzień tygodnia" (np. Poniedziałek)
  -> Filtr daty
*************************************************************/
function showDatesForDay() {
  const selectedDay = document.getElementById("filter-day").value;
  const historyData = JSON.parse(localStorage.getItem("history-data")) || [];
  const dateFilter = document.getElementById("date-filter");
  const historyBody = document.getElementById("history-table-body");

  // Jeśli nie wybrano dnia -> pusta tabela
  if (!selectedDay) {
    dateFilter.classList.add("hidden");
    historyBody.innerHTML = '';
    return;
  }

  // Filtrujemy unikalne daty dla wybranego dnia (po polsku!)
  const uniqueDates = [...new Set(
    historyData.filter(entry => entry.day === selectedDay).map(entry => entry.date)
  )];

  // Jeśli brak dat, ukrywamy filtr daty i czyścimy tabelę
  if (uniqueDates.length === 0) {
    dateFilter.classList.add("hidden");
    historyBody.innerHTML = '';
    return;
  }

  // Inaczej – tworzymy listę dat
  dateFilter.classList.remove("hidden");
  const dateSelect = document.getElementById("filter-date");
  dateSelect.innerHTML = `<option value="">Wybierz datę</option>`;
  uniqueDates.forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateSelect.appendChild(option);
  });

  // Po zmianie dnia, dopóki nie wybrano daty -> pusta tabela
  historyBody.innerHTML = '';
}

/** Wczytuje historię dla wybranego dnia (polska nazwa) i daty */
function loadHistoryForDate() {
  const selectedDay = document.getElementById("filter-day").value;  // polska nazwa
  const selectedDate = document.getElementById("filter-date").value;
  const historyBody  = document.getElementById("history-table-body");
  const historyData  = JSON.parse(localStorage.getItem('history-data')) || [];

  // Jeśli nie wybrano konkretnej daty -> czyścimy
  if (!selectedDate) {
    historyBody.innerHTML = '';
    return;
  }

  // Filtrujemy dane
  const filtered = historyData.filter(e => e.day === selectedDay && e.date === selectedDate);

  historyBody.innerHTML = '';
  if (filtered.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" style="text-align: center; color: #999;">Brak danych dla wybranej daty</td>
    `;
    historyBody.appendChild(emptyRow);
    return;
  }

  filtered.forEach((entry, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHTML(entry.exercise)}</td>
      <td>${escapeHTML(entry.series)}</td>
      <td>${escapeHTML(entry.reps)}</td>
      <td>${escapeHTML(entry.weight)}</td>
      <td>${escapeHTML(entry.notes)}</td>
      <td><button class="btn-reset" onclick="deleteHistoryEntryFiltered('${selectedDay}','${selectedDate}',${index})">Usuń</button></td>
    `;
    historyBody.appendChild(row);
  });
}

/** Usuwa wpis z historii w trybie filtrowanym */
function deleteHistoryEntryFiltered(dayName, date, indexInFiltered) {
  let historyData = JSON.parse(localStorage.getItem('history-data')) || [];
  // Najpierw filtrujemy oryginalną tablicę
  const filtered = historyData.filter(e => e.day === dayName && e.date === date);
  if (indexInFiltered < 0 || indexInFiltered >= filtered.length) return;

  // Usuwamy wybrany element z 'filtered'
  filtered.splice(indexInFiltered, 1);

  // Teraz musimy "złożyć" resztę historyData (elementy niefiltrowane + nowy filtered)
  historyData = historyData.filter(e => !(e.day === dayName && e.date === date));
  historyData = historyData.concat(filtered);

  localStorage.setItem('history-data', JSON.stringify(historyData));
  // Odśwież widok filtra
  loadHistoryForDate();
}

/*************************************************************
  10. RESETOWANIE TABELI DNIA
*************************************************************/
function resetTable(day) {
  if (confirm('Czy na pewno chcesz zresetować tabelę?')) {
    // Usuwamy z localStorage
    localStorage.removeItem(day + '-data');
    // Czyścimy wiersze w tabeli
    const tableBody = document.getElementById(day + '-body');
    if (tableBody) {
      tableBody.innerHTML = '';
    }
  }
}

/*************************************************************
  FUNKCJA ZABEZPIECZAJĄCA PRZED XSS
*************************************************************/
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
