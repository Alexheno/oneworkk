// ─── State ───────────────────────────────────────────────
const state = {
  tasks: [],
  meetings: [],
};

let chatToken = null;
let chatContext = null;
let conversationHistory = [];
let pendingAction = null;
let isChatInputFocused = false;

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

applyTheme(localStorage.getItem('widget-theme') || 'dark');

if (window.electronAPI && window.electronAPI.onThemeChange) {
  window.electronAPI.onThemeChange((theme) => applyTheme(theme === 'light' ? 'light' : 'dark'));
}

// ─── Date ────────────────────────────────────────────────
function updateDate() {
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  const s = new Date().toLocaleDateString('fr-FR', opts);
  document.getElementById('current-date').textContent = s.charAt(0).toUpperCase() + s.slice(1);
}
updateDate();

// ─── Mode Toggle (Brief / Chat) ──────────────────────────
const briefPanel = document.getElementById('brief-panel');
const chatPanel = document.getElementById('chat-panel');
const modeBriefBtn = document.getElementById('mode-brief');
const modeChatBtn = document.getElementById('mode-chat');

function switchMode(mode) {
  if (mode === 'chat') {
    briefPanel.style.display = 'none';
    chatPanel.style.display = 'flex';
    modeChatBtn.classList.add('active');
    modeBriefBtn.classList.remove('active');
    document.getElementById('chat-input').focus();
  } else {
    chatPanel.style.display = 'none';
    briefPanel.style.display = 'block';
    modeBriefBtn.classList.add('active');
    modeChatBtn.classList.remove('active');
  }
}

modeBriefBtn.addEventListener('click', () => switchMode('brief'));
modeChatBtn.addEventListener('click', () => switchMode('chat'));

// ─── Hover: open / close card ────────────────────────────
const widgetContainer = document.getElementById('widget-container');
const knob = document.querySelector('.knob');
let hoverTimeout;

function openWidget() {
  clearTimeout(hoverTimeout);
  if (window.electronAPI && !isDraggingWindow) window.electronAPI.setIgnoreMouseEvents(false);
  if (!isDraggingWindow) {
    widgetContainer.classList.remove('widget-closed');
    widgetContainer.classList.add('widget-open');
  }
}

function closeWidget() {
  if (isChatInputFocused) return;
  clearTimeout(hoverTimeout);
  hoverTimeout = setTimeout(() => {
    if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    widgetContainer.classList.remove('widget-open');
    widgetContainer.classList.add('widget-closed');
  }, 300);
}

