// ─── State ───────────────────────────────────────────────
const state = {
  tasks: [],    // [{ id, text, urgent, done }]
  meetings: [],
};

function loadState() {
  try {
    const saved = localStorage.getItem('widget-tasks');
    if (saved) state.tasks = JSON.parse(saved);
  } catch (_) {}
}

function saveState() {
  localStorage.setItem('widget-tasks', JSON.stringify(state.tasks));
}

loadState();

// ─── Theme ───────────────────────────────────────────────
const card = document.querySelector('.card');

function applyTheme(t) {
  card.dataset.theme = t;
  localStorage.setItem('widget-theme', t);
}

// Init from localStorage (set by main dashboard)
applyTheme(localStorage.getItem('widget-theme') || 'dark');

if (window.electronAPI && window.electronAPI.onThemeChange) {
  window.electronAPI.onThemeChange((theme) => {
    applyTheme(theme === 'light' ? 'light' : 'dark');
  });
}

// ─── Date ────────────────────────────────────────────────
function updateDate() {
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  const s = new Date().toLocaleDateString('fr-FR', opts);
  document.getElementById('current-date').textContent = s.charAt(0).toUpperCase() + s.slice(1);
}
updateDate();

// ─── Hover: open / close card ────────────────────────────
const widgetContainer = document.getElementById('widget-container');
const knob = document.querySelector('.knob');
let hoverTimeout;

widgetContainer.addEventListener('mouseenter', () => {
  clearTimeout(hoverTimeout);
  if (window.electronAPI && !isDraggingWindow) window.electronAPI.setIgnoreMouseEvents(false);
  if (!isDraggingWindow) {
    widgetContainer.classList.remove('widget-closed');
    widgetContainer.classList.add('widget-open');
  }
});

widgetContainer.addEventListener('mouseleave', () => {
  hoverTimeout = setTimeout(() => {
    if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    widgetContainer.classList.remove('widget-open');
    widgetContainer.classList.add('widget-closed');
  }, 180);
});

// ─── Window Drag (knob) ──────────────────────────────────
let isDraggingWindow = false;
let mouseStartX = 0;
let mouseStartY = 0;

knob.addEventListener('pointerdown', (e) => {
  isDraggingWindow = true;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
  knob.setPointerCapture(e.pointerId);
  widgetContainer.classList.remove('widget-open');
  widgetContainer.classList.add('widget-closed');
});

knob.addEventListener('pointermove', (e) => {
  if (isDraggingWindow && window.electronAPI)
    window.electronAPI.moveWindow(e.screenX - mouseStartX, e.screenY - mouseStartY);
});

knob.addEventListener('pointerup', () => { isDraggingWindow = false; });
knob.addEventListener('dblclick', () => { if (window.electronAPI) window.electronAPI.openOverview(); });

// ─── Meetings Accordion ──────────────────────────────────
const meetingsBlock = document.getElementById('meetings-block');
document.getElementById('meetings-header').addEventListener('click', () => {
  meetingsBlock.classList.toggle('open');
});

function renderMeetings() {
  const titleEl = document.getElementById('meetings-title');
  const listEl = document.getElementById('meetings-list');

  if (!state.meetings.length) {
    titleEl.textContent = 'Aucune réunion aujourd\'hui';
    listEl.innerHTML = '<div class="no-meeting">Journée libre 🎉</div>';
    return;
  }

  const n = state.meetings.length;
  titleEl.textContent = `${n} Réunion${n > 1 ? 's' : ''} aujourd'hui`;
  listEl.innerHTML = state.meetings.map(m => `
    <div class="meeting-item">
      <span class="meeting-time">${m.time || ''}</span>
      <span class="meeting-name" title="${m.title || ''}">${m.title || ''}</span>
    </div>
  `).join('');
}

renderMeetings();

// ─── Task Rendering ──────────────────────────────────────
function sortTasks() {
  // Urgents always first, then non-urgents — stable sort
  state.tasks.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return 0;
  });
}

