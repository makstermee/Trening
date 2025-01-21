// Tablica przechowująca historię treningów
let trainingHistory = JSON.parse(localStorage.getItem('trainingHistory')) || [];

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

    loadHistory();
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
function showDatesForDay() {
    const selectedDay = document.getElementById("filter-day").value;
    const historyData = JSON.parse(localStorage.getItem("history-data")) || [];
    const dateFilter = document.getElementById("date-filter");

    // Jeśli nie wybrano dnia, ukrywamy filtr dat i czyścimy tabelę
    if (!selectedDay) {
        dateFilter.classList.add("hidden");
        document.getElementById("history-table-body").innerHTML = '';
        return;
    }

    // Filtrujemy unikalne daty dla wybranego dnia
    const uniqueDates = [...new Set(historyData
        .filter(entry => entry.day === selectedDay)
        .map(entry => entry.date)
    )];

    // Jeśli brak dat, ukrywamy filtr dat i czyścimy tabelę
    if (uniqueDates.length === 0) {
        dateFilter.classList.add("hidden");
        document.getElementById("history-table-body").innerHTML = '';
        return;
    }

    // Pokazujemy filtr daty z listą dostępnych dat
    const dateSelect = document.getElementById("filter-date");
    dateSelect.innerHTML = `<option value="">Wybierz datę</option>`;
    uniqueDates.forEach(date => {
        const option = document.createElement("option");
        option.value = date;
        option.textContent = date;
        dateSelect.appendChild(option);
    });

    dateFilter.classList.remove("hidden");
}
function loadHistoryForDate() {
    const selectedDay = document.getElementById("filter-day").value;
    const selectedDate = document.getElementById("filter-date").value;
    const historyData = JSON.parse(localStorage.getItem("history-data")) || [];
    const historyBody = document.getElementById("history-table-body");

    // Jeśli nie wybrano daty, czyścimy tabelę
    if (!selectedDate) {
        historyBody.innerHTML = '';
        return;
    }

    // Filtrujemy dane dla wybranego dnia i daty
    const filteredData = historyData.filter(entry => entry.day === selectedDay && entry.date === selectedDate);

    // Czyścimy tabelę
    historyBody.innerHTML = '';

    // Dodajemy wiersze do tabeli
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="8" style="text-align: center; color: #999;">Brak danych dla wybranej daty</td>
        `;
        historyBody.appendChild(emptyRow);
        return;
    }

    filteredData.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
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
// Usuwanie wiersza z tabeli
function deleteRow(button, day) {
    const row = button.parentElement.parentElement;
    row.remove();
    saveTableData(day);
}

// Zapisywanie danych tabeli do localStorage
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
        if (rowData.exercise || rowData.series || rowData.reps || rowData.weight || rowData.notes) {
            data.push(rowData);
        }
    }

    localStorage.setItem(`${day}-data`, JSON.stringify(data));
}

// Ładowanie danych tabeli z localStorage
function loadTableData(day) {
    const data = JSON.parse(localStorage.getItem(`${day}-data`)) || [];
    const tableBody = document.getElementById(`${day}-body`);

    tableBody.innerHTML = ""; // Czyszczenie tabeli przed załadowaniem nowych danych
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

// Zapisywanie grup mięśniowych
function saveMuscleGroups() {
    allDays.forEach(day => {
        const muscleGroup = document.getElementById(`${day}-muscle-group`).value.trim();
        localStorage.setItem(`${day}-muscle-group`, muscleGroup);
    });
}

// Ładowanie grup mięśniowych
function loadMuscleGroup(day) {
    const muscleGroup = localStorage.getItem(`${day}-muscle-group`) || '';
    document.getElementById(`${day}-muscle-group`).value = muscleGroup;
}

// Zapisywanie treningu do historii
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
        if (entry.exercise || entry.series || entry.reps || entry.weight || entry.notes) {
            historyData.push(entry);
        }
    }

    localStorage.setItem('history-data', JSON.stringify(historyData));
    loadHistory();
    alert('Dane zostały zapisane do historii.');
}

// Ładowanie historii treningów
function loadHistory() {
    const historyBody = document.getElementById('history-table-body');
    historyBody.innerHTML = '';
    const historyData = JSON.parse(localStorage.getItem('history-data')) || [];

    if (historyData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="8" style="text-align: center; color: #999;">Brak zapisanej historii</td>
        `;
        historyBody.appendChild(emptyRow);
        return;
    }

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

// Usuwanie wpisu z historii
function deleteHistoryEntry(index) {
    const historyData = JSON.parse(localStorage.getItem('history-data')) || [];
    if (index >= 0 && index < historyData.length) {
        historyData.splice(index, 1);
        localStorage.setItem('history-data', JSON.stringify(historyData));
        loadHistory();
    }
}

// Funkcje pomocnicze
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
