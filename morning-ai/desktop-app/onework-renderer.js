document.addEventListener('DOMContentLoaded', () => {

  // ─── State ───────────────────────────────────────────────
  let currentAccessToken = null;
  let currentAccount = null;

  // ─── Elements ────────────────────────────────────────────
  const onboardingScreen = document.getElementById('onboarding-screen');
  const dashboardScreen  = document.getElementById('dashboard-screen');
  const btnConnect       = document.getElementById('btn-connect-ms');
  const btnRefresh       = document.getElementById('btn-refresh');
  const btnLogout        = document.getElementById('btn-logout');
  const btnAddTodo       = document.getElementById('btn-add-todo');
  const btnOpenExcel     = document.getElementById('btn-open-excel');
  const btnCalendar      = document.getElementById('btn-open-calendar');
  const btnCalendarMain  = document.getElementById('btn-open-calendar-main');
  const greetingName     = document.getElementById('greeting-name');
  const greetingDate     = document.getElementById('greeting-date');
  const userAvatar       = document.getElementById('user-avatar');
  const aiBannerText     = document.getElementById('ai-banner-text');
  const aiChips          = document.getElementById('ai-chips');

  // ─── Greeting date ───────────────────────────────────────
  const now = new Date();
  greetingDate.textContent = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // ─── Tab system ──────────────────────────────────────────
  function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
    document.querySelectorAll('.nav-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  }

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ─── Microsoft Connect ───────────────────────────────────
  btnConnect.addEventListener('click', async () => {
    setConnectState('loading', 'Connexion sécurisée à Microsoft...');
    try {
      const authResult = await window.overviewAPI.connectMicrosoft();
      if (!authResult?.success) throw new Error(authResult?.error || 'Erreur d\'authentification');

      currentAccessToken = authResult.accessToken;
      currentAccount     = authResult.account;

      setConnectState('analyzing', 'Analyse IA en cours...');
      await runAnalysis();

    } catch (err) {
      console.error('AUTH ERROR:', err);
      setConnectState('error');
      showAuthError(err.message || JSON.stringify(err));
    }
  });

  function setConnectState(state, label) {
    const errEl = document.getElementById('auth-error');
    if (errEl && state !== 'error') errEl.style.display = 'none';

    btnConnect.disabled = state === 'loading' || state === 'analyzing';
    btnConnect.innerHTML = state === 'loading'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> ${label || 'Connexion...'}`
      : state === 'analyzing'
      ? `✦ ${label || 'Analyse en cours...'}`
      : label || 'Continuer avec Microsoft';
    if (state === 'error') {
      btnConnect.disabled = false;
      btnConnect.innerHTML = 'Réessayer';
    }
  }

  function showAuthError(msg) {
    const errEl = document.getElementById('auth-error');
    if (errEl) {
      errEl.textContent = '⚠ ' + msg;
      errEl.style.display = 'block';
    }
  }

  // ─── Core: run analysis ──────────────────────────────────
  async function runAnalysis() {
    setBannerLoading();

    try {
      const response = await fetch('https://oneworkk-production.up.railway.app/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: currentAccessToken,
          email: currentAccount.username,
          name:  currentAccount.name
        })
      });

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Réponse invalide du serveur');
      }

      // Show dashboard
      onboardingScreen.style.opacity = '0';
      setTimeout(() => {
        onboardingScreen.style.display = 'none';
        dashboardScreen.classList.add('active');
      }, 300);

      populateDashboard(result.data, result.rawCounts, currentAccount);

    } catch (err) {
      console.error('ANALYSE ERROR:', err);
      setConnectState('error');
      showAuthError('Erreur backend : ' + err.message);
    }
  }

  // ─── Populate all sections ───────────────────────────────
  function populateDashboard(ai, counts, account) {

    // Greeting
    const firstName = (account.name || 'vous').split(' ')[0];
    const hour = new Date().getHours();
    const salut = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    greetingName.textContent = `${salut}, ${firstName} 👋`;

    // Avatar
    userAvatar.style.backgroundImage =
      `url('https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=7c6ff7&color=fff&size=64')`;

    // AI Banner
    const firstSuggestion = ai.aiSuggestions?.[0] || 'Analyse complète de votre espace Microsoft 365.';
    aiBannerText.textContent = `${firstSuggestion}`;
    aiChips.innerHTML = [
      counts?.emails     ? `<span class="chip blue">${counts.emails} emails</span>` : '',
      counts?.events     ? `<span class="chip purple">${counts.events} événements</span>` : '',
      counts?.todoTasks  ? `<span class="chip green">${counts.todoTasks} tâches</span>` : '',
      (ai.urgentAlerts?.length || 0) > 0 ? `<span class="chip red">${ai.urgentAlerts.length} urgences</span>` : ''
    ].join('');

    // Emails
    populateEmails(ai.priorityEmails, counts?.emails);

    // Teams
    populateTeams(ai.urgentAlerts);

    // Alerts
    populateAlerts(ai.urgentAlerts);

    // Agenda (from taskPlan if available)
    populateAgenda(ai.taskPlan);

    // AI Suggestions
    populateSuggestions(ai.aiSuggestions);

    // Tasks tab
    populateTaskPlan(ai.taskPlan);

    // Projects tab
    populateProjects(ai.projectOverview);

    // Send widget update
    if (window.overviewAPI?.updateWidget) {
      window.overviewAPI.updateWidget({ success: true, data: ai, rawCounts: counts });
    }
  }

  function populateEmails(emails, totalCount) {
    const list = document.getElementById('email-list');
    const foot = document.getElementById('email-count');

    if (!emails?.length) {
      list.innerHTML = `<p style="font-size:0.82rem;color:var(--text-sec)">Boîte de réception à jour.</p>`;
      return;
    }

    list.innerHTML = emails.slice(0, 4).map(m => `
      <div class="msg-item fade-in">
        <div class="msg-sender">${esc(m.sender)}</div>
        <div class="msg-body">${esc(m.summary || m.subject)}</div>
      </div>
    `).join('');

    const others = (totalCount || 0) - emails.length;
    if (foot) foot.textContent = others > 0 ? `+${others} autres emails non lus` : '';
  }

  function populateTeams(alerts) {
    const list = document.getElementById('teams-list');
    const teamsAlerts = (alerts || []).filter(a => a.type === 'teams');

    if (!teamsAlerts.length) {
      list.innerHTML = `<p style="font-size:0.82rem;color:var(--text-sec)">Aucune urgence sur Teams.</p>`;
      return;
    }

    list.innerHTML = teamsAlerts.map(a => `
      <div class="msg-item teams fade-in">
        <div class="msg-sender">${esc(a.sender)}</div>
        <div class="msg-body">${esc(a.text)}</div>
      </div>
    `).join('');
  }

  function populateAlerts(alerts) {
    const list  = document.getElementById('alert-list');
    const badge = document.getElementById('alert-badge');
    const global = (alerts || []).filter(a => a.type !== 'teams');

    if (!global.length) {
      list.innerHTML = `<li style="font-size:0.82rem;color:var(--green);">Aucune alerte critique.</li>`;
      badge.textContent = '0';
      badge.classList.add('ok');
      return;
    }

    badge.textContent = `${global.length} urgence${global.length > 1 ? 's' : ''}`;
    badge.classList.remove('ok');

    list.innerHTML = global.map(a => `
      <li class="alert-item fade-in">
        <div class="alert-dot"></div>
        <span><strong>${esc(a.sender)}</strong> — ${esc(a.text)}</span>
      </li>
    `).join('');
  }

  function populateAgenda(taskPlan) {
    const tl = document.getElementById('timeline');

    const timedTasks = (taskPlan || []).filter(t => t.time);
    if (!timedTasks.length) {
      tl.innerHTML = `<p style="font-size:0.82rem;color:var(--text-sec)">Aucun événement détecté.</p>`;
      return;
    }

    tl.innerHTML = timedTasks.slice(0, 6).map(t => `
      <div class="timeline-item fade-in">
        <span class="tl-time">${esc(t.time)}</span>
        <div class="tl-body">
          <div class="tl-title">${esc(t.task)}</div>
          ${t.context ? `<div class="tl-sub">${esc(t.context)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function populateSuggestions(suggestions) {
    const container = document.getElementById('ai-suggestions');
    if (!suggestions?.length) {
      container.innerHTML = `<p style="font-size:0.82rem;color:var(--text-sec)">Aucune suggestion.</p>`;
      return;
    }
    container.innerHTML = suggestions.map(s => `
      <div class="suggestion-item fade-in">"${esc(s)}"</div>
    `).join('');
  }

  function populateTaskPlan(taskPlan) {
    const list = document.getElementById('task-list');
    if (!taskPlan?.length) {
      list.innerHTML = `<div class="empty-state">Aucun plan généré pour aujourd'hui.</div>`;
      return;
    }

    list.innerHTML = taskPlan.map(t => `
      <div class="task-item fade-in">
        <span class="task-time">${esc(t.time || '—')}</span>
        <div class="task-main">
          <div class="task-title">${esc(t.task)}</div>
          ${t.context ? `<div class="task-context">${esc(t.context)}</div>` : ''}
        </div>
        <span class="task-priority ${t.priority || 'low'}">${priorityLabel(t.priority)}</span>
      </div>
    `).join('');
  }

  function populateProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!projects?.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Aucun projet détecté.</div>`;
      return;
    }

    grid.innerHTML = projects.map(p => `
      <div class="project-card fade-in">
        <div class="project-head">
          <span class="project-name">${esc(p.name)}</span>
          <span class="project-status ${statusClass(p.status)}">${esc(p.status)}</span>
        </div>
        <p class="project-action">${esc(p.nextAction)}</p>
        ${p.signals?.length ? `
          <div class="project-signals">
            ${p.signals.map(s => `<span class="signal-tag">${esc(s)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  // ─── Refresh ─────────────────────────────────────────────
  btnRefresh.addEventListener('click', async () => {
    if (!currentAccessToken) return;
    btnRefresh.classList.add('spinning');
    setBannerLoading();
    await runAnalysis();
    btnRefresh.classList.remove('spinning');
  });

  // ─── Logout ──────────────────────────────────────────────
  btnLogout.addEventListener('click', () => {
    currentAccessToken = null;
    currentAccount = null;
    dashboardScreen.classList.remove('active');
    onboardingScreen.style.display = 'flex';
    onboardingScreen.style.opacity = '1';
    btnConnect.disabled = false;
    btnConnect.innerHTML = `<svg width="18" height="18" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> Continuer avec Microsoft`;
  });

  // ─── External links ──────────────────────────────────────
  function openUrl(url) {
    if (window.overviewAPI?.openUrl) window.overviewAPI.openUrl(url);
  }

  btnOpenExcel.addEventListener('click', () => openUrl('https://www.office.com/launch/excel'));
  btnCalendar.addEventListener('click', () => openUrl('https://outlook.office.com/calendar/view/day'));
  btnCalendarMain.addEventListener('click', () => openUrl('https://outlook.office.com/calendar/view/day'));
  btnAddTodo.addEventListener('click', () => openUrl('https://to-do.microsoft.com/tasks'));

  // ─── Helpers ─────────────────────────────────────────────
  function setBannerLoading() {
    aiBannerText.textContent = 'Analyse de votre espace Microsoft 365 en cours...';
    aiChips.innerHTML = '';
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function priorityLabel(p) {
    return p === 'high' ? 'Urgent' : p === 'medium' ? 'Normal' : 'Faible';
  }

  function statusClass(s) {
    if (!s) return 'active';
    const lower = s.toLowerCase();
    if (lower.includes('retard')) return 'late';
    if (lower.includes('bloqu')) return 'blocked';
    if (lower.includes('lancer')) return 'new';
    return 'active';
  }

});
