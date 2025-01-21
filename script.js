// Tablica przechowująca historię treningów
let trainingHistory = JSON.parse(localStorage.getItem('history-data')) || [];

// Lista wszystkich dni
const allDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Funkcja do pokazywania wybranej sekcji
function showSection() {
    const sections = document.querySelectorAll('.day-section');
    sections.forEach(section => section.classList.add('hidden'));

    const selectedDay = document.getElementById('day-selector').value;
    const sectionToShow = document.getElementById(selectedDay);

    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    }
}

// Inicjalizacja danych po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    allDays.forEach(day => {
        loadTableData(day);
        loadMuscleGroup(day);
    });

    loadHistory(); // Wczytaj pełną historię przy starcie
});

// Dodawanie wiersza do tabeli
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

// Funkcja zapisująca dane tabeli do localStorage
function saveTableData(day) {
    const tableBody = document.getElementById(`${day}-body`);
    const rows = tableBody.querySelectorAll('tr');
    const data = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = {
            exercise: cells[0].querySelector('input').value.trim(),
            series: cells[1].querySelector('input').value.trim(),
            reps: cells[2].querySelector('input').value.trim(),
            weight: cells[3].querySelector('input').value.trim(),
            notes: cells[4].querySelector('input').value.trim()
        };

        if (Object.values(rowData).some(value => value !== "")) {
            data.push(rowData);
        }
    });

    localStorage.setItem(`${day}-data`, JSON.stringify(data));
}

// Funkcja wczytująca dane tabeli z localStorage
function loadTableData(day) {
    const tableBody = document.getElementById(`${day}-body`);
    const data = JSON.parse(localStorage.getItem(`${day}-data`)) || [];

    tableBody.innerHTML = '';
    data.forEach(rowData => {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" placeholder="Ćwiczenie" value="${escapeHTML(rowData.exercise)}" oninput="saveTableData('${day}')"></td>
            <td><input type="number" placeholder="Serie" value="${escapeHTML(rowData.series)}" oninput="saveTableData('${day}')"></td>
            <td><input type="number" placeholder="Powtórzenia" value="${escapeHTML(rowData.reps)}" oninput="saveTableData('${day}')"></td>
            <td><input type="number" placeholder="Ciężar (kg)" value="${escapeHTML(rowData.weight)}" oninput="saveTableData('${day}')"></td>
            <td><input type="text" placeholder="Notatki" value="${escapeHTML(rowData.notes)}" oninput="saveTableData('${day}')"></td>
            <td><button class="btn-reset" onclick="deleteRow(this, '${day}')">Usuń</button></td>
        `;
        tableBody.appendChild(newRow);
    });
}

// Funkcja zapisująca dane treningowe do historii
function saveToHistory(day) {
    const date = new Date().toLocaleDateString();
    const tableBody = document.getElementById(`${day}-body`);
    const rows = tableBody.querySelectorAll('tr');
    const historyData = JSON.parse(localStorage.getItem('history-data')) || [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const entry = {
            date: date,
            day: capitalizeFirstLetter(day),
            exercise: cells[0].querySelector('input').value.trim(),
            series: cells[1].querySelector('input').value.trim(),
            reps: cells[2].querySelector('input').value.trim(),
            weight: cells[3].querySelector('input').value.trim(),
            notes: cells[4].querySelector('input').value.trim()
        };

        if (Object.values(entry).some(value => value !== "")) {
            historyData.push(entry);
        }
    });

    localStorage.setItem('history-data', JSON.stringify(historyData));
    alert('Dane zapisane w historii!');
    loadHistory(); // Odświeżenie historii
}

// Funkcja wczytująca historię
function loadHistory() {
    const historyBody = document.getElementById('history-table-body');
    const historyData = JSON.parse(localStorage.getItem('history-data')) || [];

    historyBody.innerHTML = '';
    if (historyData.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">Brak zapisanej historii</td>
            </tr>
        `;
        return;
    }

    historyData.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHTML(entry.date)}</td>
            <td>${escapeHTML(entry.day)}</td>
            <td>${escapeHTML(entry.exercise)}</td>
            <td>${escapeHTML(entry.series)}</td>
            <td>${escapeHTML(entry.reps)}</td>
            <td>${escapeHTML(entry.weight)}</td>
            <td>${escapeHTML(entry.notes)}</td>
        `;
        historyBody.appendChild(row);
    });
}

// Funkcja pomocnicza do ochrony przed XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
