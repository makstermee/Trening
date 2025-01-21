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

// Funkcja filtrująca daty na podstawie wybranego dnia
function showDatesForDay() {
    const selectedDay = document.getElementById("filter-day").value;
    const historyData = JSON.parse(localStorage.getItem("history-data")) || [];
    const dateFilter = document.getElementById("date-filter");

    // Jeśli wybrano "Wszystkie dni", wczytujemy pełną historię
    if (!selectedDay) {
        dateFilter.classList.add("hidden");
        loadHistory(); // Wczytaj wszystkie dane
        return;
    }

    // Filtrujemy unikalne daty dla wybranego dnia
    const uniqueDates = [...new Set(historyData
        .filter(entry => entry.day === selectedDay)
        .map(entry => entry.date)
    )];

    // Jeśli brak dat, ukrywamy filtr daty i czyścimy tabelę
    if (uniqueDates.length === 0) {
        dateFilter.classList.add("hidden");
        document.getElementById("history-table-body").innerHTML = '';
        return;
    }

    // Tworzymy listę dat dla wybranego dnia
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

// Funkcja wczytująca dane dla wybranej daty
function loadHistoryForDate() {
    const selectedDay = document.getElementById("filter-day").value;
    const selectedDate = document.getElementById("filter-date").value;
    const historyData = JSON.parse(localStorage.getItem("history-data")) || [];
    const historyBody = document.getElementById("history-table-body");

    // Jeśli brak daty, czyścimy tabelę
    if (!selectedDate) {
        historyBody.innerHTML = '';
        return;
    }

    // Filtrujemy dane dla wybranego dnia i daty
    const filteredData = historyData.filter(entry => entry.day === selectedDay && entry.date === selectedDate);

    historyBody.innerHTML = ''; // Czyszczenie tabeli

    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="8" style="text-align: center; color: #999;">Brak danych dla wybranej daty</td>
        `;
        historyBody.appendChild(emptyRow);
        return;
    }

    // Dodajemy dane do tabeli
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

// Funkcja wczytująca całą historię
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

    // Dodajemy wszystkie dane do tabeli
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
