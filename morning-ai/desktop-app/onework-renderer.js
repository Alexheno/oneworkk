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
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      if (btn.dataset.view === 'focus') loadFocusView();
    });
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

  // ─── Deep links (emails + Teams) ───────────────────────
  document.addEventListener('click', e => {
    const row = e.target.closest('.msg-row[data-link]');
    if (!row) return;
    const url = row.dataset.link;
    if (url) window.overviewAPI.openUrl(url);
  });

  // ─── Meeting join links ─────────────────────────────────
  document.addEventListener('click', e => {
    const row = e.target.closest('.meeting-row[data-join]');
    if (!row) return;
    const url = row.dataset.join;
    if (url) window.overviewAPI.openUrl(url);
  });

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

  // ─── Legal / Admin consent ─────────────────────────────
  const CLIENT_ID = '6ba5635c-5459-4c73-a599-04f669c610ad';
  $('btn-privacy').addEventListener('click', (e) => {
    e.preventDefault();
    openUrl('https://onework365.app/privacy');
  });
  $('btn-terms').addEventListener('click', (e) => {
    e.preventDefault();
    openUrl('https://onework365.app/terms');
  });
  $('btn-admin-consent').addEventListener('click', () => {
    const consentUrl = `https://login.microsoftonline.com/organizations/adminconsent?client_id=${CLIENT_ID}&redirect_uri=https://onework365.app/admin-consent-success`;
    openUrl(consentUrl);
  });

  $('btn-upgrade').addEventListener('click', () => openUrl('https://onework365.app/pricing'));
  $('btn-personalisation').addEventListener('click', () => showNotif('Personnalisation disponible dans la prochaine version.'));
  $('btn-settings').addEventListener('click', () => showNotif('Paramètres disponibles dans la prochaine version.'));
  $('btn-help').addEventListener('click', () => openUrl('https://onework365.app/help'));
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
    setStatusBadge('analyzing', 'Analyse...');
    await runAnalysis();
    $('btn-refresh').classList.remove('spin');
  });

  function setStatusBadge(state, label) {
    const badge = $('status-badge');
    const lbl = $('status-label');
    if (!badge) return;
    badge.className = `status-badge ${state}`;
    if (lbl) lbl.textContent = label;
  }

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
  $('modal-delete').addEventListener('click', () => {
    if (editingProjectIdx === null) return;
    allProjects.splice(editingProjectIdx, 1);
    saveProjects();
    renderProjects();
    closeModal();
  });
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
    setStatusBadge('analyzing', 'Analyse...');

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

      // Read raw text first to avoid silent parse failures
      const rawText = await resp.text();
      console.log(`[ANALYSE] status=${resp.status} body=${rawText.slice(0, 300)}`);

      let result;
      try { result = JSON.parse(rawText); }
      catch { throw new Error(`Réponse non-JSON (${resp.status}) : ${rawText.slice(0, 120)}`); }

      if (!resp.ok || !result.success || !result.data) {
        throw new Error(result.error || `Erreur serveur (${resp.status})`);
      }

      showDashboard(result.data, account, result.rawCounts, result.rawData);
      setStatusBadge('done', 'Analyse OK');
      setTimeout(() => setStatusBadge('idle', 'Prêt'), 4000);
      if (result.morningScript) showWelcomeBrief(result.morningScript, account);
    } catch (err) {
      console.error('[ANALYSE]', err);
      setBtnState('idle');
      setStatusBadge('idle', 'Erreur');
      showError(err.message);
    }
  }

  // ─── Show dashboard ────────────────────────────────────
  function showDashboard(ai, acc, rawCounts, rawData) {
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
    $('pm-name').textContent = acc.name || 'OneWork365';
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
    window.overviewAPI?.updateWidget?.({ success: true, data: ai, token, rawCounts, rawData, userEmail: account?.username || '' });

    // Pre-populate My Day if data already exists
    maybePreloadMyDay();
  }

  // ─── Fill emails ───────────────────────────────────────
  function fillEmails(ai) {
    const direct = ai.directEmails || [];
    const cc     = ai.ccEmails || [];

    $('email-direct').innerHTML = direct.length
      ? direct.slice(0, 6).map(m => `
          <div class="msg-row fade-in" data-link="${esc(m.webLink || '')}">
            <div class="msg-sender">${esc(m.sender)}</div>
            <div class="msg-body">${esc(m.summary || m.subject)}</div>
          </div>`).join('')
      : '<p style="font-size:.8rem;color:var(--text2);padding:6px 0">Aucun email direct.</p>';

    $('email-cc').innerHTML = cc.length
      ? cc.slice(0, 5).map(m => `
          <div class="msg-row fade-in" style="border-left-color:var(--text2)" data-link="${esc(m.webLink || '')}">
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
          <div class="msg-row teams fade-in" data-link="${esc(m.webUrl || '')}">
            <div class="msg-sender">${esc(m.sender)}</div>
            <div class="msg-body">${esc(m.text || m.summary)}</div>
          </div>`).join('')
      : '<p style="font-size:.8rem;color:var(--text2);padding:6px 0">Aucun message Teams.</p>';
  }

  // ─── Fill Meetings ─────────────────────────────────────
  function fillMeetings(ai) {
    const meetings = ai.todayMeetings || [];
    $('meetings-list').innerHTML = meetings.length
      ? meetings.slice(0, 6).map(m => {
          const joinUrl = m.joinUrl || m.onlineMeetingUrl || '';
          const canJoin = m.isOnline && joinUrl;
          return `
          <div class="meeting-row fade-in${canJoin ? ' has-join' : ''}"${canJoin ? ` data-join="${esc(joinUrl)}"` : ''}>
            <span class="meeting-time">${esc(m.time)}</span>
            <div class="meeting-dot ${m.status || ''}"></div>
            <div class="meeting-info">
              <div class="meeting-title">${esc(m.title)}</div>
              ${m.context ? `<div class="meeting-sub">${esc(m.context)}</div>` : ''}
            </div>
            ${canJoin ? `<button class="meeting-join-btn" onclick="event.stopPropagation();window.overviewAPI.openUrl('${esc(joinUrl)}')">Rejoindre</button>` : ''}
          </div>`;
        }).join('')
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
  const TTS_URL = 'https://oneworkk-production.up.railway.app/api/tts';
  let wcAudio = null;
  let wcPlaying = false;

  function showWelcomeBrief(script, acc) {
    const firstName = (acc.name || 'vous').split(' ')[0];
    const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    $('wc-title').textContent = `Bonjour, ${firstName} 👋`;
    $('wc-subtitle').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    $('wc-script-text').textContent = script;
    $('welcome-overlay').classList.add('visible');
  }

  function closeWelcomeBrief() {
    stopWcAudio();
    $('welcome-overlay').classList.remove('visible');
  }

  function stopWcAudio() {
    if (wcAudio) { wcAudio.pause(); wcAudio.src = ''; wcAudio = null; }
    wcPlaying = false;
    setListenBtn('idle');
    $('wc-orb').classList.remove('speaking');
  }

  function setListenBtn(state) {
    const btn = $('wc-btn-listen');
    if (state === 'loading') {
      btn.disabled = true;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Génération...`;
      btn.classList.remove('listening');
    } else if (state === 'playing') {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Arrêter`;
      btn.classList.add('listening');
    } else {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg> Écouter`;
      btn.classList.remove('listening');
    }
  }

  $('wc-btn-listen').addEventListener('click', async () => {
    if (wcPlaying) { stopWcAudio(); return; }

    const text = $('wc-script-text').textContent;
    if (!text) return;

    setListenBtn('loading');
    $('wc-orb').classList.add('speaking');

    try {
      const resp = await fetch(TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!resp.ok) throw new Error('TTS indisponible');

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      wcAudio = new Audio(url);
      wcAudio.onended = stopWcAudio;
      wcAudio.onerror = stopWcAudio;
      wcPlaying = true;
      setListenBtn('playing');
      wcAudio.play();
    } catch (err) {
      console.error('[TTS]', err);
      stopWcAudio();
      showNotif('Voix indisponible — ajoutez OPENAI_API_KEY sur Railway.');
    }
  });

  $('wc-btn-start').addEventListener('click', closeWelcomeBrief);

  // ─── App Chat Bar ───────────────────────────────────────
  const CHAT_URL = 'https://oneworkk-production.up.railway.app/api/chat';
  let chatContext = null;

  // chatContext is populated when dashboard loads (via updateWidget payload reuse)

  function sendAppChat(msg) {
    if (!msg.trim()) return;
    const input = $('acb-input');
    const orb = $('acb-orb-icon');
    const respBox = $('acb-response');
    const respText = $('acb-resp-text');

    input.value = '';
    input.disabled = true;
    if (orb) orb.classList.add('thinking');
    if (respBox) respBox.style.display = 'none';

    // Build context from current page state
    const ctx = chatContext || {};
    const { currentTime, currentDay, timeOfDay } = getTimeContext();

    fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: token,
        message: msg,
        context: { ...ctx, currentTime, currentDay, timeOfDay, userEmail: account?.username || '' }
      })
    })
    .then(r => r.json())
    .then(data => {
      input.disabled = false;
      if (orb) orb.classList.remove('thinking');

      const reply = data.reply || data.response || data.message || JSON.stringify(data);

      if (respBox && respText) {
        respText.textContent = reply;
        respBox.style.display = 'flex';
      }

      // Handle confirmation (action requiring confirm)
      if (data.needsConfirmation && data.confirmAction) {
        showChatConfirm(data.confirmAction, data.confirmLabel || 'Confirmer cette action ?');
      }

      // Populate My Day on recap requests
      if (/recap|r[eé]sum[eé]|journ[eé]e|bilan|qu.est.ce que j.ai/i.test(msg)) {
        loadAndShowMyDay();
      }
    })
    .catch(err => {
      input.disabled = false;
      if (orb) orb.classList.remove('thinking');
      if (respBox && respText) {
        respText.textContent = 'Erreur : ' + err.message;
        respBox.style.display = 'flex';
      }
    });
  }

  function showChatConfirm(action, label) {
    // Remove existing confirm if any
    const old = document.querySelector('.acb-confirm');
    if (old) old.remove();

    const bar = $('app-chat-bar');
    if (!bar) return;

    const confirm = document.createElement('div');
    confirm.className = 'acb-confirm visible';
    confirm.innerHTML = `
      <span class="acb-confirm-text">${label}</span>
      <div class="acb-confirm-btns">
        <button class="acb-btn-cancel">Annuler</button>
        <button class="acb-btn-ok">Confirmer</button>
      </div>`;

    bar.insertBefore(confirm, $('acb-input-row')?.parentElement || bar.firstChild);

    confirm.querySelector('.acb-btn-cancel').addEventListener('click', () => confirm.remove());
    confirm.querySelector('.acb-btn-ok').addEventListener('click', () => {
      confirm.remove();
      sendAppChat(`Confirme l'action: ${action}`);
    });
  }

  // Send on button click or Enter
  $('acb-send').addEventListener('click', () => sendAppChat($('acb-input').value));
  $('acb-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAppChat($('acb-input').value); }
  });
  $('acb-resp-close').addEventListener('click', () => {
    const box = $('acb-response');
    if (box) box.style.display = 'none';
  });

  // ─── My Day panel ──────────────────────────────────────
  const MDAY_CATS = [
    { key: 'communication', label: 'Comms',    color: '#0078D4' },
    { key: 'meetings',      label: 'Réunions', color: '#6264A7' },
    { key: 'documents',     label: 'Docs',     color: '#217346' },
    { key: 'browser',       label: 'Surf',     color: '#FF6B2B' },
    { key: 'other',         label: 'Autre',    color: '#94a3b8' },
  ];

  function fmtMinShort(m) {
    if (!m || m < 1) return null;
    if (m < 60) return `${m}min`;
    return `${Math.floor(m/60)}h${m%60 > 0 ? String(m%60).padStart(2,'0') : ''}`;
  }

  function renderMyDay(data) {
    const { totals, score, apps } = data;
    const empty = $('mday-empty');
    const content = $('mday-data');
    if (!apps || apps.length === 0) {
      if (empty) empty.style.display = 'flex';
      if (content) content.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (content) content.style.display = 'block';

    // Live dot
    const dot = $('mday-live-dot');
    if (dot) dot.style.display = '';

    // Score ring (r=24, circ=150.8)
    const pct = score !== null && score !== undefined ? score : 0;
    const offset = 150.8 * (1 - pct / 100);
    const col = pct >= 90 ? '#22C55E' : pct >= 75 ? '#3B9EFF' : pct >= 50 ? '#F59E0B' : '#EF4444';
    const arc = $('mday-ring-arc');
    const pctEl = $('mday-ring-pct');
    if (arc) { arc.style.stroke = col; setTimeout(() => { arc.style.strokeDashoffset = offset; }, 80); }
    if (pctEl) { pctEl.textContent = score !== null ? `${pct}%` : '—'; pctEl.style.color = col; }

    // Active time
    const workMins = (totals.communication||0) + (totals.documents||0) + (totals.meetings||0);
    const totalMins = Object.values(totals).reduce((a,b) => a+b, 0);
    const atEl = $('mday-active-time');
    const subEl = $('mday-score-sub');
    if (atEl) atEl.textContent = fmtMinShort(workMins) || '—';
    if (subEl) subEl.textContent = totalMins > 0 ? `sur ${fmtMinShort(totalMins)} au total` : '';

    // Category pills
    const catsEl = $('mday-cats');
    if (catsEl) {
      catsEl.innerHTML = MDAY_CATS
        .filter(c => totals[c.key] > 0)
        .map(c => `<span class="mday-cat-pill" style="--cat-color:${c.color}">
          <span class="mday-cat-dot" style="background:${c.color}"></span>
          ${c.label} · ${fmtMinShort(totals[c.key])}
        </span>`).join('');
    }

    // Apps list
    const appsEl = $('mday-apps');
    if (appsEl && apps.length > 0) {
      const maxMins = apps[0].minutes;
      appsEl.innerHTML = apps.slice(0, 12).map(a => `
        <div class="mday-app-row">
          <span class="mday-app-dot" style="background:${a.color}"></span>
          <span class="mday-app-name">${a.name}</span>
          <span class="mday-app-time">${fmtMinShort(a.minutes)}</span>
          <div class="mday-app-bar-bg">
            <div class="mday-app-bar" data-w="${Math.round((a.minutes/maxMins)*100)}"
              style="width:0%;background:${a.color}"></div>
          </div>
        </div>`).join('');
      // Animate bars
      requestAnimationFrame(() => {
        appsEl.querySelectorAll('.mday-app-bar').forEach((bar, i) => {
          bar.style.transition = `width 0.5s cubic-bezier(0.16,1,0.3,1) ${i*35}ms`;
          bar.style.width = bar.dataset.w + '%';
        });
      });
    }
  }

  async function loadAndShowMyDay() {
    try {
      const data = await window.overviewAPI.getScreenTime();
      renderMyDay(data);
    } catch(e) { console.error('[MyDay]', e); }
  }

  // Auto-populate on dashboard if data exists
  async function maybePreloadMyDay() {
    try {
      const data = await window.overviewAPI.getScreenTime();
      if (data.apps && data.apps.length > 0) renderMyDay(data);
    } catch {}
  }

  // Live refresh from main process
  window.overviewAPI.onScreenTimeUpdate?.(data => renderMyDay(data));

  // ─── Focus & Productivité view ─────────────────────────
  const FOCUS_CATS = [
    { key: 'communication', color: '#0078D4' },
    { key: 'meetings',      color: '#6264A7' },
    { key: 'documents',     color: '#217346' },
    { key: 'browser',       color: '#FF6B2B' },
    { key: 'other',         color: '#94a3b8' },
  ];

  function fmtMin(m) {
    if (!m || m < 1) return '—';
    if (m < 60) return `${m}min`;
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  }

  function renderFocusChart(hourly) {
    const container = $('focus-chart');
    const hasData = hourly.some(h => FOCUS_CATS.reduce((s, c) => s + (h[c.key] || 0), 0) > 0);

    if (!hasData) {
      container.innerHTML = '<p class="focus-chart-empty">Les données s\'accumulent au fil de la journée</p>';
      return;
    }

    const maxTotal = Math.max(...hourly.map(h => FOCUS_CATS.reduce((s, c) => s + (h[c.key] || 0), 0)), 1);
    const BAR_MAX  = 110; // px
    const nowH     = new Date().getHours();

    const cols = hourly.map(h => {
      const total = FOCUS_CATS.reduce((s, c) => s + (h[c.key] || 0), 0);
      const barH  = Math.max(total > 0 ? Math.round((total / maxTotal) * BAR_MAX) : 0, total > 0 ? 3 : 0);

      const segs = total > 0
        ? FOCUS_CATS.map(c => {
            if (!h[c.key]) return '';
            const sh = Math.max(Math.round((h[c.key] / total) * barH), 1);
            return `<div class="fc-seg" style="height:${sh}px;background:${c.color}" title="${c.key}: ${h[c.key]}min"></div>`;
          }).join('')
        : '';

      const isCurrent = h.hour === nowH;
      return `
        <div class="fc-col${isCurrent ? ' fc-col-now' : ''}">
          <div class="fc-bar-area">
            <div class="fc-bar" data-h="${barH}">${segs}</div>
          </div>
          <div class="fc-label">${h.hour}h</div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="fc-bars">${cols}</div>`;

    // Animate bars upward
    const bars = container.querySelectorAll('.fc-bar');
    bars.forEach(bar => { bar.style.height = '0'; });
    requestAnimationFrame(() => {
      bars.forEach((bar, i) => {
        bar.style.transition = `height 0.55s cubic-bezier(0.16,1,0.3,1) ${i * 45}ms`;
        bar.style.height = bar.dataset.h + 'px';
      });
    });
  }

  function renderFocusData(data) {
    if (!data) return;
    const { hourly, totals, score } = data;

    // Score ring
    const arc  = $('focus-ring-arc');
    const pctEl = $('focus-score-pct');
    const subEl = $('focus-score-sub');

    // ring circumference for r=48: 2π×48 = 301.6
    const CIRC = 301.6;
    if (score !== null && score !== undefined) {
      const offset = CIRC * (1 - score / 100);
      const col = score >= 90 ? '#22C55E' : score >= 75 ? '#3B9EFF' : score >= 50 ? '#F59E0B' : '#EF4444';
      if (arc) { arc.style.stroke = col; setTimeout(() => { arc.style.strokeDashoffset = offset; }, 50); }
      if (pctEl) { pctEl.textContent = `${score}%`; pctEl.style.color = col; }
      const totalMins = Object.values(totals).reduce((a, b) => a + b, 0);
      const prodMins  = (totals.communication || 0) + (totals.documents || 0) + (totals.meetings || 0);
      if (subEl) subEl.textContent = totalMins > 0
        ? `${fmtMin(prodMins)} productif · ${fmtMin(totalMins)} total`
        : 'Les données s\'accumulent au fil de la journée';
    } else {
      if (arc)  { arc.style.strokeDashoffset = CIRC; }
      if (pctEl){ pctEl.textContent = '—'; pctEl.style.color = ''; }
      if (subEl) subEl.textContent = 'Les données s\'accumulent au fil de la journée';
    }

    // Stats
    const work = (totals.documents || 0) + (totals.meetings || 0) + (totals.communication || 0);
    $('fstat-work-val').textContent     = fmtMin(work);
    $('fstat-meetings-val').textContent = fmtMin(totals.meetings);
    $('fstat-comms-val').textContent    = fmtMin(totals.communication);
    $('fstat-browser-val').textContent  = fmtMin(totals.browser);

    // Chart
    renderFocusChart(hourly);

    // Apps grid
    const appsGrid = $('focus-apps-grid');
    if (appsGrid && data.apps && data.apps.length > 0) {
      const maxMins = data.apps[0].minutes;
      appsGrid.innerHTML = data.apps.slice(0, 16).map(a => `
        <div class="focus-app-row">
          <span class="focus-app-dot" style="background:${a.color}"></span>
          <span class="focus-app-name">${a.name}</span>
          <span class="focus-app-time">${fmtMin(a.minutes)}</span>
          <div class="focus-app-bar-bg">
            <div class="focus-app-bar" data-w="${Math.round((a.minutes/maxMins)*100)}"
              style="width:0%;background:${a.color}"></div>
          </div>
        </div>`).join('');
      requestAnimationFrame(() => {
        appsGrid.querySelectorAll('.focus-app-bar').forEach((bar, i) => {
          bar.style.transition = `width 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms`;
          bar.style.width = bar.dataset.w + '%';
        });
      });
    } else if (appsGrid) {
      appsGrid.innerHTML = '<p style="font-size:.78rem;color:var(--text2);font-style:italic;grid-column:1/-1">Aucune donnée pour l\'instant</p>';
    }
  }

  async function loadFocusView() {
    try {
      const data = await window.overviewAPI.getScreenTime();
      renderFocusData(data);
    } catch (e) {
      console.error('[Focus]', e);
    }
  }

  // Live updates every 60s from main process
  window.overviewAPI.onScreenTimeUpdate?.(data => {
    renderMyDay(data);
    if (document.getElementById('view-focus')?.classList.contains('active')) {
      renderFocusData(data);
    }
  });

  // ─── Auto-update notification ──────────────────────────
  window.overviewAPI?.onUpdateReady?.(() => {
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <span>⬆ Mise à jour disponible</span>
      <button id="update-btn-install">Redémarrer maintenant</button>
      <button id="update-btn-later">Plus tard</button>`;
    document.body.appendChild(banner);
    document.getElementById('update-btn-install').addEventListener('click', () => {
      window.overviewAPI.installUpdate();
    });
    document.getElementById('update-btn-later').addEventListener('click', () => {
      banner.remove();
    });
  });

  // Store chat context when dashboard loads
  const _origShowDash = showDashboard;
  function patchedShowDashboard(ai, acc, rawCounts, rawData) {
    chatContext = { ...ai, rawData, userEmail: acc?.username || '' };
    _origShowDash(ai, acc, rawCounts, rawData);
  }
  // Override the reference used in runAnalysis
  window._showDashboard = patchedShowDashboard;

});  // end DOMContentLoaded