function renderTasks() {
  sortTasks();
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';

  if (!state.tasks.length) {
    list.innerHTML = '<div class="tasks-empty">Lance une analyse pour voir tes tâches ✨</div>';
  } else {
    state.tasks.forEach((task, idx) => {
      list.appendChild(buildTaskEl(task, idx));
    });
  }

  // Add task button always at bottom
  const addBtn = document.createElement('button');
  addBtn.className = 'task-add-btn';
  addBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter une tâche`;
  addBtn.addEventListener('click', showAddInput);
  list.appendChild(addBtn);

  attachDragHandlers();
}

function buildTaskEl(task, idx) {
  const div = document.createElement('div');
  div.className = `task-item${task.done ? ' done' : ''}${task.urgent ? ' urgent' : ''}`;
  div.dataset.idx = String(idx);

  const handle = document.createElement('div');
  handle.className = 'task-drag-handle';
  handle.textContent = '⠿';
  handle.dataset.dragHandle = '1';

  const check = document.createElement('div');
  check.className = `task-check${task.done ? ' checked' : ''}`;
  check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  check.addEventListener('click', () => toggleDone(idx));

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  text.addEventListener('dblclick', () => startEdit(text, idx));

  const urgentBtn = document.createElement('div');
  urgentBtn.className = 'task-urgent-btn';
  urgentBtn.title = task.urgent ? 'Retirer urgence' : 'Marquer urgent';
  urgentBtn.innerHTML = task.urgent
    ? `<span class="badge-urgent">⚡ URGENT</span>`
    : `<span class="badge-urgent-add" title="Marquer urgent">⚡</span>`;
  urgentBtn.addEventListener('click', () => toggleUrgent(idx));

  div.appendChild(handle);
  div.appendChild(check);
  div.appendChild(text);
  div.appendChild(urgentBtn);
  return div;
}

// ─── Add Task ────────────────────────────────────────────
function showAddInput() {
  const list = document.getElementById('tasks-list');
  const addBtn = list.querySelector('.task-add-btn');
  if (!addBtn) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-add-input';
  input.placeholder = 'Nouvelle tâche... (Entrée pour valider)';
  list.insertBefore(input, addBtn);
  input.focus();

  const confirm = () => {
    const text = input.value.trim();
    if (text) {
      state.tasks.push({ id: `manual-${Date.now()}`, text, urgent: false, done: false });
      saveState();
    }
    renderTasks();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') renderTasks();
  });
  input.addEventListener('blur', confirm);
}

// ─── Toggle Done ─────────────────────────────────────────
function toggleDone(idx) {
  state.tasks[idx].done = !state.tasks[idx].done;
  saveState();
  renderTasks();
}

// ─── Toggle Urgent (trie automatiquement) ────────────────
function toggleUrgent(idx) {
  state.tasks[idx].urgent = !state.tasks[idx].urgent;
  saveState();
  renderTasks(); // sortTasks() appelé dans renderTasks
}

// ─── Inline Edit ─────────────────────────────────────────
function startEdit(textEl, idx) {
  textEl.contentEditable = 'true';
  textEl.focus();
  const range = document.createRange();
  range.selectNodeContents(textEl);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  const save = () => {
    textEl.contentEditable = 'false';
    const newText = textEl.textContent.trim();
    if (newText) {
      state.tasks[idx].text = newText;
      saveState();
    } else {
      textEl.textContent = state.tasks[idx].text;
    }
  };

  textEl.addEventListener('blur', save, { once: true });
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
    if (e.key === 'Escape') { textEl.textContent = state.tasks[idx].text; textEl.contentEditable = 'false'; }
  }, { once: true });
}

// ─── Drag & Drop ─────────────────────────────────────────
let dragSrc = -1;

function attachDragHandlers() {
  document.getElementById('tasks-list').querySelectorAll('.task-drag-handle').forEach(handle => {
    handle.addEventListener('pointerdown', onDragStart);
  });
}

function onDragStart(e) {
  e.preventDefault();
  e.stopPropagation();
  const item = e.currentTarget.closest('.task-item');
  if (!item) return;
  dragSrc = parseInt(item.dataset.idx);
  item.classList.add('is-dragging');
  window._lastDropTarget = undefined;
  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.addEventListener('pointermove', onDragMove);
  e.currentTarget.addEventListener('pointerup', onDragEnd);
  e.currentTarget.addEventListener('pointercancel', onDragEnd);
}

function onDragMove(e) {
  if (dragSrc < 0) return;
  e.stopPropagation();
  const items = [...document.querySelectorAll('.task-item')];
  items.forEach(el => el.classList.remove('drop-before', 'drop-after'));
  const mouseY = e.clientY;
  let placed = false;

  for (const item of items) {
    if (parseInt(item.dataset.idx) === dragSrc) continue;
    const rect = item.getBoundingClientRect();
    if (!placed && mouseY < rect.top + rect.height / 2) {
      item.classList.add('drop-before');
      window._lastDropTarget = parseInt(item.dataset.idx);
      placed = true;
    }
  }

  if (!placed) {
    const last = items.filter(el => parseInt(el.dataset.idx) !== dragSrc).pop();
    if (last) { last.classList.add('drop-after'); window._lastDropTarget = -1; }
  }
}

function onDragEnd(e) {
  if (dragSrc < 0) return;
  e.stopPropagation();
  document.querySelectorAll('.task-item').forEach(el =>
    el.classList.remove('is-dragging', 'drop-before', 'drop-after'));

  const dropTarget = window._lastDropTarget;
  window._lastDropTarget = undefined;

  if (dropTarget !== undefined && dropTarget !== dragSrc) {
    const [task] = state.tasks.splice(dragSrc, 1);
    if (dropTarget === -1) {
      state.tasks.push(task);
    } else {
      const adj = dropTarget > dragSrc ? dropTarget - 1 : dropTarget;
      state.tasks.splice(adj, 0, task);
    }
    saveState();
    renderTasks();
  }

  dragSrc = -1;
}

// ─── Receive data from Dashboard ────────────────────────
if (window.electronAPI && window.electronAPI.onWidgetData) {
  window.electronAPI.onWidgetData((payload) => {
    if (!payload || !payload.data) return;
    const ai = payload.data;

    // Meetings réelles
    if (ai.todayMeetings && Array.isArray(ai.todayMeetings)) {
      state.meetings = ai.todayMeetings.map(m => ({ time: m.time || '', title: m.title || '' }));
    }
    renderMeetings();
    if (state.meetings.length > 0) meetingsBlock.classList.add('open');

    // Tâches depuis l'IA
    const newTasks = [];
    (ai.urgentAlerts || []).slice(0, 3).forEach((a, i) => {
      newTasks.push({ id: `alert-${i}`, text: a.sender ? `${a.sender}: ${a.text}` : a.text, urgent: true, done: false });
    });
    (ai.topTasks || []).slice(0, 4).forEach((t, i) => {
      newTasks.push({ id: `task-${i}`, text: t.title, urgent: t.priority === 'high', done: false });
    });
    (ai.aiSuggestions || []).slice(0, 3).forEach((s, i) => {
      newTasks.push({ id: `sug-${i}`, text: typeof s === 'string' ? s : s.text || s, urgent: false, done: false });
    });

    // Merge: préserve les éditions manuelles et les tâches ajoutées à la main
    const existingMap = {};
    state.tasks.forEach(t => { existingMap[t.id] = t; });
    const merged = newTasks.map(t => existingMap[t.id]
      ? { ...t, done: existingMap[t.id].done, urgent: existingMap[t.id].urgent, text: existingMap[t.id].text }
      : t
    );
    // Garde les tâches manuelles (id commence par "manual-")
    const manualTasks = state.tasks.filter(t => t.id.startsWith('manual-'));
    state.tasks = [...merged, ...manualTasks];

    saveState();
    renderTasks();
    document.getElementById('footer-status').textContent = '⚡ Données Microsoft en direct';
    document.getElementById('card-status').classList.remove('waiting');
  });
}

// ─── Initial render ──────────────────────────────────────
renderTasks();
