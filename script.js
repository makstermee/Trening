// script.js

// Tablica przechowująca historię treningów
let trainingHistory = JSON.parse(localStorage.getItem('trainingHistory')) || [];

// Lista wszystkich dni
const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// 1. Funkcja tworząca listę <select> z opcjami od 0 do 999
function createNumberSelect(className, day, value = 0) {
    let select = `<select class="${className}" data-day="${day}">`;
    for (let i = 0; i <= 999; i++) {
        select += `<option value="${i}" ${i == value ? "selected" : ""}>${i}</option>`;
    }
    select += '</select>';
    return select;
}

// 2. Funkcja do pokazywania sekcji
function showSection() {
    const sections = document.querySelectorAll('.day-section');
    sections.forEach(section => section.classList.add('hidden'));

    const selectedDay = document.getElementById('day-selector').value;
    const sectionToShow = document.getElementById(selectedDay);

    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    }
}

// Funkcja inicjalizująca wszystkie tabele i dane po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    const days = allDays;

    // Inicjalizacja każdej tabeli dnia
    days.forEach(day => {
        loadTableData(day);
        loadMuscleGroup(day);
    });

    // Inicjalizacja historii
    loadHistory();
});

// Funkcja dodająca wiersz do tabeli
function addRow(day) {
    const tableBody = document.getElementById(`${day}-body`);
    const newRow = document.createElement('tr');

    // Tworzymy komórki z inputami
    newRow.innerHTML = `
        <td><input type="text" placeholder="Ćwiczenie" oninput="saveTableData('${day}')"></td>
        <td><input type="number" placeholder="Serie" min="1" oninput="saveTableData('${day}')"></td>
        <td><input type="number" placeholder="Powtórzenia" min="1" oninput="saveTableData('${day}')"></td>
        <td><input type="number" placeholder="Ciężar (kg)" min="0" oninput="saveTableData('${day}')"></td>
        <td><input type="text" placeholder="Notatki" oninput="saveTableData('${day}')"></td>
        <td><button class="btn-reset" onclick="deleteRow(this, '${day}')">Usuń</button></td>
    `;

    // Dodajemy wiersz do tabeli
    tableBody.appendChild(newRow);

    // Zapisujemy zmiany
    saveTableData(day);
}

// Funkcja usuwająca wiersz z tabeli
function deleteRow(button, day) {
    const row = button.parentElement.parentElement;
    row.remove();
    saveTableData(day);
}

// Funkcja zapisująca dane tabeli do localStorage
function saveTableData(day) {
    const tableBody = document.getElementById(`${day}-body`);
    const rows = tableBody.getElementsByTagName('tr');
    const data = [];

    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        const rowData = {
            exercise: cells[0].querySelector('input').value.trim(),
            series: cells[1].querySelector('input').value.trim(),
            reps: cells[2].querySelector('input').value.trim(),
            weight: cells[3].querySelector('input').value.trim(),
            notes: cells[4].querySelector('input').value.trim()
        };
        // Dodajemy tylko niepuste wiersze
        if (rowData.exercise || rowData.series || rowData.reps || rowData.weight || rowData.notes) {
            data.push(rowData);
        }
    }

    localStorage.setItem(`${day}-data`, JSON.stringify(data));
}

// Funkcja ładująca dane tabeli z localStorage
function loadTableData(day) {
    const data = JSON.parse(localStorage.getItem(`${day}-data`)) || [];
    const tableBody = document.getElementById(`${day}-body`);

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

        // Dodajemy event listener do inputów, aby zapisywać dane przy zmianie
        Array.from(newRow.querySelectorAll('input')).forEach(input => {
            input.addEventListener('input', () => saveTableData(day));
        });

        tableBody.appendChild(newRow);
    });
}

// Funkcja zapisująca dane mięśniowej grupy do localStorage
function saveMuscleGroups() {
    const days = allDays;

    days.forEach(day => {
        const muscleGroup = document.getElementById(`${day}-muscle-group`).value.trim();
        localStorage.setItem(`${day}-muscle-group`, muscleGroup);
    });
}

