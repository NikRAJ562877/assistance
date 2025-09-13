import "dotenv/config";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { runGeminiTask } from "./services/gemini";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  const url = process.env.ELECTRON_RENDERER_URL;
  if (url) win.loadURL(url);
  else win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("gemini:run", async (_evt, { mode, input }) => {
  return await runGeminiTask(mode, input);
});
