/* ============================================
   EDUFIT — script.js
   Eduardo's Personal Workout App
   ============================================ */

'use strict';

// ============================================
// CONSTANTS & CONFIG
// ============================================

const DAYS_CONFIG = [
  { name: 'Segunda-feira', short: 'Seg', group: 'Perna completa',        icon: '🦵', rest: false },
  { name: 'Terça-feira',   short: 'Ter', group: 'Peito · Ombro · Tríceps', icon: '💪', rest: false },
  { name: 'Quarta-feira',  short: 'Qua', group: 'Costas · Bíceps',        icon: '🏋️', rest: false },
  { name: 'Quinta-feira',  short: 'Qui', group: 'Descanso',                icon: '😴', rest: true  },
  { name: 'Sexta-feira',   short: 'Sex', group: 'Perna completa',          icon: '🦵', rest: false },
  { name: 'Sábado',        short: 'Sáb', group: 'Superior completo',       icon: '💥', rest: false },
  { name: 'Domingo',       short: 'Dom', group: 'Opcional',                icon: '🎯', rest: false },
];

const STORAGE_KEYS = {
  exercises:    'edufit_exercises',
  history:      'edufit_history',
  weekDone:     'edufit_week_done',
  settings:     'edufit_settings',
  weekStart:    'edufit_week_start',
  totalWorkouts:'edufit_total_workouts',
};

const DEFAULT_SETTINGS = {
  restTimer: 90,
};

// ============================================
// STATE
// ============================================

let state = {
  currentView: 'dashboard',
  currentDay: null,          // 0-6
  workoutActive: false,
  workoutDayIndex: null,
  editingExerciseId: null,
  timerInterval: null,
  timerSeconds: 0,
  timerTotal: 0,
  duplicateTargetDay: null,
  confirmCallback: null,
  exercises: {},             // { dayIndex: [ {id, name, series, reps, load, notes, favorite} ] }
  history: [],               // [ {date, dayIndex, exercises, timestamp} ]
  weekDone: [],              // array of dayIndex completed this week
  settings: { ...DEFAULT_SETTINGS },
  totalWorkouts: 0,
};

// ============================================
// STORAGE HELPERS
// ============================================

function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.error('Storage error:', e); }
}

function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch(e) { return fallback; }
}

function loadAllState() {
  state.exercises     = loadFromStorage(STORAGE_KEYS.exercises, {});
  state.history       = loadFromStorage(STORAGE_KEYS.history, []);
  state.weekDone      = loadFromStorage(STORAGE_KEYS.weekDone, []);
  state.settings      = { ...DEFAULT_SETTINGS, ...loadFromStorage(STORAGE_KEYS.settings, {}) };
  state.totalWorkouts = loadFromStorage(STORAGE_KEYS.totalWorkouts, 0);
  checkWeekReset();
}

function saveExercises() { saveToStorage(STORAGE_KEYS.exercises, state.exercises); }
function saveHistory()   { saveToStorage(STORAGE_KEYS.history,   state.history); }
function saveWeekDone()  { saveToStorage(STORAGE_KEYS.weekDone,  state.weekDone); }
function saveSettings()  { saveToStorage(STORAGE_KEYS.settings,  state.settings); }
function saveTotalWorkouts() { saveToStorage(STORAGE_KEYS.totalWorkouts, state.totalWorkouts); }

// ============================================
// WEEK RESET LOGIC
// ============================================

function checkWeekReset() {
  const storedStart = loadFromStorage(STORAGE_KEYS.weekStart, null);
  const now = new Date();
  // Week starts on Monday
  const monday = getMonday(now);
  const mondayStr = monday.toISOString().split('T')[0];
  if (storedStart !== mondayStr) {
    // New week — reset weekDone
    state.weekDone = [];
    saveWeekDone();
    saveToStorage(STORAGE_KEYS.weekStart, mondayStr);
  }
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function confirmResetWeek() {
  openConfirm('Reset Semanal', 'Isso vai apagar o progresso desta semana. Continuar?', () => {
    state.weekDone = [];
    saveWeekDone();
    showToast('Semana resetada! 💪');
    renderDashboard();
    updateSidebarBadges();
  });
}

function confirmResetAll() {
  openConfirm('Apagar Tudo', 'Isso vai apagar TODOS os dados permanentemente. Tem certeza?', () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    state.exercises = {};
    state.history = [];
    state.weekDone = [];
    state.settings = { ...DEFAULT_SETTINGS };
    state.totalWorkouts = 0;
    showToast('Todos os dados apagados.');
    renderDashboard();
    updateSidebarBadges();
  });
}