// Funkcja ładująca dane mięśniowej grupy z localStorage
function loadMuscleGroup(day) {
    const muscleGroup = localStorage.getItem(`${day}-muscle-group`) || '';
    document.getElementById(`${day}-muscle-group`).value = muscleGroup;
}

// Funkcja zapisująca dane treningowe do historii
function saveToHistory(day) {
    const date = new Date().toLocaleDateString();
    const muscleGroup = document.getElementById(`${day}-muscle-group`).value.trim();
    const tableBody = document.getElementById(`${day}-body`);
    const rows = tableBody.getElementsByTagName('tr');
    let historyData = JSON.parse(localStorage.getItem('history-data')) || [];

    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        const entry = {
            date: date,
            day: capitalizeFirstLetter(day),
            muscleGroup: muscleGroup,
            exercise: cells[0].querySelector('input').value.trim(),
            series: cells[1].querySelector('input').value.trim(),
            reps: cells[2].querySelector('input').value.trim(),
            weight: cells[3].querySelector('input').value.trim(),
            notes: cells[4].querySelector('input').value.trim()
        };
        // Dodajemy tylko pełne wpisy
        if (entry.exercise || entry.series || entry.reps || entry.weight || entry.notes) {
            historyData.push(entry);
        }
    }

    localStorage.setItem('history-data', JSON.stringify(historyData));
    loadHistory(); // Odświeżenie tabeli historii
    alert('Dane zostały zapisane do historii.');
}

// Funkcja resetująca tabelę danego dnia
function resetTable(day) {
    if (confirm('Czy na pewno chcesz zresetować tabelę?')) {
        const tableBody = document.getElementById(`${day}-body`);
        tableBody.innerHTML = ''; // Usunięcie wszystkich wierszy
        localStorage.removeItem(`${day}-data`); // Usunięcie danych z localStorage
    }
}

// Funkcja ładująca historię treningów
function loadHistory() {
    const historyBody = document.getElementById('history-table-body');
    historyBody.innerHTML = ''; // Czyścimy obecne dane
    const historyData = JSON.parse(localStorage.getItem('history-data')) || [];

    historyData.forEach((entry, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${escapeHTML(entry.date)}</td>
            <td>${escapeHTML(entry.day)}</td>
            <td>${escapeHTML(entry.exercise)}</td>
            <td>${escapeHTML(entry.series)}</td>
            <td>${escapeHTML(entry.reps)}</td>
            <td>${escapeHTML(entry.weight)}</td>
            <td>${escapeHTML(entry.notes)}</td>
            <td><button class="btn-reset" onclick="deleteHistoryEntry(${index})">Usuń</button></td>
        `;

        historyBody.appendChild(row);
    });
}

// Funkcja usuwająca pojedynczy wpis z historii
function deleteHistoryEntry(index) {
    let historyData = JSON.parse(localStorage.getItem('history-data')) || [];

    if (index >= 0 && index < historyData.length) {
        historyData.splice(index, 1);
        localStorage.setItem('history-data', JSON.stringify(historyData));
        loadHistory();
    }
}

// Funkcja czyszcząca całą historię
function clearHistory() {
    if (confirm('Czy na pewno chcesz usunąć całą historię?')) {
        localStorage.removeItem('history-data');
        loadHistory();
    }
}

// Funkcja pomocnicza do kapitalizacji pierwszej litery
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Funkcja zabezpieczająca przed XSS (Cross-Site Scripting)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
document.addEventListener("DOMContentLoaded", () => {
  const tables = document.querySelectorAll("table");

  tables.forEach((table) => {
    const headers = table.querySelectorAll("th");

    headers.forEach((header, index) => {
      const resizer = document.createElement("div");
      resizer.classList.add("resizer");
      header.appendChild(resizer);

      let startX;
      let startWidth;

      resizer.addEventListener("mousedown", (e) => {
        startX = e.pageX;
        startWidth = header.offsetWidth;

        const onMouseMove = (e) => {
          const newWidth = startWidth + (e.pageX - startX);
          header.style.width = `${newWidth}px`;

          // Synchronizujemy szerokość wszystkich komórek w tej kolumnie
          table.querySelectorAll(`td:nth-child(${index + 1})`).forEach((cell) => {
            cell.style.width = `${newWidth}px`;
          });
        };

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    });
  });
});