import { app, BrowserWindow } from "electron";
import path from "node:path";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
  });

  win.webContents.openDevTools();
  win.loadFile(path.join(__dirname, "../index.html"));
}

app.whenReady().then(() => {
  createWindow();
});
