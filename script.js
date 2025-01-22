/*****************************************************************
  MAPA DNI TYGODNIA (angielskie ID -> polskie nazwy)
*****************************************************************/
const dayMap = {
  monday: "Poniedziałek",
  tuesday: "Wtorek",
  wednesday: "Środa",
  thursday: "Czwartek",
  friday: "Piątek",
  saturday: "Sobota",
  sunday: "Niedziela"
};

const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

/*****************************************************************
  1. SHOW SECTION
*****************************************************************/
function showSection() {
  const sections = document.querySelectorAll('.day-section');
  sections.forEach(sec => sec.classList.add('hidden'));
  
  const selected = document.getElementById('day-selector').value;
  const toShow = document.getElementById(selected);
  if(toShow) toShow.classList.remove('hidden');
}

/*****************************************************************
  2. DOMContentLoaded
*****************************************************************/
document.addEventListener('DOMContentLoaded', () => {
  // Ładujemy karty i grupy mięśniowe
  allDays.forEach(day => {
    loadCardsData(day);
    loadMuscleGroup(day);
  });
});

/*****************************************************************
  3. DODAWANIE NOWEJ KARTY
*****************************************************************/
function addCard(day) {
  const exercise = document.getElementById(`${day}-exercise`).value.trim();
  const series   = document.getElementById(`${day}-series`).value.trim();
  const reps     = document.getElementById(`${day}-reps`).value.trim();
  const weight   = document.getElementById(`${day}-weight`).value.trim();
  const notes    = document.getElementById(`${day}-notes`).value.trim();

  if(!exercise && !series && !reps && !weight && !notes) return;

  // Tworzymy obiekt
  const cardData = { exercise, series, reps, weight, notes };

  const stored = JSON.parse(localStorage.getItem(day + '-data')) || [];
  stored.push(cardData);
  localStorage.setItem(day + '-data', JSON.stringify(stored));

  // Czyścimy formularz
  document.getElementById(`${day}-exercise`).value = '';
  document.getElementById(`${day}-series`).value   = '';
  document.getElementById(`${day}-reps`).value     = '';
  document.getElementById(`${day}-weight`).value   = '';
  document.getElementById(`${day}-notes`).value    = '';

  loadCardsData(day);
}

/*****************************************************************
  4. ŁADOWANIE KART Z ROZWIJANYMI DETALAMI
*****************************************************************/
function loadCardsData(day) {
  const container = document.getElementById(day + '-cards');
  if(!container) return;

  container.innerHTML = '';
  const stored = JSON.parse(localStorage.getItem(day + '-data')) || [];

  stored.forEach((card, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('exercise-card');

    // Nagłówek
    const headerDiv = document.createElement('div');
    headerDiv.classList.add('exercise-card-header');
    headerDiv.textContent = card.exercise || '(brak ćwiczenia)';

    // Detale (ukryte)
    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('exercise-card-details');
    detailsDiv.innerHTML = `
      <p><strong>Serie:</strong> ${escapeHTML(card.series) || '-'}</p>
      <p><strong>Powtórzenia:</strong> ${escapeHTML(card.reps) || '-'}</p>
      <p><strong>Ciężar (kg):</strong> ${escapeHTML(card.weight) || '-'}</p>
      <p><strong>Notatki:</strong> ${escapeHTML(card.notes) || '-'}</p>
      <button class="btn-reset" onclick="deleteCard('${day}', ${index})">Usuń</button>
    `;

    // Kliknięcie w nagłówek -> toggle detale + strzałkę
    headerDiv.addEventListener('click', () => {
      detailsDiv.classList.toggle('show');
      headerDiv.classList.toggle('expanded');
    });

    cardDiv.appendChild(headerDiv);
    cardDiv.appendChild(detailsDiv);
    container.appendChild(cardDiv);
  });
}

/*****************************************************************
  5. USUWANIE KARTY
*****************************************************************/
function deleteCard(day, index) {
  const stored = JSON.parse(localStorage.getItem(day + '-data')) || [];
  if(index<0 || index>=stored.length) return;

  stored.splice(index,1);
  localStorage.setItem(day + '-data', JSON.stringify(stored));

  loadCardsData(day);
}

/*****************************************************************
  6. RESETOWANIE KART
*****************************************************************/
function resetCards(day) {
  if(confirm('Czy na pewno chcesz zresetować wszystkie ćwiczenia?')) {
    localStorage.removeItem(day + '-data');
    const container = document.getElementById(day + '-cards');
    if(container) container.innerHTML='';
  }
}

/*****************************************************************
  7. GRUPA MIĘŚNIOWA (ZAPIS / ODCZYT)
*****************************************************************/
function saveMuscleGroups() {
  allDays.forEach(day => {
    const inp = document.getElementById(day + '-muscle-group');
    if(!inp) return;
    localStorage.setItem(day + '-muscle-group', inp.value.trim());
  });
}
function loadMuscleGroup(day) {
  const inp = document.getElementById(day + '-muscle-group');
  if(!inp) return;
  // UWAGA: Miej pewność, że tu nie ma literówki
  inp.value = localStorage.getItem(day + '-muscle-group') || '';
}