// ============================================
// NAVIGATION
// ============================================

function navigateTo(view) {
  state.currentView = view;
  state.currentDay = null;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  // Update topbar title
  const titles = { dashboard: 'EduFit', progress: 'Evolução', settings: 'Configurações' };
  document.getElementById('topbarTitle').textContent = titles[view] || 'EduFit';

  // Update nav active
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.view === view) el.classList.add('active');
  });

  // Render
  if (view === 'dashboard') renderDashboard();
  if (view === 'progress')  renderProgress();
  if (view === 'settings')  renderSettings();

  closeSidebar();
  closeSearch();
}

function navigateToDay(dayIndex) {
  state.currentView = 'day';
  state.currentDay = dayIndex;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-day').classList.add('active');

  const cfg = DAYS_CONFIG[dayIndex];
  document.getElementById('dayTitle').textContent = cfg.name;
  document.getElementById('daySubtitle').textContent = cfg.group;
  document.getElementById('topbarTitle').textContent = cfg.short;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.day == dayIndex) el.classList.add('active');
  });

  renderDayView(dayIndex);
  closeSidebar();
  closeSearch();
}

// ============================================
// SIDEBAR TOGGLE
// ============================================

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ============================================
// SEARCH
// ============================================

function openSearch() {
  document.getElementById('searchBar').classList.add('open');
  document.getElementById('searchInput').focus();
}

function closeSearch() {
  document.getElementById('searchBar').classList.remove('open');
  document.getElementById('searchInput').value = '';
}

