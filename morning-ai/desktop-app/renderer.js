// ─── State ───────────────────────────────────────────────
const state = {
  tasks: [],    // [{ id, text, urgent, done }]
  meetings: [], // [{ time, title }]
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

// ─── Date & Greeting ────────────────────────────────────
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

knob.addEventListener('dblclick', () => {
  if (window.electronAPI) window.electronAPI.openOverview();
});

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
    listEl.innerHTML = '<div class="no-meeting">Votre journée est libre 🎉</div>';
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
function renderTasks() {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';

  if (!state.tasks.length) {
    list.innerHTML = '<div class="tasks-empty">Lance une analyse pour voir tes tâches ✨</div>';
    return;
  }

  state.tasks.forEach((task, idx) => {
    const el = buildTaskEl(task, idx);
    list.appendChild(el);
  });

  attachDragHandlers();
}

function buildTaskEl(task, idx) {
  const div = document.createElement('div');
  div.className = `task-item${task.done ? ' done' : ''}${task.urgent ? ' urgent' : ''}`;
  div.dataset.idx = String(idx);

  // Drag handle
  const handle = document.createElement('div');
  handle.className = 'task-drag-handle';
  handle.textContent = '⠿';
  handle.dataset.dragHandle = '1';

  // Checkbox
  const check = document.createElement('div');
  check.className = `task-check${task.done ? ' checked' : ''}`;
  check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  check.addEventListener('click', () => toggleDone(idx));

  // Text (double-click to edit)
  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  text.addEventListener('dblclick', () => startEdit(text, idx));

  // Urgent button
  const urgentBtn = document.createElement('div');
  urgentBtn.className = 'task-urgent-btn';
  urgentBtn.title = task.urgent ? 'Retirer urgence' : 'Marquer urgent';
  if (task.urgent) {
    urgentBtn.innerHTML = `<span class="badge-urgent">⚡ URGENT</span>`;
  } else {
    urgentBtn.innerHTML = `<span class="badge-urgent-add" title="Marquer urgent">⚡</span>`;
  }
  urgentBtn.addEventListener('click', () => toggleUrgent(idx));

  div.appendChild(handle);
  div.appendChild(check);
  div.appendChild(text);
  div.appendChild(urgentBtn);

  return div;
}

// ─── Toggle Done ─────────────────────────────────────────
function toggleDone(idx) {
  state.tasks[idx].done = !state.tasks[idx].done;
  saveState();
  renderTasks();
}

// ─── Toggle Urgent ───────────────────────────────────────
function toggleUrgent(idx) {
  state.tasks[idx].urgent = !state.tasks[idx].urgent;
  // Move urgent tasks to top
  if (state.tasks[idx].urgent) {
    const [task] = state.tasks.splice(idx, 1);
    state.tasks.unshift(task);
  }
  saveState();
  renderTasks();
}

// ─── Inline Edit ─────────────────────────────────────────
function startEdit(textEl, idx) {
  textEl.contentEditable = 'true';
  textEl.focus();

  // Select all text
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
    if (e.key === 'Escape') {
      textEl.textContent = state.tasks[idx].text;
      textEl.contentEditable = 'false';
    }
  }, { once: true });
}

// ─── Drag & Drop Task Reorder ────────────────────────────
let dragSrc = -1;
let dragPointerId = null;

function attachDragHandlers() {
  const list = document.getElementById('tasks-list');
  list.querySelectorAll('.task-drag-handle').forEach((handle) => {
    handle.addEventListener('pointerdown', onDragStart);
  });
}

function onDragStart(e) {
  e.preventDefault();
  e.stopPropagation();

  const item = e.currentTarget.closest('.task-item');
  if (!item) return;

  dragSrc = parseInt(item.dataset.idx);
  dragPointerId = e.pointerId;
  item.classList.add('is-dragging');

  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.addEventListener('pointermove', onDragMove);
  e.currentTarget.addEventListener('pointerup', onDragEnd);
  e.currentTarget.addEventListener('pointercancel', onDragEnd);
}

