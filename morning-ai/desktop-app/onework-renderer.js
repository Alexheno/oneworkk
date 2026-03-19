document.addEventListener('DOMContentLoaded', () => {

  // ─── State ─────────────────────────────────────────────
  let token = null;
  let account = null;
  let allProjects = [];      // projets en mémoire (localStorage + IA)
  let editingProjectIdx = null;

  // ─── Helpers ───────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
  const openUrl = url => window.overviewAPI?.openUrl?.(url);

  // ─── Date / Heure / Contexte ───────────────────────────
  function getTimeContext() {
    const now = new Date();
    const h = now.getHours();
    const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const timeOfDay = h < 12 ? 'matin' : h < 18 ? 'après-midi' : 'soir';
    const currentTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const currentDay = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    return { currentTime, currentDay, timeOfDay };
  }

  function getHabits() {
    try {
      const h = JSON.parse(localStorage.getItem('ow-habits') || '{}');
      const days = Object.keys(h);
      if (!days.length) return null;
      return days.map(d => `${d}: analyse généralement à ${h[d].join(', ')}`).join('; ');
    } catch { return null; }
  }

  function saveHabit() {
    try {
      const now = new Date();
      const day = ['dim','lun','mar','mer','jeu','ven','sam'][now.getDay()];
      const slot = now.getHours() < 12 ? 'matin' : now.getHours() < 18 ? 'après-midi' : 'soir';
      const h = JSON.parse(localStorage.getItem('ow-habits') || '{}');
      if (!h[day]) h[day] = [];
      if (!h[day].includes(slot)) h[day].push(slot);
      localStorage.setItem('ow-habits', JSON.stringify(h));
    } catch {}
  }

  // ─── Date d'affichage ──────────────────────────────────
  const { currentDay } = getTimeContext();
  $('greeting-date').textContent = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

  // ─── Navigation views ──────────────────────────────────
  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${viewId}`));
    document.querySelectorAll('.snav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
  }
  document.querySelectorAll('.snav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // ─── Profile menu ──────────────────────────────────────
  const sidebarUser = $('sidebar-user');
  const profileMenu = $('profile-menu');
  sidebarUser.addEventListener('click', e => {
    e.stopPropagation();
    const open = profileMenu.classList.toggle('open');
    sidebarUser.classList.toggle('open', open);
  });
  document.addEventListener('click', () => {
    profileMenu.classList.remove('open');
    sidebarUser.classList.remove('open');
  });
  profileMenu.addEventListener('click', e => e.stopPropagation());

  // ─── Alarm time (morning brief) ────────────────────────
  const alarmInput = $('alarm-time-input');
  const savedAlarm = localStorage.getItem('ow-alarm') || '07:30';
  alarmInput.value = savedAlarm;
  window.overviewAPI?.setAlarmTime?.(savedAlarm);

  alarmInput.addEventListener('change', () => {
    const t = alarmInput.value;
    localStorage.setItem('ow-alarm', t);
    window.overviewAPI?.setAlarmTime?.(t);
    showNotif(`Brief matinal programmé à ${t}`);
  });

  $('btn-upgrade').addEventListener('click', () => openUrl('https://onework.app/pricing'));
  $('btn-personalisation').addEventListener('click', () => showNotif('Personnalisation disponible dans la prochaine version.'));
  $('btn-settings').addEventListener('click', () => showNotif('Paramètres disponibles dans la prochaine version.'));
  $('btn-help').addEventListener('click', () => openUrl('https://onework.app/help'));
  $('btn-logout').addEventListener('click', logout);

  // ─── Theme toggle ───────────────────────────────────────
  let currentTheme = localStorage.getItem('ow-theme') || 'dark';

  function applyTheme(t) {
    currentTheme = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('ow-theme', t);
    $('theme-label').textContent = t === 'dark' ? 'Thème clair' : 'Thème sombre';
    window.overviewAPI?.setTheme?.(t);
  }

  applyTheme(currentTheme);

  $('btn-theme').addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // ─── Email tabs ────────────────────────────────────────
  document.querySelectorAll('.etab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.etab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.email-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`email-${tab.dataset.etab}`).classList.add('active');
    });
  });

  // ─── External links ────────────────────────────────────
  $('btn-calendar').addEventListener('click', () => openUrl('https://outlook.office.com/calendar/view/day'));
  $('btn-todo').addEventListener('click', () => openUrl('https://to-do.microsoft.com/tasks'));
  $('btn-refresh').addEventListener('click', async () => {
    if (!token) return;
    $('btn-refresh').classList.add('spin');
    await runAnalysis();
    $('btn-refresh').classList.remove('spin');
  });

  // ─── Projects filters ──────────────────────────────────
  document.querySelectorAll('.pf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.dataset.filter);
    });
  });

  // ─── Modal ─────────────────────────────────────────────
  const overlay = $('modal-overlay');
  function openModal(idx) {
    editingProjectIdx = idx;
    const p = allProjects[idx];
    $('modal-name').value = p.name || '';
    $('modal-status').value = p.status || 'En cours';
    $('modal-action').value = p.nextAction || '';
    $('modal-notes').value = p.notes || '';
    overlay.classList.add('open');
  }
  function closeModal() { overlay.classList.remove('open'); editingProjectIdx = null; }
  $('modal-close').addEventListener('click', closeModal);
  $('modal-cancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  $('modal-save').addEventListener('click', () => {
    if (editingProjectIdx === null) return;
    allProjects[editingProjectIdx] = {
      ...allProjects[editingProjectIdx],
      name: $('modal-name').value,
      status: $('modal-status').value,
      nextAction: $('modal-action').value,
      notes: $('modal-notes').value
    };
    saveProjects();
    renderProjects();
    closeModal();
  });

  // ─── Notification ──────────────────────────────────────
  function showNotif(text) {
    $('notif-text').textContent = text;
    $('notif').style.display = 'flex';
    clearTimeout(window._notifTimer);
    window._notifTimer = setTimeout(() => $('notif').style.display = 'none', 4000);
  }
  $('notif-close').addEventListener('click', () => $('notif').style.display = 'none');

  // ─── Connect Microsoft ─────────────────────────────────
  $('btn-connect-ms').addEventListener('click', async () => {
    setBtnState('loading');
    hideError();
    try {
      const auth = await window.overviewAPI.connectMicrosoft();
      if (!auth?.success) throw new Error(auth?.error || 'Échec de l\'authentification');
      token = auth.accessToken;
      account = auth.account;
      // Cache auth for background morning brief scheduler
      window.overviewAPI?.cacheAuth?.({ account, email: account.username, name: account.name });
      setBtnState('analyzing');
      await runAnalysis();
    } catch (err) {
      console.error('[AUTH]', err);
      setBtnState('idle');
      showError(err.message);
    }
  });

  function setBtnState(state) {
    const btn = $('btn-connect-ms');
    btn.disabled = state === 'loading' || state === 'analyzing';
    if (state === 'loading') btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Connexion...`;
    else if (state === 'analyzing') btn.innerHTML = `✦ Analyse IA en cours...`;
    else btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> Continuer avec Microsoft`;
  }
  function showError(msg) { const e = $('auth-error'); e.textContent = '⚠ ' + msg; e.style.display = 'block'; }
  function hideError() { const e = $('auth-error'); e.style.display = 'none'; }

  // ─── Core: analyse ─────────────────────────────────────
  async function runAnalysis() {
    const { currentTime, currentDay, timeOfDay } = getTimeContext();
    const habits = getHabits();
    saveHabit();

    try {
      const resp = await fetch('https://oneworkk-production.up.railway.app/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          email: account.username,
          name: account.name,
          currentTime, currentDay, timeOfDay, habits
        })
      });
      const result = await resp.json();
      if (!result.success || !result.data) throw new Error(result.error || 'Réponse invalide');

      showDashboard(result.data, account, result.rawCounts);
      if (result.morningScript) showWelcomeBrief(result.morningScript, account);
    } catch (err) {
      console.error('[ANALYSE]', err);
      setBtnState('idle');
      showError('Erreur analyse : ' + err.message);
    }
  }

  // ─── Show dashboard ────────────────────────────────────
  function showDashboard(ai, acc, rawCounts) {
    // Transition
    $('onboarding-screen').style.opacity = '0';
    setTimeout(() => {
      $('onboarding-screen').style.display = 'none';
      $('dashboard-screen').classList.add('active');
    }, 300);

    // Greeting
    const firstName = (acc.name || 'vous').split(' ')[0];
    $('greeting-name').textContent = `Bonjour, ${firstName} 👋`;

    // Avatars
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=5865f2&color=fff&size=64&bold=true`;
    $('user-avatar').style.backgroundImage = `url('${avatarUrl}')`;
    $('su-avatar').style.backgroundImage = `url('${avatarUrl}')`;
    $('pm-avatar').style.backgroundImage = `url('${avatarUrl}')`;
    $('su-name').textContent = acc.name || 'OneWork';
    $('pm-name').textContent = acc.name || 'OneWork';
    $('pm-email').textContent = acc.username || '';

    // Recap
    $('recap-text').textContent = ai.recap || 'Analyse terminée.';

    // Cards
    fillEmails(ai);
    fillTeams(ai);
    fillMeetings(ai);
    fillTodos(ai);

    // Plan
    fillPlan(ai);

    // Projects
    mergeProjects(ai.projectOverview || []);

    // Widget
    window.overviewAPI?.updateWidget?.({ success: true, data: ai, token, rawCounts });
  }

  // ─── Fill emails ───────────────────────────────────────
  function fillEmails(ai) {
    const direct = ai.directEmails || [];
    const cc     = ai.ccEmails || [];

    $('email-direct').innerHTML = direct.length
      ? direct.slice(0, 6).map(m => `
          <div class="msg-row fade-in">
            <div class="msg-sender">${esc(m.sender)}</div>
            <div class="msg-body">${esc(m.summary || m.subject)}</div>
          </div>`).join('')
      : '<p style="font-size:.8rem;color:var(--text2);padding:6px 0">Aucun email direct.</p>';

    $('email-cc').innerHTML = cc.length
      ? cc.slice(0, 5).map(m => `
          <div class="msg-row fade-in" style="border-left-color:var(--text2)">
            <div class="msg-sender">${esc(m.sender)}</div>
            <div class="msg-body">${esc(m.summary || m.subject)}</div>
          </div>`).join('')
      : '<p style="font-size:.8rem;color:var(--text2);padding:6px 0">Aucune copie.</p>';
  }

  // ─── Fill Teams ────────────────────────────────────────
  function fillTeams(ai) {
    const msgs = ai.teamsMessages || (ai.urgentAlerts || []).filter(a => a.type === 'teams');
    const badge = $('teams-badge');
    if (msgs.length) { badge.textContent = msgs.length; badge.style.display = ''; }
    else badge.style.display = 'none';

    $('teams-list').innerHTML = msgs.length
      ? msgs.slice(0, 5).map(m => `
          <div class="msg-row teams fade-in">
            <div class="msg-sender">${esc(m.sender)}</div>
            <div class="msg-body">${esc(m.text || m.summary)}</div>
          </div>`).join('')
      : '<p style="font-size:.8rem;color:var(--text2);padding:6px 0">Aucun message Teams.</p>';
  }

  // ─── Fill Meetings ─────────────────────────────────────
  function fillMeetings(ai) {
    const meetings = ai.todayMeetings || [];
    $('meetings-list').innerHTML = meetings.length
      ? meetings.slice(0, 6).map(m => `
          <div class="meeting-row fade-in">
            <span class="meeting-time">${esc(m.time)}</span>
            <div class="meeting-dot"></div>
            <div class="meeting-info">
              <div class="meeting-title">${esc(m.title)}</div>
              ${m.context ? `<div class="meeting-sub">${esc(m.context)}</div>` : ''}
            </div>
          </div>`).join('')
      : '<p style="font-size:.8rem;color:var(--text2);padding:6px 0">Aucune réunion aujourd\'hui.</p>';
  }

  // ─── Fill To Do ────────────────────────────────────────
  function fillTodos(ai) {
    const tasks = ai.topTasks || [];
    $('todo-list').innerHTML = tasks.length
      ? tasks.slice(0, 6).map(t => `
          <div class="todo-row fade-in">
            <div class="todo-check ${t.priority || 'low'}"></div>
            <div class="todo-text">
              <div class="todo-title">${esc(t.title)}</div>
              ${t.due || t.list ? `<div class="todo-meta">${esc(t.list || '')}${t.due ? ` · ${new Date(t.due).toLocaleDateString('fr-FR')}` : ''}</div>` : ''}
            </div>
          </div>`).join('')
      : '<p style="font-size:.8rem;color:var(--text2);padding:6px 0">Aucune tâche en attente.</p>';
  }

  // ─── Fill Plan ─────────────────────────────────────────
  function fillPlan(ai) {
    const plan = ai.taskPlan || [];
    $('plan-list').innerHTML = plan.length
      ? plan.map(t => `
          <div class="plan-item fade-in">
            <span class="plan-time">${esc(t.time || '—')}</span>
            <div class="plan-body">
              <div class="plan-title">${esc(t.task)}</div>
              ${t.context ? `<div class="plan-ctx">${esc(t.context)}</div>` : ''}
            </div>
            <span class="plan-prio prio-${t.priority || 'low'}">${prioLabel(t.priority)}</span>
          </div>`).join('')
      : '<div class="empty-state">Aucun plan généré.</div>';
  }

  // ─── Projects management ───────────────────────────────
  function loadProjects() {
    try { allProjects = JSON.parse(localStorage.getItem('ow-projects') || '[]'); } catch { allProjects = []; }
  }
  function saveProjects() {
    localStorage.setItem('ow-projects', JSON.stringify(allProjects));
  }
  function mergeProjects(aiProjects) {
    loadProjects();
    const existing = allProjects.map(p => p.name.toLowerCase());
    const newOnes = aiProjects.filter(p => !existing.includes(p.name?.toLowerCase()));

    // Merge: update existing, add new
    aiProjects.forEach(ap => {
      const idx = allProjects.findIndex(p => p.name.toLowerCase() === ap.name?.toLowerCase());
      if (idx >= 0) {
        // Update signals but keep user edits
        allProjects[idx] = { ...ap, ...allProjects[idx], signals: ap.signals };
      } else {
        allProjects.push({ ...ap, notes: '' });
      }
    });
    saveProjects();
    renderProjects();

    // Badge + notification for new projects
    if (newOnes.length > 0) {
      $('projects-badge').style.display = '';
      showNotif(`${newOnes.length} nouveau${newOnes.length > 1 ? 'x projets détectés' : ' projet détecté'} — cliquez sur "Projets" pour voir.`);
    }
  }

  function renderProjects(filter = 'all') {
    const grid = $('projects-grid');
    const list = filter === 'all' ? allProjects : allProjects.filter(p => p.status === filter);

    if (!list.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Aucun projet dans cette catégorie.</div>';
      return;
    }

    grid.innerHTML = list.map((p, i) => {
      const realIdx = allProjects.indexOf(p);
      return `
        <div class="project-card fade-in">
          <div class="project-head">
            <span class="project-name">${esc(p.name)}</span>
            <span class="project-status ${statusClass(p.status)}">${esc(p.status)}</span>
          </div>
          <p class="project-action">${esc(p.nextAction)}</p>
          ${p.notes ? `<p style="font-size:.78rem;color:var(--text2);font-style:italic">${esc(p.notes)}</p>` : ''}
          ${p.signals?.length ? `<div class="project-signals">${p.signals.map(s => `<span class="signal-tag">${esc(s)}</span>`).join('')}</div>` : ''}
          <button class="project-edit" data-idx="${realIdx}">Modifier</button>
        </div>`;
    }).join('');

    grid.querySelectorAll('.project-edit').forEach(btn => {
      btn.addEventListener('click', () => openModal(Number(btn.dataset.idx)));
    });
  }

  // Clear badge when visiting projects
  $('btn-projects').addEventListener('click', () => {
    $('projects-badge').style.display = 'none';
  });

  // ─── Logout ────────────────────────────────────────────
  function logout() {
    token = null; account = null;
    $('dashboard-screen').classList.remove('active');
    $('onboarding-screen').style.display = 'flex';
    $('onboarding-screen').style.opacity = '1';
    setBtnState('idle');
    hideError();
    profileMenu.classList.remove('open');
    sidebarUser.classList.remove('open');
  }

  // ─── Helpers ───────────────────────────────────────────
  function prioLabel(p) { return p === 'high' ? 'Urgent' : p === 'medium' ? 'Normal' : 'Faible'; }
  function statusClass(s) {
    if (!s) return 'ps-active';
    const l = s.toLowerCase();
    if (l.includes('retard')) return 'ps-late';
    if (l.includes('bloqu')) return 'ps-blocked';
    if (l.includes('lancer')) return 'ps-new';
    if (l.includes('termin')) return 'ps-done';
    return 'ps-active';
  }

  // Init
  loadProjects();

  // ─── Welcome Morning Brief ─────────────────────────────
  let wcUtterance = null;
  let wcListening = false;

  function showWelcomeBrief(script, acc) {
    const firstName = (acc.name || 'vous').split(' ')[0];
    const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    $('wc-title').textContent = `Bonjour, ${firstName} 👋`;
    $('wc-subtitle').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    $('wc-script-text').textContent = script;

    const overlay = $('welcome-overlay');
    overlay.classList.add('visible');
  }

  function closeWelcomeBrief() {
    stopWcSpeech();
    $('welcome-overlay').classList.remove('visible');
  }

  function stopWcSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    wcListening = false;
    const btn = $('wc-btn-listen');
    btn.classList.remove('listening');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg> Écouter`;
    $('wc-orb').classList.remove('speaking');
  }

  $('wc-btn-listen').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return;

    if (wcListening) {
      stopWcSpeech();
      return;
    }

    wcListening = true;
    const btn = $('wc-btn-listen');
    btn.classList.add('listening');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Arrêter`;
    $('wc-orb').classList.add('speaking');

    window.speechSynthesis.cancel();
    wcUtterance = new SpeechSynthesisUtterance($('wc-script-text').textContent);
    wcUtterance.lang = 'fr-FR';
    wcUtterance.rate = 0.93;
    wcUtterance.pitch = 1.05;

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith('fr'));
      if (frVoice) wcUtterance.voice = frVoice;
      window.speechSynthesis.speak(wcUtterance);
    };

    wcUtterance.onend = stopWcSpeech;
    wcUtterance.onerror = stopWcSpeech;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
    } else {
      setVoiceAndSpeak();
    }
  });

  $('wc-btn-start').addEventListener('click', closeWelcomeBrief);

});  // end DOMContentLoaded
