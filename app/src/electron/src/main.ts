import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerWorldIpc } from "../ipc/file.js";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), 
      contextIsolation: true, 
    },
  });

  win.webContents.openDevTools();
  win.loadFile(path.join(__dirname, "../../index.html"));
}

function setSavePath() {
  const customUserData = path.join(
    app.getPath("appData"),
    ".minecraft-ts"
  );
  
  app.setPath("userData", customUserData);
}

app.whenReady().then(() => {
  setSavePath();
  createWindow();
  registerWorldIpc();
});
