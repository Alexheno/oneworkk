const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  moveWindow: (x, y) => ipcRenderer.send('move-window', x, y),
  openOverview: () => ipcRenderer.send('open-overview'),
  onWidgetData: (callback) => ipcRenderer.on('widget-data', (_event, data) => callback(data))
});
