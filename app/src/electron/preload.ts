import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  send: (channel: string, data: unknown) =>
    ipcRenderer.send(channel, data),

  on: (channel: string, callback: (data: unknown) => void) =>
    ipcRenderer.on(channel, (_, data) => callback(data)),
});