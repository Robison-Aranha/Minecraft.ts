import { app, BrowserWindow } from "electron";
import path from "node:path";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
  });

  win.loadFile(path.join(__dirname, "../index.html"));
}

app.whenReady().then(createWindow);