function onDragMove(e) {
  if (dragSrc < 0) return;
  e.stopPropagation();

  const list = document.getElementById('tasks-list');
  const items = [...list.querySelectorAll('.task-item')];
  const mouseY = e.clientY;

  // Clear previous indicators
  items.forEach(el => el.classList.remove('drop-before', 'drop-after'));

  let targetIdx = null;
  let placed = false;

  for (let i = 0; i < items.length; i++) {
    const idx = parseInt(items[i].dataset.idx);
    if (idx === dragSrc) continue;
    const rect = items[i].getBoundingClientRect();
    if (!placed && mouseY < rect.top + rect.height / 2) {
      items[i].classList.add('drop-before');
      targetIdx = idx;
      placed = true;
    }
  }

  if (!placed && items.length > 0) {
    const lastItem = items[items.length - 1];
    if (parseInt(lastItem.dataset.idx) !== dragSrc) {
      lastItem.classList.add('drop-after');
      targetIdx = -1; // append at end
    }
  }

  e._dropTarget = targetIdx;
  window._lastDropTarget = targetIdx;
}

function onDragEnd(e) {
  if (dragSrc < 0) return;
  e.stopPropagation();

  const list = document.getElementById('tasks-list');
  const items = [...list.querySelectorAll('.task-item')];

  // Clear visuals
  items.forEach(el => el.classList.remove('drop-before', 'drop-after', 'is-dragging'));

  const dropTarget = window._lastDropTarget;
  window._lastDropTarget = undefined;

  // Reorder array
  if (dropTarget !== undefined && dropTarget !== dragSrc) {
    const [task] = state.tasks.splice(dragSrc, 1);
    if (dropTarget === null || dropTarget === -1) {
      state.tasks.push(task);
    } else {
      // Adjust for removed element
      const adjustedTarget = dropTarget > dragSrc ? dropTarget - 1 : dropTarget;
      state.tasks.splice(adjustedTarget, 0, task);
    }
    saveState();
    renderTasks();
  }

  dragSrc = -1;
  dragPointerId = null;
}

// ─── Receive data from Dashboard ────────────────────────
if (window.electronAPI && window.electronAPI.onWidgetData) {
  window.electronAPI.onWidgetData((payload) => {
    if (!payload || !payload.data) return;
    const ai = payload.data;

    // Update greeting with user name from analysis
    if (ai.recap) {
      // Extract first name from recap for greeting (keep it simple)
    }

    // ── Meetings: use real todayMeetings from API ──────
    if (ai.todayMeetings && Array.isArray(ai.todayMeetings)) {
      state.meetings = ai.todayMeetings.map(m => ({
        time: m.time || '',
        title: m.title || m.name || '',
      }));
    } else if (payload.rawCounts && payload.rawCounts.meetings !== undefined) {
      // Fallback: we only know the count
      const n = payload.rawCounts.meetings;
      document.getElementById('meetings-title').textContent =
        `${n} Réunion${n > 1 ? 's' : ''} aujourd'hui`;
    }
    renderMeetings();
    if (state.meetings.length > 0) meetingsBlock.classList.add('open');

    // ── Tasks: urgentAlerts + topTasks + aiSuggestions ──
    const newTasks = [];

    // Urgent alerts → urgent tasks
    const alerts = ai.urgentAlerts || [];
    alerts.slice(0, 3).forEach((a, i) => {
      newTasks.push({
        id: `alert-${i}`,
        text: a.sender ? `${a.sender}: ${a.text}` : a.text,
        urgent: true,
        done: false,
      });
    });

    // Top tasks from To Do
    const top = ai.topTasks || [];
    top.slice(0, 4).forEach((t, i) => {
      newTasks.push({
        id: `task-${i}`,
        text: t.title,
        urgent: t.priority === 'high',
        done: false,
      });
    });

    // AI suggestions as normal tasks
    const sugs = ai.aiSuggestions || [];
    sugs.slice(0, 3).forEach((s, i) => {
      newTasks.push({
        id: `sug-${i}`,
        text: typeof s === 'string' ? s : s.text || s,
        urgent: false,
        done: false,
      });
    });

    // Merge with existing tasks (preserve done/urgent edits by id)
    const existingMap = {};
    state.tasks.forEach(t => { existingMap[t.id] = t; });

    state.tasks = newTasks.map(t => {
      const existing = existingMap[t.id];
      if (existing) return { ...t, done: existing.done, urgent: existing.urgent, text: existing.text };
      return t;
    });

    saveState();
    renderTasks();

    // Status
    document.getElementById('footer-status').textContent = '⚡ Données Microsoft en direct';
    document.getElementById('card-status').classList.remove('waiting');
  });
}

// ─── Initial render ──────────────────────────────────────
renderTasks();
