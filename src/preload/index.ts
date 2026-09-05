import { contextBridge, ipcRenderer } from "electron";
import { IPC, type HexAramApi, type StatusSnapshot } from "../main/ipc/contract";

const api: HexAramApi = {
  getConfig: () => ipcRenderer.invoke(IPC.getConfig),
  setConfig: (config) => ipcRenderer.invoke(IPC.setConfig, config),
  getSecretsPresence: () => ipcRenderer.invoke(IPC.getSecretsPresence),
  setSecrets: (secrets) => ipcRenderer.invoke(IPC.setSecrets, secrets),
  testDiscordConnection: () => ipcRenderer.invoke(IPC.testDiscordConnection),
  listChannels: (guildId) => ipcRenderer.invoke(IPC.listChannels, guildId),
  runTestAnnouncement: () => ipcRenderer.invoke(IPC.runTestAnnouncement),
  getStatus: () => ipcRenderer.invoke(IPC.getStatus),
  onStatusUpdate: (callback: (status: StatusSnapshot) => void) => {
    const listener = (_event: unknown, status: StatusSnapshot) => callback(status);
    ipcRenderer.on(IPC.statusUpdate, listener);
    return () => ipcRenderer.removeListener(IPC.statusUpdate, listener);
  },
};

contextBridge.exposeInMainWorld("hexAram", api);