// Le .card est positionné en absolute hors des bounds du container,
// donc on écoute séparément mouseenter/leave sur container ET sur la carte.
widgetContainer.addEventListener('mouseenter', openWidget);
widgetContainer.addEventListener('mouseleave', closeWidget);
card.addEventListener('mouseenter', () => clearTimeout(hoverTimeout));
card.addEventListener('mouseleave', closeWidget);

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
    </div>`).join('');
}

renderMeetings();

// ─── Tasks ───────────────────────────────────────────────
function sortTasks() {
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
    state.tasks.forEach((task, idx) => list.appendChild(buildTaskEl(task, idx)));
  }
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
  urgentBtn.innerHTML = task.urgent
    ? `<span class="badge-urgent">⚡ URGENT</span>`
    : `<span class="badge-urgent-add">⚡</span>`;
  urgentBtn.addEventListener('click', () => toggleUrgent(idx));

  div.appendChild(handle);
  div.appendChild(check);
  div.appendChild(text);
  div.appendChild(urgentBtn);
  return div;
}

function showAddInput() {
  const list = document.getElementById('tasks-list');
  const addBtn = list.querySelector('.task-add-btn');
  if (!addBtn) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-add-input';
  input.placeholder = 'Nouvelle tâche... (Entrée)';
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

function toggleDone(idx) {
  state.tasks[idx].done = !state.tasks[idx].done;
  saveState();
  renderTasks();
}

function toggleUrgent(idx) {
  state.tasks[idx].urgent = !state.tasks[idx].urgent;
  saveState();
  renderTasks();
}

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
    if (newText) { state.tasks[idx].text = newText; saveState(); }
    else textEl.textContent = state.tasks[idx].text;
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
  let placed = false;
  for (const item of items) {
    if (parseInt(item.dataset.idx) === dragSrc) continue;
    const rect = item.getBoundingClientRect();
    if (!placed && e.clientY < rect.top + rect.height / 2) {
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
    if (dropTarget === -1) state.tasks.push(task);
    else state.tasks.splice(dropTarget > dragSrc ? dropTarget - 1 : dropTarget, 0, task);
    saveState();
    renderTasks();
  }
  dragSrc = -1;
}

// ─── CHAT LOGIC ──────────────────────────────────────────
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const aiOrb = document.getElementById('ai-orb');
const aiOrbLabel = document.getElementById('ai-orb-label');
const chatMessages = document.getElementById('chat-messages');
const confirmCard = document.getElementById('confirm-card');
const confirmTextEl = document.getElementById('confirm-text-el');

const BACKEND_URL = 'https://oneworkk-production.up.railway.app';

chatInput.addEventListener('focus', () => {
  isChatInputFocused = true;
  clearTimeout(hoverTimeout);
  if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(false);
});

chatInput.addEventListener('blur', () => {
  isChatInputFocused = false;
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});

sendBtn.addEventListener('click', handleSend);

function setOrbState(orbState) {
  aiOrb.classList.remove('thinking', 'speaking');
  if (orbState === 'thinking') {
    aiOrb.classList.add('thinking');
    aiOrbLabel.textContent = 'Alex · Analyse...';
  } else if (orbState === 'speaking') {
    aiOrb.classList.add('speaking');
    aiOrbLabel.textContent = 'Alex · Répond';
  } else {
    aiOrbLabel.textContent = 'Alex · Prêt';
  }
}

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function showThinking() {
  const div = document.createElement('div');
  div.className = 'chat-msg ai thinking-dots';
  div.id = 'thinking-bubble';
  div.innerHTML = `<div class="dots-anim"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideThinking() {
  const el = document.getElementById('thinking-bubble');
  if (el) el.remove();
}

function showConfirm(text, action) {
  pendingAction = action;
  confirmTextEl.textContent = text;
  confirmCard.classList.add('visible');
}

function hideConfirm() {
  confirmCard.classList.remove('visible');
  pendingAction = null;
}

document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
  hideConfirm();
  addMessage('ai', 'Action annulée.');
});

document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
  if (!pendingAction) return;
  const action = pendingAction;
  hideConfirm();
  setOrbState('thinking');
  showThinking();
  try {
    const resp = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: chatToken, executeAction: action })
    });
    const data = await resp.json();
    hideThinking();
    setOrbState('idle');
    if (data.success) {
      addMessage('ai', '✓ Fait. Action exécutée avec succès.');
    } else {
      addMessage('ai', `Erreur : ${data.error || 'Action échouée.'}`);
    }
  } catch (err) {
    hideThinking();
    setOrbState('idle');
    addMessage('ai', 'Erreur de connexion.');
  }
});

async function handleSend() {
  const text = chatInput.value.trim();
  if (!text || !chatToken) {
    if (!chatToken) addMessage('ai', 'Connectez-vous d\'abord via OneWork pour activer l\'agent.');
    return;
  }

  chatInput.value = '';
  addMessage('user', text);
  setOrbState('thinking');
  showThinking();
  sendBtn.disabled = true;

  try {
    const resp = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: chatToken,
        message: text,
        conversationHistory: conversationHistory.slice(-10),
        context: chatContext
      })
    });

    const data = await resp.json();
    hideThinking();
    setOrbState('speaking');

    if (!data.success) {
      addMessage('ai', `Erreur : ${data.error || 'Problème serveur.'}`);
      setOrbState('idle');
      sendBtn.disabled = false;
      return;
    }

    // Update history
    conversationHistory.push({ role: 'user', content: text });
    conversationHistory.push({ role: 'assistant', content: data.response });

    if (data.needsConfirmation && data.action) {
      addMessage('ai', data.response);
      showConfirm(data.confirmText || data.response, data.action);
    } else {
      addMessage('ai', data.response);
    }

    setTimeout(() => setOrbState('idle'), 1500);
  } catch (err) {
    hideThinking();
    setOrbState('idle');
    addMessage('ai', 'Impossible de joindre le serveur.');
  }

  sendBtn.disabled = false;
}