/*****************************************************************
  8. ZAPIS (SAVE) KART DO HISTORII
*****************************************************************/
function saveToHistory(day) {
  const stored = JSON.parse(localStorage.getItem(day + '-data')) || [];
  let historyData = JSON.parse(localStorage.getItem('history-data')) || [];
  const date = new Date().toLocaleDateString();
  
  const dayName = dayMap[day] || 'Nieznany dzień';

  stored.forEach(card => {
    // Jeśli cokolwiek wypełnione
    if(Object.values(card).some(val => val!=='')) {
      historyData.push({
        date: date,
        day: dayName,
        exercise: card.exercise,
        series: card.series,
        reps: card.reps,
        weight: card.weight,
        notes: card.notes
      });
    }
  });

  localStorage.setItem('history-data', JSON.stringify(historyData));
  alert('Dane zostały zapisane do historii!');
}

/*****************************************************************
  9. HISTORIA (FILTR) 
*****************************************************************/
function showDatesForDay() {
  const selectedDay= document.getElementById("filter-day").value;
  const historyData= JSON.parse(localStorage.getItem("history-data"))||[];
  const dateFilter = document.getElementById("date-filter");
  const historyBody= document.getElementById("history-table-body");

  if(!selectedDay) {
    dateFilter.classList.add("hidden");
    historyBody.innerHTML='';
    return;
  }
  const uniqueDates=[...new Set(
    historyData.filter(e=> e.day===selectedDay).map(e=> e.date)
  )];
  if(uniqueDates.length===0){
    dateFilter.classList.add("hidden");
    historyBody.innerHTML='';
    return;
  }
  dateFilter.classList.remove("hidden");

  const dateSelect= document.getElementById("filter-date");
  dateSelect.innerHTML=`<option value="">Wybierz datę</option>`;
  uniqueDates.forEach(d=>{
    const opt= document.createElement('option');
    opt.value=d; opt.textContent=d;
    dateSelect.appendChild(opt);
  });
  historyBody.innerHTML='';
}

function loadHistoryForDate() {
  const selectedDay= document.getElementById("filter-day").value;
  const selectedDate=document.getElementById("filter-date").value;
  const historyBody= document.getElementById("history-table-body");
  const historyData= JSON.parse(localStorage.getItem("history-data"))||[];

  if(!selectedDate){
    historyBody.innerHTML='';
    return;
  }
  const filtered= historyData.filter(e=> e.day===selectedDay && e.date===selectedDate);
  historyBody.innerHTML='';
  if(filtered.length===0){
    const emptyRow= document.createElement('tr');
    emptyRow.innerHTML=`<td colspan="6" style="text-align:center;color:#999;">Brak danych dla wybranej daty</td>`;
    historyBody.appendChild(emptyRow);
    return;
  }
  filtered.forEach((entry,index)=>{
    const row= document.createElement('tr');
    row.innerHTML=`
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

function deleteHistoryEntryFiltered(dayName, date, indexInFiltered){
  let historyData= JSON.parse(localStorage.getItem('history-data'))||[];
  const filtered= historyData.filter(e=> e.day===dayName && e.date===date);
  if(indexInFiltered<0 || indexInFiltered>=filtered.length) return;
  filtered.splice(indexInFiltered,1);
  historyData= historyData.filter(e=>!(e.day===dayName && e.date===date));
  historyData= historyData.concat(filtered);
  localStorage.setItem('history-data', JSON.stringify(historyData));
  loadHistoryForDate();
}

/*****************************************************************
  10. USUWANIE WPISÓW Z HISTORII (BEZ FILTRA)
*****************************************************************/
function loadHistory(){
  const historyBody= document.getElementById('history-table-body');
  if(!historyBody) return;
  historyBody.innerHTML='';
  const historyData= JSON.parse(localStorage.getItem('history-data'))||[];
  if(historyData.length===0){
    const emptyRow= document.createElement('tr');
    emptyRow.innerHTML=`
      <td colspan="6" style="text-align:center;color:#999;">Brak zapisanej historii</td>`;
    historyBody.appendChild(emptyRow);
    return;
  }
  historyData.forEach((entry,index)=>{
    const row= document.createElement('tr');
    row.innerHTML=`
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

function deleteHistoryEntry(index){
  let historyData= JSON.parse(localStorage.getItem('history-data'))||[];
  if(index>=0 && index<historyData.length){
    historyData.splice(index,1);
    localStorage.setItem('history-data', JSON.stringify(historyData));
    loadHistory();
  }
}

/*****************************************************************
  ZABEZPIECZENIE XSS
*****************************************************************/
function escapeHTML(str){
  if(!str) return '';
  return str
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
