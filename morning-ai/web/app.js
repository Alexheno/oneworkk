// === CONFIGURATION ===
// Remplace par l'URL de ton backend Railway après déploiement
const BACKEND_URL = 'https://oneworkk-production.up.railway.app';

const msalConfig = {
    auth: {
        clientId: '6ba5635c-5459-4c73-a599-04f669c610ad',
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin + window.location.pathname,
    },
    cache: {
        cacheLocation: 'sessionStorage',
    }
};

const loginRequest = {
    scopes: ["User.Read", "Mail.Read", "Calendars.Read", "Chat.Read", "Files.Read.All"]
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// Gestion du redirect (si l'utilisateur revient après le login)
msalInstance.initialize().then(() => {
    msalInstance.handleRedirectPromise().then(response => {
        if (response && response.accessToken) {
            startAnalysis(response.accessToken, response.account);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const btnConnect = document.getElementById('btn-connect-ms');
    const btnLogout = document.getElementById('btn-logout');

    btnConnect.addEventListener('click', async () => {
        btnConnect.textContent = '🔐 Connexion à Microsoft...';
        btnConnect.disabled = true;

        try {
            const response = await msalInstance.loginPopup(loginRequest);
            await startAnalysis(response.accessToken, response.account);
        } catch (err) {
            console.error(err);
            alert('Erreur de connexion Microsoft : ' + err.message);
            btnConnect.textContent = 'Se connecter avec Microsoft';
            btnConnect.disabled = false;
        }
    });

    btnLogout.addEventListener('click', () => {
        msalInstance.logoutPopup();
        document.getElementById('onboarding-screen').style.display = 'flex';
        document.getElementById('dashboard-screen').style.display = 'none';
    });
});

async function startAnalysis(accessToken, account) {
    const btnConnect = document.getElementById('btn-connect-ms');
    btnConnect.textContent = '⏳ Analyse IA en cours...';

    try {
        const response = await fetch(`${BACKEND_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessToken,
                email: account.username,
                name: account.name
            })
        });

        const result = await response.json();

        if (result.success && result.data) {
            renderDashboard(result, account);
        } else {
            alert("Erreur de l'IA : " + (result.error || "Inconnue"));
            btnConnect.textContent = 'Se connecter avec Microsoft';
            btnConnect.disabled = false;
        }
    } catch (err) {
        console.error(err);
        alert('Impossible de joindre le serveur : ' + err.message);
        btnConnect.textContent = 'Se connecter avec Microsoft';
        btnConnect.disabled = false;
    }
}

function renderDashboard(result, account) {
    const aiData = result.data;
    const onboarding = document.getElementById('onboarding-screen');
    const dashboard = document.getElementById('dashboard-screen');

    // Nom de l'utilisateur
    const firstName = (account.name || 'vous').split(' ')[0];
    document.getElementById('greeting-name').textContent = `Bonjour, ${firstName} 👋`;

    // Avatar dynamique
    const avatar = document.getElementById('user-avatar');
    const initials = (account.name || 'HO').split(' ').map(n => n[0]).join('').slice(0, 2);
    avatar.style.backgroundImage = `url('https://ui-avatars.com/api/?name=${initials}&background=0f172a&color=fff&size=128')`;

    // Date + compteur réunions
    const dateEl = document.getElementById('greeting-date');
    const eventsCount = result.rawCounts?.events || 0;
    dateEl.textContent = eventsCount > 0
        ? `Il vous reste ${eventsCount} réunion(s) aujourd'hui.`
        : "Aucune réunion prévue aujourd'hui.";

    // Emails
    const emailContainer = document.getElementById('email-container');
    emailContainer.innerHTML = '';
    if (aiData.priorityEmails && aiData.priorityEmails.length > 0) {
        aiData.priorityEmails.forEach(mail => {
            emailContainer.innerHTML += `
                <div class="msg">
                    <span class="sender">${mail.sender}</span>
                    <span class="subject">${mail.summary || mail.subject}</span>
                </div>`;
        });
        const others = (result.rawCounts?.emails || 0) - aiData.priorityEmails.length;
        document.getElementById('email-trend').textContent = others > 0 ? `+ ${others} autres non lus` : '';
    } else {
        emailContainer.innerHTML = `<p style="font-size:0.85rem;color:#64748b;">Boîte de réception à jour.</p>`;
    }

    // Teams
    const teamsContainer = document.getElementById('teams-container');
    teamsContainer.innerHTML = '';
    const teamsAlerts = (aiData.urgentAlerts || []).filter(a => a.type === 'teams' || !a.type);
    if (teamsAlerts.length > 0) {
        teamsAlerts.forEach(alert => {
            teamsContainer.innerHTML += `
                <div class="msg teams-msg">
                    <span class="sender">${alert.sender}</span>
                    <span class="subject">${alert.text}</span>
                </div>`;
        });
    } else {
        teamsContainer.innerHTML = `<p style="font-size:0.8rem;color:#64748b;">Aucune urgence sur Teams.</p>`;
    }

    // Alertes globales
    const alertContainer = document.getElementById('alert-container');
    alertContainer.innerHTML = '';
    const badge = document.getElementById('alert-badge');
    const globalAlerts = (aiData.urgentAlerts || []).filter(a => a.type !== 'teams');
    if (globalAlerts.length > 0) {
        globalAlerts.forEach(alert => {
            alertContainer.innerHTML += `<li>🚨 <strong>${alert.sender}</strong> : ${alert.text}</li>`;
        });
        badge.textContent = `${globalAlerts.length} Alerte(s)`;
        badge.className = 'badge red';
    } else {
        alertContainer.innerHTML = `<li style="color:#10b981;">Aucune alerte critique.</li>`;
        badge.textContent = '0 Alerte';
        badge.className = 'badge';
        badge.style.background = '#d1fae5';
        badge.style.color = '#065f46';
    }

    // Suggestion IA
    if (aiData.aiSuggestions && aiData.aiSuggestions.length > 0) {
        document.getElementById('ai-insight').textContent = `"${aiData.aiSuggestions[0]}"`;
    }

    // Transition
    onboarding.style.opacity = '0';
    setTimeout(() => {
        onboarding.style.display = 'none';
        dashboard.style.display = 'flex';
    }, 300);
}