// ─── Speech Recognition (mic) ────────────────────────────
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.addEventListener('click', () => {
    if (micBtn.classList.contains('listening')) {
      recognition.stop();
    } else {
      recognition.start();
      micBtn.classList.add('listening');
      setOrbState('thinking');
      aiOrbLabel.textContent = 'Alex · Écoute...';
    }
  });

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    chatInput.value = transcript;
    micBtn.classList.remove('listening');
    setOrbState('idle');
    handleSend();
  };

  recognition.onerror = () => {
    micBtn.classList.remove('listening');
    setOrbState('idle');
  };

  recognition.onend = () => {
    micBtn.classList.remove('listening');
  };
} else {
  micBtn.style.display = 'none';
}

// ─── Receive data from Dashboard ────────────────────────
if (window.electronAPI && window.electronAPI.onWidgetData) {
  window.electronAPI.onWidgetData((payload) => {
    if (!payload || !payload.data) return;
    const ai = payload.data;

    // Store token and context for chat
    if (payload.token) chatToken = payload.token;
    chatContext = { ...ai, rawData: payload.rawData };

    // Meetings
    if (ai.todayMeetings && Array.isArray(ai.todayMeetings)) {
      state.meetings = ai.todayMeetings.map(m => ({ time: m.time || '', title: m.title || '' }));
    }
    renderMeetings();
    if (state.meetings.length > 0) meetingsBlock.classList.add('open');

    // Tasks
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

    const existingMap = {};
    state.tasks.forEach(t => { existingMap[t.id] = t; });
    const manualTasks = state.tasks.filter(t => t.id.startsWith('manual-'));
    state.tasks = [
      ...newTasks.map(t => existingMap[t.id] ? { ...t, done: existingMap[t.id].done, urgent: existingMap[t.id].urgent, text: existingMap[t.id].text } : t),
      ...manualTasks
    ];

    saveState();
    renderTasks();
    document.getElementById('footer-status').textContent = '⚡ Données Microsoft en direct';
    document.getElementById('card-status').classList.remove('waiting');
  });
}

// ─── Morning Brief ───────────────────────────────────────
const morningOverlay = document.getElementById('morning-overlay');
const morningOrb     = document.getElementById('morning-orb');
const morningLabel   = document.getElementById('morning-label');
const morningScript  = document.getElementById('morning-script');
const morningClose   = document.getElementById('morning-close');

let morningUtterance = null;

async function openMorningBrief(script) {
  // Force widget open
  widgetContainer.classList.remove('widget-closed');
  widgetContainer.classList.add('widget-open');
  if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(false);

  morningScript.textContent = script;
  morningOverlay.classList.add('visible');
  morningOrb.classList.add('speaking');
  morningLabel.textContent = 'Alex · Génération voix...';

  // TTS via OpenAI (backend)
  try {
    const resp = await fetch(`${BACKEND_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: script })
    });
    if (!resp.ok) throw new Error('TTS indisponible');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    morningUtterance = new Audio(url);
    morningLabel.textContent = 'Alex · Lecture en cours...';
    morningUtterance.onended = () => {
      morningOrb.classList.remove('speaking');
      morningLabel.textContent = 'Alex · Terminé';
    };
    morningUtterance.play();
  } catch {
    morningOrb.classList.remove('speaking');
    morningLabel.textContent = 'Alex · Brief matinal';
  }
}

function closeMorningBrief() {
  if (morningUtterance) { morningUtterance.pause(); morningUtterance.src = ''; }
  morningOrb.classList.remove('speaking');
  morningOverlay.classList.remove('visible');
  morningLabel.textContent = 'Alex · Brief matinal';
}

morningClose.addEventListener('click', closeMorningBrief);

if (window.electronAPI && window.electronAPI.onMorningBrief) {
  window.electronAPI.onMorningBrief((data) => {
    openMorningBrief(data.script);
  });
}

// ─── Initial render ──────────────────────────────────────
renderTasks();
