const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overviewAPI', {
    onUpdateReady:  (cb) => ipcRenderer.on('update-ready', () => cb()),
    installUpdate:  () => ipcRenderer.send('install-update'),
    connectMicrosoft: () => ipcRenderer.invoke('connect-microsoft'),
    updateWidget: (data) => ipcRenderer.send('update-widget', data),
    openUrl: (url) => ipcRenderer.send('open-url', url),
    setTheme: (theme) => ipcRenderer.send('set-theme', theme),
    cacheAuth: (data) => ipcRenderer.send('cache-auth', data),
    setAlarmTime: (time) => ipcRenderer.send('set-alarm-time', time),
    hideOverview:         () => ipcRenderer.send('hide-overview'),
    getScreenTime:        () => ipcRenderer.invoke('get-screen-time'),
    onScreenTimeUpdate:   (cb) => ipcRenderer.on('screen-time-update', (_e, data) => cb(data)),
});
