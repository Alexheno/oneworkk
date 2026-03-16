const widgetContainer = document.getElementById('widget-container');
const knob = document.querySelector('.knob');

// Fonction pour mettre à jour la date du jour
function updateDate() {
  const dateElement = document.getElementById('current-date');
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const today = new Date().toLocaleDateString('fr-FR', options);
  dateElement.textContent = today.charAt(0).toUpperCase() + today.slice(1);
}

updateDate();

let isDragging = false;

let hoverTimeout;

// Gestion du survol : Ouvrir et fermer le widget
widgetContainer.addEventListener('mouseenter', () => {
  clearTimeout(hoverTimeout); // Annuler la fermeture si on revient vite
  
  if(window.electronAPI && !isDragging) {
    window.electronAPI.setIgnoreMouseEvents(false);
  }
  if (!isDragging) {
    widgetContainer.classList.remove('widget-closed');
    widgetContainer.classList.add('widget-open');
  }
});

widgetContainer.addEventListener('mouseleave', () => {
  // On met un petit délai de 150ms avant de fermer, 
  // pour que la souris ait le temps d'aller du cercle à la carte sans déclencher la fermeture.
  hoverTimeout = setTimeout(() => {
    if(window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
    widgetContainer.classList.remove('widget-open');
    widgetContainer.classList.add('widget-closed');
  }, 150);
});

// === Custom Drag & Drop Parfait (Sans bugs Windows) ===
let mouseX = 0;
let mouseY = 0;

knob.addEventListener('pointerdown', (e) => {
  isDragging = true;
  mouseX = e.clientX;
  mouseY = e.clientY;
  knob.setPointerCapture(e.pointerId);
  
  // Fermer la carte pendant le déplacement
  widgetContainer.classList.remove('widget-open');
  widgetContainer.classList.add('widget-closed');
});

knob.addEventListener('pointermove', (e) => {
  if (isDragging && window.electronAPI) {
    // Calcul mathématique précis :
    // e.screenX : position de la souris sur TOUT l'écran
    // mouseX : position de la souris DANS la fenêtre
    // windowX = screenX - mouseX
    window.electronAPI.moveWindow(e.screenX - mouseX, e.screenY - mouseY);
  }
});

// Ouvre l'application complète sur double clic du widget
knob.addEventListener('dblclick', () => {
  if(window.electronAPI) {
    window.electronAPI.openOverview();
  }
});

knob.addEventListener('pointerup', (e) => {
  isDragging = false;
  knob.releasePointerCapture(e.pointerId);
});

// === Accordéon des Réunions ===
const meetingsAccordion = document.getElementById('meetings-accordion');
const meetingsHeader = meetingsAccordion.querySelector('.meetings-header');

meetingsHeader.addEventListener('click', () => {
  meetingsAccordion.classList.toggle('open');
});

// === Mise à jour Dynamique depuis l'IA ===
if (window.electronAPI && window.electronAPI.onWidgetData) {
  window.electronAPI.onWidgetData((payload) => {
      // payload = { success: true, data: { urgentAlerts, aiSuggestions, ...}, rawCounts: {events...} }
      if (!payload || !payload.data) return;
      const ai = payload.data;
      const counts = payload.rawCounts || {};

      // 1. Mettre à jour l'alerte rouge
      const alertItems = document.querySelectorAll('.alert-item');
      alertItems.forEach(el => el.remove()); // Nettoie
      
      const realUrgentAlerts = ai.urgentAlerts || [];
      if (realUrgentAlerts.length > 0) {
          // On insère l'alerte juste après le header
          const focusAlert = realUrgentAlerts[0];
          const headerElement = document.querySelector('.header');
          headerElement.insertAdjacentHTML('afterend', `
              <div class="todo-item alert-item">
                <label class="checkbox-container">
                  <input type="checkbox">
                  <span class="checkmark"></span>
                  ${focusAlert.sender}: ${focusAlert.text}
                </label>
                <span class="badge red-outline">Urgent</span>
              </div>
          `);
      }

      // 2. Mettre à jour le compteur de réunions
      if (counts.events !== undefined) {
          const mTitle = document.querySelector('.meetings-header .title');
          if (mTitle) mTitle.textContent = `${counts.events} Réunion(s) aujourd'hui`;
      }

      // 3. Mettre à jour les suggestions (To-Do list)
      const normalItems = document.querySelectorAll('.normal-item');
      normalItems.forEach(el => el.remove()); // Retire le mockup
      
      const suggestions = ai.aiSuggestions || [];
      if (suggestions.length > 0) {
          const footerElement = document.querySelector('.footer');
          suggestions.forEach(sug => {
              footerElement.insertAdjacentHTML('beforebegin', `
                  <div class="todo-item normal-item">
                    <label class="checkbox-container">
                      <input type="checkbox">
                      <span class="checkmark"></span>
                      ${sug}
                    </label>
                  </div>
              `);
          });
      }
      
      // Update Footer
      const footerStatus = document.querySelector('.footer .status');
      if (footerStatus) footerStatus.innerHTML = `⚡ Vraies Données Microsoft (Graph API)`;
  });
}
