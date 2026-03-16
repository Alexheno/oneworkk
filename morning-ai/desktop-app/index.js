const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow; // Le widget
let overviewWindow; // L'interface principale OneWork

function createOverviewWindow() {
  if (overviewWindow) {
    overviewWindow.focus();
    return;
  }

  overviewWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'OneWork - Overview',
    frame: true, // Avec bordure classique pour cette fenêtre
    autoHideMenuBar: true, // Supprime le menu (File, Edit, etc.)
    show: false, // Cache la fenêtre le temps de chargement pour éviter la page blanche
    backgroundColor: '#f8fafc', // Couleur de fond similaire à l'application
    webPreferences: {
      preload: path.join(__dirname, 'overview-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Force la suppression absolue du menu natif
  overviewWindow.removeMenu();

  overviewWindow.loadFile('onework.html');

  // N'affiche la fenêtre que lorsqu'elle a fini de dessiner son contenu
  overviewWindow.once('ready-to-show', () => {
    overviewWindow.show();
  });

  overviewWindow.on('closed', () => {
    overviewWindow = null;
  });
}

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,   // Prend toute la largeur de l'écran
    height: height, // Prend toute la hauteur
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true, // N'apparait pas dans la barre des tâches
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  // Ignorer les clics de souris là où c'est transparent
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // On écoute les événements du renderer pour activer/désactiver le clic
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if(win) win.setIgnoreMouseEvents(ignore, options);
  });
  
  // Custom Drag & Drop pour éviter les bugs natifs d'Electron sur Windows
  ipcMain.on('move-window', (event, x, y) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if(win) win.setPosition(Math.round(x), Math.round(y));
  });

  // Ouvrir l'Overview depuis le widget
  ipcMain.on('open-overview', () => {
    createOverviewWindow();
  });

  // Gestion du process SignIn Microsoft (MSAL)
  const { login } = require('./auth');
  ipcMain.handle('connect-microsoft', async () => {
      try {
          return await login();
      } catch(e) {
          console.error("IPC Auth Error: ", e);
          return { success: false, error: e.message };
      }
  });

  // Relais des données du Dashboard vers le Widget
  ipcMain.on('update-widget', (event, data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('widget-data', data);
      }
  });

  // Navigation vers liens externes
  const { shell } = require('electron');
  ipcMain.on('open-url', (event, url) => {
      shell.openExternal(url);
  });
}

// On lance les deux fenêtres au démarrage par défaut (pour l'instant, pour simplifier les tests)
app.whenReady().then(() => {
  createOverviewWindow(); // Lance la vue d'ensemble OneWork
  createWindow(); // Lance le widget
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
