import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('revornix', {
  getBuiltinServers: () => ipcRenderer.invoke('revornix:getBuiltinServers'),
  selectServer: (origin: string) => ipcRenderer.invoke('revornix:selectServer', origin),
});
