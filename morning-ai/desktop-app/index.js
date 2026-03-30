const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// Fix GPU/network crashes on Windows
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('no-sandbox');

// Single instance lock — prevents GPU cache conflicts from multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow;    // Le widget
let overviewWindow; // L'interface principale OneWork
let tray = null;

// ─── Morning Brief State ──────────────────────────────────
let cachedAuth = null;   // { account, email, name }
let alarmTime = '07:30'; // HH:MM format
let alarmFiredToday = null; // prevent double-fire

const BACKEND_URL = 'https://oneworkk-production.up.railway.app';

// ─── Windows ──────────────────────────────────────────────
function createOverviewWindow() {
  if (overviewWindow) {
    overviewWindow.show();
    overviewWindow.focus();
    return;
  }

  overviewWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'OneWork - Overview',
    frame: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'overview-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  overviewWindow.removeMenu();
  overviewWindow.loadFile('onework.html');
  overviewWindow.once('ready-to-show', () => overviewWindow.show());
  overviewWindow.on('closed', () => { overviewWindow = null; });
}

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setIgnoreMouseEvents(ignore, options);
  });

  ipcMain.on('move-window', (event, x, y) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setPosition(Math.round(x), Math.round(y));
  });

  ipcMain.on('open-overview', () => createOverviewWindow());

  ipcMain.on('hide-overview', () => {
    if (overviewWindow && !overviewWindow.isDestroyed()) overviewWindow.hide();
  });

  const { login } = require('./auth');
  ipcMain.handle('connect-microsoft', async () => {
    try {
      const result = await login();
      return result;
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Relay dashboard → widget
  ipcMain.on('update-widget', (_event, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('widget-data', data);
    }
  });

  // Relay theme → widget
  ipcMain.on('set-theme', (_event, theme) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('apply-theme', theme);
    }
  });

  // Cache auth credentials for background morning brief
  ipcMain.on('cache-auth', (_event, data) => {
    cachedAuth = data; // { account, email, name }
    console.log(`[MORNING] Auth caché pour ${data.name}`);
    updateTrayMenu();
  });

  // Update alarm time
  ipcMain.on('set-alarm-time', (_event, time) => {
    alarmTime = time;
    alarmFiredToday = null; // Reset so it fires today if time matches
    console.log(`[MORNING] Réveil programmé à ${time}`);
    updateTrayMenu();
  });

  const { shell } = require('electron');
  ipcMain.on('open-url', (_event, url) => shell.openExternal(url));
}

// ─── Screen-time tracker ──────────────────────────────────────────────────────
const tracker = require('./screen-tracker');

ipcMain.handle('get-screen-time', () => tracker.getScreenTimeData());

// Push live updates to overview window every 60s
setInterval(() => {
  if (overviewWindow && !overviewWindow.isDestroyed()) {
    overviewWindow.webContents.send('screen-time-update', tracker.getScreenTimeData());
  }
}, 60000);

// ─── System Tray ──────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  let trayImage;
  try {
    trayImage = nativeImage.createFromPath(iconPath);
    if (trayImage.isEmpty()) throw new Error('empty');
  } catch {
    trayImage = nativeImage.createEmpty();
  }

  tray = new Tray(trayImage);
  tray.setToolTip('OneWork');
  updateTrayMenu();

  tray.on('double-click', () => {
    createOverviewWindow();
    if (overviewWindow) overviewWindow.focus();
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir OneWork',
      click: () => { createOverviewWindow(); if (overviewWindow) overviewWindow.focus(); }
    },
    {
      label: `Brief matinal maintenant${cachedAuth ? '' : ' (non connecté)'}`,
      enabled: !!cachedAuth,
      click: () => triggerMorningBrief()
    },
    {
      label: `Réveil : ${alarmTime}`,
      enabled: false
    },
    { type: 'separator' },
    { label: 'Quitter OneWork', click: () => app.exit(0) }
  ]);
  tray.setContextMenu(menu);
}

// ─── Morning Brief Trigger ────────────────────────────────
async function triggerMorningBrief() {
  if (!cachedAuth) return;

  console.log('[MORNING] Déclenchement brief matinal...');

  try {
    const { getSilentToken } = require('./auth');
    const token = await getSilentToken(cachedAuth.account);
    if (!token) {
      console.error('[MORNING] Impossible d\'obtenir un token silencieux.');
      return;
    }

    const resp = await fetch(`${BACKEND_URL}/api/morning-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token, email: cachedAuth.email, name: cachedAuth.name })
    });

    const data = await resp.json();
    if (data.success && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('morning-brief', { script: data.script, name: cachedAuth.name });
      console.log('[MORNING] Brief envoyé au widget.');
    }
  } catch (err) {
    console.error('[MORNING] Erreur:', err.message);
  }
}

// ─── Morning Brief Scheduler (check every minute) ─────────
function startMorningBriefScheduler() {
  setInterval(() => {
    if (!cachedAuth) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;
    const today = now.toDateString();

    if (currentTime === alarmTime && alarmFiredToday !== today) {
      alarmFiredToday = today;
      triggerMorningBrief();
    }
  }, 60000);
}

// ─── Auto-updater ─────────────────────────────────────────
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = true;         // Télécharge silencieusement
autoUpdater.autoInstallOnAppQuit = true; // Installe quand l'app se ferme

autoUpdater.setFeedURL({
  provider: 'generic',
  url: `${BACKEND_URL}/update`,
});

autoUpdater.on('update-downloaded', () => {
  // Notifie via la tray et le dashboard — sans interrompre l'utilisateur
  updateTrayMenuWithUpdate();
  if (overviewWindow && !overviewWindow.isDestroyed()) {
    overviewWindow.webContents.send('update-ready');
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-ready');
  }
});

autoUpdater.on('error', (err) => {
  // Silencieux en prod — pas d'interruption si la mise à jour échoue
  console.log('[UPDATE] Erreur:', err.message);
});

function updateTrayMenuWithUpdate() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: '⬆ Mise à jour disponible — Redémarrer',
      click: () => autoUpdater.quitAndInstall(false, true)
    },
    { type: 'separator' },
    {
      label: 'Ouvrir OneWork',
      click: () => { createOverviewWindow(); if (overviewWindow) overviewWindow.focus(); }
    },
    { type: 'separator' },
    { label: 'Quitter', click: () => { tray.destroy(); app.exit(0); } }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip('OneWork — Mise à jour disponible');
}

// IPC pour que le renderer puisse déclencher le redémarrage
ipcMain.on('install-update', () => autoUpdater.quitAndInstall(false, true));

function checkForUpdates() {
  if (app.isPackaged) {  // Seulement en prod, pas en dev
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000); // 10s après le démarrage
  }
}

// ─── App Init ─────────────────────────────────────────────
app.whenReady().then(() => {
  createOverviewWindow();
  createWindow();
  createTray();
  startMorningBriefScheduler();
  tracker.start();
  checkForUpdates();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Hide to tray instead of quitting
app.on('window-all-closed', () => {
  // Don't quit — stay alive in system tray for morning brief
});