function searchExercises(query) {
  if (!query.trim()) return;
  const q = query.toLowerCase();
  const results = [];
  Object.entries(state.exercises).forEach(([dayIdx, exList]) => {
    exList.forEach(ex => {
      if (ex.name.toLowerCase().includes(q)) {
        results.push({ ...ex, dayIdx: parseInt(dayIdx) });
      }
    });
  });
  // Navigate to first matching day
  if (results.length > 0) {
    navigateToDay(results[0].dayIdx);
    closeSearch();
    // Highlight found exercise briefly
    setTimeout(() => {
      const el = document.getElementById(`ex-card-${results[0].id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.borderColor = 'var(--accent)';
        setTimeout(() => { el.style.borderColor = ''; }, 1500);
      }
    }, 300);
  } else {
    showToast('Nenhum exercício encontrado.');
  }
}

// ============================================
// DASHBOARD RENDER
// ============================================

function renderDashboard() {
  renderGreeting();
  renderWeekGrid();
  renderStats();
  renderTodayCard();
  renderLastWorkout();
}

function renderGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const emojis = ['💪','🔥','⚡','🏋️','🎯'];
  const em = emojis[Math.floor(Math.random() * emojis.length)];
  document.getElementById('dashGreeting').textContent = `${greet}, Eduardo! ${em}`;
}

function renderWeekGrid() {
  const grid = document.getElementById('weekGrid');
  const todayDow = getTodayDayIndex(); // 0=Mon,...,6=Sun
  grid.innerHTML = '';

  DAYS_CONFIG.forEach((cfg, i) => {
    const isToday = i === todayDow;
    const isDone  = state.weekDone.includes(i);
    const isRest  = cfg.rest;
    const div = document.createElement('div');
    div.className = `week-day ${isToday ? 'today' : ''} ${isDone ? 'done' : ''} ${isRest ? 'rest' : ''}`;
    div.innerHTML = `
      <span class="week-day-name">${cfg.short}</span>
      <div class="week-day-dot" title="${cfg.name}">${isDone ? '✓' : isRest ? '—' : ''}</div>
    `;
    div.style.cursor = 'pointer';
    div.onclick = () => navigateToDay(i);
    grid.appendChild(div);
  });

  // Progress bar
  const trainingDays = DAYS_CONFIG.filter(d => !d.rest).length; // 6
  const doneDays = state.weekDone.filter(i => !DAYS_CONFIG[i].rest).length;
  const pct = Math.round((doneDays / trainingDays) * 100);
  document.getElementById('weekProgressBar').style.width = pct + '%';
}

function renderStats() {
  const trainingDays = DAYS_CONFIG.filter(d => !d.rest).length;
  const doneDays = state.weekDone.filter(i => !DAYS_CONFIG[i].rest).length;
  const pct = Math.round((doneDays / trainingDays) * 100);

  document.getElementById('statWeekCount').textContent = doneDays;
  document.getElementById('statWeekProgress').textContent = pct + '%';
  document.getElementById('statTotalWorkouts').textContent = state.totalWorkouts;
  document.getElementById('statStreak').textContent = calcStreak();
}

function calcStreak() {
  // Count consecutive days with completed workouts from history
  if (!state.history.length) return 0;
  const sorted = [...state.history].sort((a,b) => b.timestamp - a.timestamp);
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0,0,0,0);
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i].timestamp);
    d.setHours(0,0,0,0);
    const diff = Math.round((checkDate - d) / 86400000);
    if (diff === 0 || diff === streak) { streak++; checkDate = d; }
    else break;
  }
  return streak;
}

function renderTodayCard() {
  const todayIdx = getTodayDayIndex();
  const cfg = DAYS_CONFIG[todayIdx];
  const container = document.getElementById('todayContent');

  if (cfg.rest) {
    container.innerHTML = `
      <div style="padding:20px;text-align:center;color:var(--text-muted)">
        <div style="font-size:36px">😴</div>
        <p style="margin-top:8px">Dia de descanso — recupere-se bem!</p>
      </div>`;
    return;
  }

  const exercises = state.exercises[todayIdx] || [];
  const done = state.weekDone.includes(todayIdx);

  container.innerHTML = `
    <div style="padding:16px 20px">
      <div class="today-day-name">${cfg.name}</div>
      <div class="today-group-name">${cfg.group}</div>
      ${done ? '<span class="workout-active-indicator" style="animation:none;color:var(--accent);border-color:var(--border-accent);background:var(--accent-glow)">✓ Treino Concluído</span>' : ''}
      <div class="today-quick-list" style="margin-top:${done?'12px':'0'}">
        ${exercises.slice(0, 4).map(ex => `
          <div class="today-ex-row">
            <span>${ex.name}</span>
            <span class="ex-load">${ex.load ? ex.load+'kg' : ex.series+'x'+ex.reps}</span>
          </div>`).join('')}
        ${exercises.length > 4 ? `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:6px">+${exercises.length-4} exercícios</div>` : ''}
        ${exercises.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Nenhum exercício cadastrado para hoje.</p>' : ''}
      </div>
      <button class="btn btn-primary today-go-btn" onclick="navigateToDay(${todayIdx})" style="margin-top:14px;width:100%">
        ${done ? '👁 Ver Treino' : '▶ Ir para o Treino'}
      </button>
    </div>`;
}

function renderLastWorkout() {
  const container = document.getElementById('lastWorkoutContent');
  if (!state.history.length) {
    container.innerHTML = '<p class="empty-msg">Nenhum treino registrado ainda.</p>';
    return;
  }
  const last = [...state.history].sort((a,b) => b.timestamp - a.timestamp)[0];
  const cfg = DAYS_CONFIG[last.dayIndex];
  const date = new Date(last.timestamp).toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' });
  container.innerHTML = `
    <div style="padding:16px 20px">
      <div class="today-day-name" style="font-size:22px">${cfg.name}</div>
      <div class="today-group-name">${cfg.group}</div>
      <p style="font-size:13px;color:var(--text-muted);margin:6px 0 12px">${date}</p>
      <div class="today-quick-list">
        ${last.exercises.slice(0,3).map(ex => `
          <div class="today-ex-row">
            <span>${ex.name}</span>
            <span class="ex-load">${ex.load ? ex.load+'kg' : ex.series+'x'+ex.reps}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

// ============================================
// DAY VIEW RENDER
// ============================================

function renderDayView(dayIndex) {
  const cfg = DAYS_CONFIG[dayIndex];
  const restMsg = document.getElementById('restDayMsg');
  const emptyState = document.getElementById('emptyState');
  const exList = document.getElementById('exerciseList');
  const controls = document.getElementById('workoutControls');

  if (cfg.rest) {
    restMsg.classList.remove('hidden');
    emptyState.classList.add('hidden');
    exList.innerHTML = '';
    controls.classList.add('hidden');
    return;
  }

  restMsg.classList.add('hidden');
  controls.classList.remove('hidden');

  const exercises = state.exercises[dayIndex] || [];

  if (exercises.length === 0) {
    emptyState.classList.remove('hidden');
    exList.innerHTML = '';
  } else {
    emptyState.classList.add('hidden');
    renderExerciseList(dayIndex);
  }

  updateDayProgress(dayIndex);
  updateWorkoutButtons();
}

function renderExerciseList(dayIndex) {
  const exercises = state.exercises[dayIndex] || [];
  const list = document.getElementById('exerciseList');
  list.innerHTML = '';

  exercises.forEach((ex, idx) => {
    const card = buildExerciseCard(ex, dayIndex, idx);
    list.appendChild(card);
  });
}

function buildExerciseCard(ex, dayIndex, idx) {
  const div = document.createElement('div');
  div.id = `ex-card-${ex.id}`;
  div.className = `exercise-card ${ex.done ? 'done' : ''} ${ex.favorite ? 'favorite' : ''}`;

  // Load history for PR/last
  const history = getExerciseHistory(ex.name);
  const lastLoad = history.length > 0 ? history[history.length - 1].load : null;
  const prLoad   = history.length > 0 ? Math.max(...history.map(h => h.load || 0)) : null;

  // Series dots (only in workout mode)
  const dotsHtml = state.workoutActive ? buildSeriesDots(ex) : '';

  // Load update input (workout mode)
  const loadInput = state.workoutActive ? `
    <div class="load-update">
      <label>Carga usada:</label>
      <input type="number" min="0" step="0.5" value="${ex.load || ''}" placeholder="kg"
        onchange="updateExerciseLoad('${ex.id}', this.value)" />
      <span style="font-size:12px;color:var(--text-muted)">kg</span>
    </div>` : '';

  div.innerHTML = `
    <div class="exercise-header" onclick="toggleExerciseExpand('${ex.id}')">
      <button class="ex-check" onclick="toggleExerciseDone(event, '${ex.id}', ${dayIndex})">${ex.done ? '✓' : ''}</button>
      <div class="ex-info">
        <div class="ex-name">${ex.name}</div>
        <div class="ex-meta">
          <span>📋 ${ex.series} séries</span>
          <span>🔁 ${ex.reps} reps</span>
          ${ex.load ? `<span>⚖️ ${ex.load}kg</span>` : ''}
        </div>
      </div>
      <div class="ex-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="openEditExercise('${ex.id}', ${dayIndex})" title="Editar">✏️</button>
        <button class="btn-icon danger" onclick="deleteExercise('${ex.id}', ${dayIndex})" title="Excluir">🗑</button>
      </div>
    </div>
    <div class="exercise-body">
      <div class="load-history">
        ${lastLoad ? `<span class="load-tag last">🕐 Última: ${lastLoad}kg</span>` : ''}
        ${prLoad   ? `<span class="load-tag pr">🏆 PR: ${prLoad}kg</span>` : ''}
        ${!lastLoad && !prLoad ? '<span style="font-size:12px;color:var(--text-muted)">Sem histórico de carga</span>' : ''}
      </div>
      ${dotsHtml}
      ${loadInput}
      ${ex.notes ? `<div class="ex-notes">💡 ${ex.notes}</div>` : ''}
    </div>
  `;

  return div;
}

function buildSeriesDots(ex) {
  const count = parseInt(ex.series) || 4;
  let html = '<div class="series-tracker">';
  for (let i = 0; i < count; i++) {
    const done = ex.seriesDone && ex.seriesDone[i];
    html += `<div class="series-dot ${done ? 'done' : ''}" onclick="toggleSerie(event, '${ex.id}', ${i})">${i+1}</div>`;
  }
  html += '</div>';
  return html;
}

function toggleExerciseExpand(id) {
  const card = document.getElementById(`ex-card-${id}`);
  if (card) card.classList.toggle('expanded');
}

function toggleExerciseDone(e, id, dayIndex) {
  e.stopPropagation();
  const exercises = state.exercises[dayIndex] || [];
  const ex = exercises.find(e => e.id === id);
  if (!ex) return;
  ex.done = !ex.done;
  saveExercises();
  renderExerciseList(dayIndex);
  updateDayProgress(dayIndex);
}

function toggleSerie(e, exId, serieIdx) {
  e.stopPropagation();
  if (!state.currentDay && state.currentDay !== 0) return;
  const dayIndex = state.currentDay;
  const exercises = state.exercises[dayIndex] || [];
  const ex = exercises.find(e => e.id === exId);
  if (!ex) return;
  if (!ex.seriesDone) ex.seriesDone = {};
  ex.seriesDone[serieIdx] = !ex.seriesDone[serieIdx];
  saveExercises();

  // Update just the dot
  const dot = e.target;
  dot.classList.toggle('done');

  // Start rest timer after completing a serie
  if (ex.seriesDone[serieIdx]) {
    startRestTimer();
  }
}

function updateExerciseLoad(id, value) {
  const dayIndex = state.currentDay;
  if (dayIndex === null) return;
  const exercises = state.exercises[dayIndex] || [];
  const ex = exercises.find(e => e.id === id);
  if (!ex) return;
  ex.load = parseFloat(value) || 0;
  saveExercises();
}

function updateDayProgress(dayIndex) {
  const exercises = state.exercises[dayIndex] || [];
  const total = exercises.length;
  const done  = exercises.filter(e => e.done).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('dayProgressBar').style.width = pct + '%';
  document.getElementById('exerciseProgressText').textContent = `${done}/${total} exercícios`;
}

// ============================================
// ADD / EDIT EXERCISE
// ============================================

function openAddExercise() {
  state.editingExerciseId = null;
  document.getElementById('modalTitle').textContent = 'Adicionar Exercício';
  document.getElementById('exName').value = '';
  document.getElementById('exSeries').value = '4';
  document.getElementById('exReps').value = '12';
  document.getElementById('exLoad').value = '';
  document.getElementById('exNotes').value = '';
  document.getElementById('exFavorite').checked = false;
  document.getElementById('exerciseModal').classList.add('open');
  setTimeout(() => document.getElementById('exName').focus(), 100);
}

function openEditExercise(id, dayIndex) {
  const exercises = state.exercises[dayIndex] || [];
  const ex = exercises.find(e => e.id === id);
  if (!ex) return;

  state.editingExerciseId = id;
  document.getElementById('modalTitle').textContent = 'Editar Exercício';
  document.getElementById('exName').value    = ex.name;
  document.getElementById('exSeries').value  = ex.series;
  document.getElementById('exReps').value    = ex.reps;
  document.getElementById('exLoad').value    = ex.load || '';
  document.getElementById('exNotes').value   = ex.notes || '';
  document.getElementById('exFavorite').checked = ex.favorite || false;
  document.getElementById('exerciseModal').classList.add('open');
}

function closeExerciseModal() {
  document.getElementById('exerciseModal').classList.remove('open');
  state.editingExerciseId = null;
}

function saveExercise() {
  const name    = document.getElementById('exName').value.trim();
  const series  = parseInt(document.getElementById('exSeries').value) || 4;
  const reps    = document.getElementById('exReps').value.trim() || '12';
  const load    = parseFloat(document.getElementById('exLoad').value) || 0;
  const notes   = document.getElementById('exNotes').value.trim();
  const favorite= document.getElementById('exFavorite').checked;

  if (!name) { showToast('Informe o nome do exercício.', 'error'); return; }

  const dayIndex = state.currentDay;
  if (dayIndex === null) { closeExerciseModal(); return; }

  if (!state.exercises[dayIndex]) state.exercises[dayIndex] = [];

  if (state.editingExerciseId) {
    // Edit
    const ex = state.exercises[dayIndex].find(e => e.id === state.editingExerciseId);
    if (ex) { ex.name = name; ex.series = series; ex.reps = reps; ex.load = load; ex.notes = notes; ex.favorite = favorite; }
    showToast('Exercício atualizado! ✏️', 'success');
  } else {
    // Add
    state.exercises[dayIndex].push({
      id: genId(),
      name, series, reps, load, notes, favorite,
      done: false,
      seriesDone: {},
    });
    showToast('Exercício adicionado! 💪', 'success');
  }

  saveExercises();
  closeExerciseModal();
  renderDayView(dayIndex);
  updateSidebarBadges();
}

function deleteExercise(id, dayIndex) {
  openConfirm('Excluir Exercício', 'Tem certeza que deseja excluir este exercício?', () => {
    state.exercises[dayIndex] = (state.exercises[dayIndex] || []).filter(e => e.id !== id);
    saveExercises();
    renderDayView(dayIndex);
    updateSidebarBadges();
    showToast('Exercício removido.');
  });
}

// ============================================
// WORKOUT MODE
// ============================================

function startWorkout() {
  const dayIndex = state.currentDay;
  if (dayIndex === null) return;

  const exercises = state.exercises[dayIndex] || [];
  if (exercises.length === 0) {
    showToast('Adicione exercícios antes de iniciar.', 'error');
    return;
  }

  state.workoutActive = true;
  state.workoutDayIndex = dayIndex;

  // Reset done / seriesDone
  exercises.forEach(ex => {
    ex.done = false;
    ex.seriesDone = {};
  });
  saveExercises();

  updateWorkoutButtons();
  renderExerciseList(dayIndex);
  document.getElementById('workoutStatus').innerHTML =
    '<span class="workout-active-indicator">● ATIVO</span>';
  showToast('Treino iniciado! Bora! 🔥', 'success');
}

function finishWorkout() {
  const dayIndex = state.workoutDayIndex;
  if (dayIndex === null) return;

  const exercises = state.exercises[dayIndex] || [];

  // Save loads to history
  exercises.forEach(ex => {
    if (ex.load) {
      addExerciseLoadHistory(ex.name, ex.load);
    }
  });

  // Save workout to history
  const entry = {
    id: genId(),
    date: new Date().toISOString().split('T')[0],
    dayIndex,
    exercises: exercises.map(ex => ({ name: ex.name, series: ex.series, reps: ex.reps, load: ex.load })),
    timestamp: Date.now(),
  };
  state.history.push(entry);
  saveHistory();

  // Mark day done
  if (!state.weekDone.includes(dayIndex)) {
    state.weekDone.push(dayIndex);
    saveWeekDone();
  }

  state.totalWorkouts++;
  saveTotalWorkouts();

  state.workoutActive = false;
  state.workoutDayIndex = null;

  stopRestTimer();
  updateWorkoutButtons();
  renderExerciseList(dayIndex);
  updateDayProgress(dayIndex);
  updateSidebarBadges();
  document.getElementById('workoutStatus').innerHTML = '';

  showToast('Treino finalizado! Excelente! 🏆', 'success');
}

function updateWorkoutButtons() {
  const startBtn  = document.getElementById('startWorkoutBtn');
  const finishBtn = document.getElementById('finishWorkoutBtn');
  if (state.workoutActive) {
    startBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
  } else {
    startBtn.classList.remove('hidden');
    finishBtn.classList.add('hidden');
  }
}

// ============================================
// REST TIMER
// ============================================

function startRestTimer() {
  const seconds = state.settings.restTimer;
  state.timerSeconds = seconds;
  state.timerTotal   = seconds;

  const overlay = document.getElementById('timerOverlay');
  const display = document.getElementById('timerDisplay');
  const ring    = document.getElementById('timerRingFg');
  const circumference = 2 * Math.PI * 54; // 339.3

  overlay.classList.remove('hidden');
  display.textContent = seconds;
  ring.style.strokeDashoffset = '0';

  clearInterval(state.timerInterval);

  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    display.textContent = state.timerSeconds;
    const progress = (state.timerTotal - state.timerSeconds) / state.timerTotal;
    ring.style.strokeDashoffset = (progress * circumference).toFixed(2);

    if (state.timerSeconds <= 0) {
      clearInterval(state.timerInterval);
      overlay.classList.add('hidden');
      showToast('Descansou! Próxima série. 💪', 'success');
      // Vibrate if available
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);
}

function stopRestTimer() {
  clearInterval(state.timerInterval);
  document.getElementById('timerOverlay').classList.add('hidden');
}

function skipTimer() {
  stopRestTimer();
}

// ============================================
// DUPLICATE DAY
// ============================================

function openDuplicateModal() {
  const from = state.currentDay;
  if (from === null) return;
  state.duplicateTargetDay = null;

  document.getElementById('dupFromLabel').textContent = DAYS_CONFIG[from].name;
  const container = document.getElementById('dupDayOptions');
  container.innerHTML = '';

  DAYS_CONFIG.forEach((cfg, i) => {
    if (i === from || cfg.rest) return;
    const label = document.createElement('label');
    label.className = 'dup-option';
    label.innerHTML = `
      <input type="radio" name="dupTarget" value="${i}" onchange="state.duplicateTargetDay=${i}" />
      <span>${cfg.icon}</span>
      <div>
        <div style="font-weight:600">${cfg.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${cfg.group}</div>
      </div>`;
    container.appendChild(label);
  });

  document.getElementById('duplicateModal').classList.add('open');
}

function closeDuplicateModal() {
  document.getElementById('duplicateModal').classList.remove('open');
}

function confirmDuplicate() {
  const from = state.currentDay;
  const to   = state.duplicateTargetDay;
  if (to === null) { showToast('Selecione o dia de destino.', 'error'); return; }

  const source = JSON.parse(JSON.stringify(state.exercises[from] || []));
  // Give new IDs
  const copies = source.map(ex => ({ ...ex, id: genId(), done: false, seriesDone: {} }));
  state.exercises[to] = copies;
  saveExercises();
  closeDuplicateModal();
  updateSidebarBadges();
  showToast(`Treino copiado para ${DAYS_CONFIG[to].name}! 📋`, 'success');
}

// ============================================
// PROGRESS / CHART VIEW
// ============================================

function renderProgress() {
  renderChartExerciseSelect();
  renderHistory();
  renderChart();
}

function renderChartExerciseSelect() {
  const select = document.getElementById('chartExerciseSelect');
  const names = getAllExerciseNames();
  select.innerHTML = '<option value="">Selecione um exercício...</option>';
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function getAllExerciseNames() {
  const names = new Set();
  Object.values(state.exercises).forEach(list => list.forEach(ex => names.add(ex.name)));
  // Also from history
  state.history.forEach(h => h.exercises.forEach(ex => names.add(ex.name)));
  return [...names].sort();
}

function getExerciseHistory(name) {
  // Aggregate loads from workout history
  const points = [];
  const sorted = [...state.history].sort((a,b) => a.timestamp - b.timestamp);
  sorted.forEach(entry => {
    const ex = entry.exercises.find(e => e.name === name);
    if (ex && ex.load) {
      points.push({ date: entry.date, load: ex.load, timestamp: entry.timestamp });
    }
  });
  return points;
}

function addExerciseLoadHistory(name, load) {
  // This is now handled within finishWorkout via history entry
  // No separate store needed — history entries contain loads
}

function renderChart() {
  const select  = document.getElementById('chartExerciseSelect');
  const canvas  = document.getElementById('progressChart');
  const emptyMsg= document.getElementById('chartEmptyMsg');
  const name    = select.value;

  if (!name) {
    canvas.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  const history = getExerciseHistory(name);
  if (history.length === 0) {
    canvas.style.display = 'none';
    emptyMsg.textContent = 'Sem histórico de carga para este exercício.';
    emptyMsg.style.display = 'block';
    return;
  }

  canvas.style.display = 'block';
  emptyMsg.style.display = 'none';

  drawLineChart(canvas, history, name);
}

function drawLineChart(canvas, data, label) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.parentElement.clientWidth - 40;
  const H   = 260;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,W,H);

  const PAD = { top: 30, right: 24, bottom: 50, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const loads = data.map(d => d.load);
  const minL  = Math.max(0, Math.min(...loads) - 5);
  const maxL  = Math.max(...loads) + 5;
  const range = maxL - minL || 1;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + chartH - (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();

    // Y labels
    const val = minL + (i / 4) * range;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px DM Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(1) + 'kg', PAD.left - 6, y + 4);
  }

  // X labels (dates)
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px DM Sans, sans-serif';
  data.forEach((d, i) => {
    const x = PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const dateStr = new Date(d.timestamp).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
    ctx.fillText(dateStr, x, H - PAD.bottom + 16);
  });

  // Line path
  const pts = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: PAD.top  + chartH - ((d.load - minL) / range) * chartH,
  }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
  grad.addColorStop(0, 'rgba(232,255,71,0.25)');
  grad.addColorStop(1, 'rgba(232,255,71,0)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length > 2) {
    for (let i = 1; i < pts.length - 1; i++) {
      const cpX = (pts[i].x + pts[i+1].x) / 2;
      const cpY = (pts[i].y + pts[i+1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, cpX, cpY);
    }
    ctx.quadraticCurveTo(pts[pts.length-1].x, pts[pts.length-1].y, pts[pts.length-1].x, pts[pts.length-1].y);
  } else if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  }
  ctx.lineTo(pts[pts.length-1].x, PAD.top + chartH);
  ctx.lineTo(pts[0].x, PAD.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length > 2) {
    for (let i = 1; i < pts.length - 1; i++) {
      const cpX = (pts[i].x + pts[i+1].x) / 2;
      const cpY = (pts[i].y + pts[i+1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, cpX, cpY);
    }
    ctx.quadraticCurveTo(pts[pts.length-1].x, pts[pts.length-1].y, pts[pts.length-1].x, pts[pts.length-1].y);
  } else if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  }
  ctx.strokeStyle = '#e8ff47';
  ctx.lineWidth   = 2.5;
  ctx.shadowColor = '#e8ff47';
  ctx.shadowBlur  = 8;
  ctx.stroke();
  ctx.shadowBlur  = 0;

  // Dots
  pts.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle   = '#e8ff47';
    ctx.shadowColor = '#e8ff47';
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur  = 0;
    // Value label
    ctx.fillStyle   = '#f0f0f8';
    ctx.font        = 'bold 11px DM Sans, sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText(data[i].load + 'kg', pt.x, pt.y - 12);
  });
}

function renderHistory() {
  const container = document.getElementById('historyList');
  if (!state.history.length) {
    container.innerHTML = '<p class="empty-msg">Nenhum treino registrado ainda.</p>';
    return;
  }
  const sorted = [...state.history].sort((a,b) => b.timestamp - a.timestamp);
  container.innerHTML = sorted.map(h => {
    const cfg  = DAYS_CONFIG[h.dayIndex];
    const date = new Date(h.timestamp).toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', year:'2-digit' });
    return `
      <div class="history-item">
        <div>
          <div class="history-day">${cfg.icon} ${cfg.name}</div>
          <div class="history-date">${date}</div>
        </div>
        <span class="history-excount">${h.exercises.length} ex.</span>
      </div>`;
  }).join('');
}

// ============================================
// SETTINGS
// ============================================

function renderSettings() {
  // Mark active timer button
  document.querySelectorAll('.timer-opt').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.sec) === state.settings.restTimer);
  });
}

function setRestTimer(seconds) {
  state.settings.restTimer = seconds;
  saveSettings();
  document.querySelectorAll('.timer-opt').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.sec) === seconds);
  });
  showToast(`Timer de descanso: ${seconds}s`, 'success');
}

// ============================================
// SIDEBAR BADGES
// ============================================

function updateSidebarBadges() {
  DAYS_CONFIG.forEach((cfg, i) => {
    const badge = document.getElementById(`badge-${i}`);
    if (!badge) return;
    const count = (state.exercises[i] || []).length;
    badge.classList.toggle('show', count > 0);

    // Today highlight
    const navItem = document.querySelector(`.nav-item[data-day="${i}"]`);
    if (!navItem) return;
    const todayIdx = getTodayDayIndex();
    navItem.classList.toggle('today-highlight', i === todayIdx && !cfg.rest);
    navItem.classList.toggle('done-day', state.weekDone.includes(i));
  });
}

// ============================================
// EXPORT / IMPORT
// ============================================

function exportData() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    exercises:    state.exercises,
    history:      state.history,
    weekDone:     state.weekDone,
    settings:     state.settings,
    totalWorkouts:state.totalWorkouts,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `edufit-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado! 💾', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.exercises) throw new Error('Formato inválido');
      openConfirm('Importar Dados', 'Isso vai substituir todos os dados atuais. Continuar?', () => {
        state.exercises     = data.exercises    || {};
        state.history       = data.history      || [];
        state.weekDone      = data.weekDone     || [];
        state.settings      = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
        state.totalWorkouts = data.totalWorkouts || 0;
        saveExercises(); saveHistory(); saveWeekDone(); saveSettings(); saveTotalWorkouts();
        renderDashboard();
        updateSidebarBadges();
        showToast('Dados importados com sucesso! ✅', 'success');
      });
    } catch(err) {
      showToast('Arquivo inválido ou corrompido.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // reset input
}

// ============================================
// CONFIRM MODAL
// ============================================

function openConfirm(title, msg, callback) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  state.confirmCallback = callback;
  document.getElementById('confirmModal').classList.add('open');
  document.getElementById('confirmOkBtn').onclick = () => { closeConfirm(); callback(); };
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('open');
  state.confirmCallback = null;
}

// ============================================
// TOAST
// ============================================

let toastTimeout;

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

// ============================================
// UTILITIES
// ============================================

function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Returns 0=Mon, 1=Tue, ... 6=Sun (matches DAYS_CONFIG)
function getTodayDayIndex() {
  const dow = new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
  return dow === 0 ? 6 : dow - 1;
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeExerciseModal();
    closeDuplicateModal();
    closeConfirm();
    stopRestTimer();
    closeSearch();
    closeSidebar();
  }
  if (e.key === '/' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    openSearch();
  }
});

// ============================================
// PWA — SERVICE WORKER REGISTRATION
// ============================================

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('[EduFit] SW registrado:', reg.scope))
        .catch(err => console.warn('[EduFit] SW falhou:', err));
    });
  }
}

// ============================================
// INIT
// ============================================

function init() {
  loadAllState();
  registerServiceWorker();
  navigateTo('dashboard');
  updateSidebarBadges();

  // Highlight today in sidebar
  const todayIdx = getTodayDayIndex();
  const todayNav = document.querySelector(`.nav-item[data-day="${todayIdx}"]`);
  if (todayNav && !DAYS_CONFIG[todayIdx].rest) {
    todayNav.classList.add('today-highlight');
  }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
