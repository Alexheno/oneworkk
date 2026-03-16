document.addEventListener('DOMContentLoaded', () => {
  const btnConnect = document.getElementById('btn-connect-ms');
  const onboardingScreen = document.getElementById('onboarding-screen');
  const dashboardScreen = document.getElementById('dashboard-screen');

  btnConnect.addEventListener('click', async () => {
    btnConnect.innerHTML = "<span class='icon'>🔐</span> Connexion sécurisée à Microsoft...";
    btnConnect.style.opacity = "0.7";
    btnConnect.disabled = true;

    try {
      // 1. Authentification OAuth 2.0 via MSAL (Ouvre le navigateur)
      const authResult = await window.overviewAPI.connectMicrosoft();
      
      if (!authResult || !authResult.success) {
          throw new Error(authResult ? authResult.error : "Erreur d'authentification inconnue");
      }
      
      const { accessToken, account } = authResult;
      console.log("Token MS reçu pour :", account.name);

      btnConnect.innerHTML = "<span class='icon'>⏳</span> Analyse IA en cours...";

      // 2. Appel du Backend (qui gère Supabase + Graph API + OpenRouter)
      const response = await fetch('http://localhost:3000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              accessToken: accessToken,
              email: account.username, 
              name: account.name
          })
      });
      
      const result = await response.json();

      if (result.success && result.data) {
          const aiData = result.data;
          
          // 2. Mise à jour dynamique du Bento Grid avec les retours de Gemini
          
              // - Mails Prioritaires
          if (aiData.priorityEmails && aiData.priorityEmails.length > 0) {
              const emailContainer = document.querySelector('.blue-glow .messages-preview');
              emailContainer.innerHTML = ''; 
              aiData.priorityEmails.forEach(mail => {
                  emailContainer.innerHTML += `
                    <div class="msg">
                      <span class="sender">${mail.sender}</span>
                      <span class="subject">${mail.summary || mail.subject}</span>
                    </div>
                  `;
              });
              
              const othersCount = (result.rawCounts?.emails || 0) - aiData.priorityEmails.length;
              const trendMsg = document.querySelector('.blue-glow .trend');
              if (trendMsg) trendMsg.textContent = othersCount > 0 ? `+ ${othersCount} autres non lus` : "Aucun autre mail";
          } else {
              const emailContainer = document.querySelector('.blue-glow .messages-preview');
              emailContainer.innerHTML = `<p style="font-size:0.85rem; color:#64748b;">Boîte de réception à jour.</p>`;
          }

          // Mise à jour du Bonjour personnalisé
          const greetingName = document.querySelector('.greeting h1');
          if (greetingName) {
              const firstName = (result.data?.name || "Henri").split(' ')[0]; // Henri O. -> Henri
              greetingName.innerHTML = `Bonjour, ${firstName} 👋`;
          }

          // - Alertes Teams (Injection dans la bulle violette au lieu de l'alerte rouge par erreur)
          // ATTENTION : J'injecte les "urgentAlerts" type 'teams' dans le bloc Teams si elles existent.
          const teamsContainer = document.querySelector('.purple-glow .messages-preview');
          teamsContainer.innerHTML = '';
          const teamsAlerts = (aiData.urgentAlerts || []).filter(a => a.type === 'teams' || !a.type);
          
          if (teamsAlerts.length > 0) {
              teamsAlerts.forEach(alert => {
                  teamsContainer.innerHTML += `
                    <div class="msg teams-msg">
                      <span class="sender">${alert.sender}</span>
                      <span class="subject">${alert.text}</span>
                    </div>
                  `;
              });
          } else {
              teamsContainer.innerHTML = `<p style="font-size:0.8rem; color:#64748b;">Aucune urgence sur Teams.</p>`;
          }

          // - Alertes Rouges Globales (Bulle "À traiter urgemment")
          const alertContainer = document.querySelector('.red-glow .simple-list');
          alertContainer.innerHTML = '';
          const globalAlerts = (aiData.urgentAlerts || []).filter(a => a.type !== 'teams');
          
          if (globalAlerts.length > 0) {
              globalAlerts.forEach(alert => {
                  alertContainer.innerHTML += `<li>🚨 <strong>${alert.sender}</strong> : ${alert.text}</li>`;
              });
              const countDom = document.querySelector('.red-glow .badge');
              if (countDom) {
                  countDom.textContent = `${globalAlerts.length} Alerte(s)`;
                  countDom.className = 'badge red'; // Remet le rouge
                  countDom.style = ''; // Reset CSS inline
              }
          } else {
              // On utilise un <li> avec la classe dédiée pour garder le design de liste propre
              alertContainer.innerHTML = `<li style="color:#10b981;">Aucune alerte critique majeure.</li>`;
              const countDom = document.querySelector('.red-glow .badge');
              if (countDom) {
                  countDom.textContent = `0 Alerte`;
                  countDom.className = 'badge'; // Retire le rouge natif
                  countDom.style.background = '#d1fae5';
                  countDom.style.color = '#065f46';
              }
          }

          // - Suggestions IA
          if (aiData.aiSuggestions && aiData.aiSuggestions.length > 0) {
              const insightContainer = document.querySelector('.ai-card .insight');
              insightContainer.innerHTML = `"${aiData.aiSuggestions[0]}"`; 
          }
          
          // - Ajout d'une petite bannière discrète "Mode Simulation (Mock)" pour clarifier l'état actuel auprès de l'utilisateur
          const topbarDate = document.querySelector('.greeting .date');
          if (topbarDate) {
              topbarDate.innerHTML = `Il vous reste 3 réunions aujourd'hui. <span style="background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:12px; font-size:0.75rem; margin-left:10px;">Données Simulées (Test IA)</span>`;
          }

          // 3. Transition fluide
          onboardingScreen.style.opacity = '0';
          setTimeout(() => {
              onboardingScreen.style.display = 'none';
              dashboardScreen.style.display = 'flex';
          }, 300);

          // 4. Envoi de l'état global et des alertes au Widget AssistiveTouch
          if (window.overviewAPI && window.overviewAPI.updateWidget) {
              window.overviewAPI.updateWidget(result);
          }

      } else {
          alert("Erreur de l'API IA : " + (result.error || "Inconnue"));
          btnConnect.textContent = "Réessayer";
          btnConnect.disabled = false;
          btnConnect.style.opacity = "1";
      }

    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur ! Verifiez que node server.js tourne.");
      btnConnect.textContent = "Réessayer";
      btnConnect.disabled = false;
      btnConnect.style.opacity = "1";
    }
  });

  // Gestion de la navigation / Office 365
  const btnExcel = document.getElementById('btn-open-excel');
  if (btnExcel) {
      btnExcel.addEventListener('click', () => {
          if (window.overviewAPI) window.overviewAPI.openUrl('https://www.office.com/launch/excel');
      });
  }

  const btnCalendar = document.getElementById('btn-open-calendar');
  if (btnCalendar) {
      btnCalendar.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.overviewAPI) window.overviewAPI.openUrl('https://outlook.office.com/calendar/view/day');
      });
  }
});
