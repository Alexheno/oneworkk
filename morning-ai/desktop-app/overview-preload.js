const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overviewAPI', {
    connectMicrosoft: () => ipcRenderer.invoke('connect-microsoft'),
    updateWidget: (data) => ipcRenderer.send('update-widget', data),
    openUrl: (url) => ipcRenderer.send('open-url', url),
    setTheme: (theme) => ipcRenderer.send('set-theme', theme),
    cacheAuth: (data) => ipcRenderer.send('cache-auth', data),
    setAlarmTime: (time) => ipcRenderer.send('set-alarm-time', time),
    hideOverview: () => ipcRenderer.send('hide-overview'),
});
