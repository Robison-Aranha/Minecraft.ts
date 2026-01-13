import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  send: (channel: string, data: unknown) =>
    ipcRenderer.send(channel, data),

  on: (channel: string, callback: (data: unknown) => void) =>
    ipcRenderer.on(channel, (_, data) => callback(data)),

  createWorld: (playerName: string, worldName: string, worldType: string) =>
    ipcRenderer.invoke("create-world", playerName, worldName, worldType),

  listWorlds: (playerName: string) => 
    ipcRenderer.invoke("list-worlds", playerName),

  deleteWorld: (playerName: string, worldName: string) => 
    ipcRenderer.invoke("delete-world", playerName, worldName)
});
