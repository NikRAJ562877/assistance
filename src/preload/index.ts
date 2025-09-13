import { contextBridge, ipcRenderer, clipboard } from "electron";

contextBridge.exposeInMainWorld("assistant", {
  run: (mode: string, input: string) =>
    ipcRenderer.invoke("gemini:run", { mode, input }),
  readClipboard: () => clipboard.readText(),
});
