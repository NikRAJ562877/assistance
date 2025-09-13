"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("assistant", {
  readClipboard() {
    return electron.clipboard.readText();
  },
  run(mode, input, apiKey, options) {
    return electron.ipcRenderer.invoke("assistant:run", { mode, input, apiKey, options });
  },
  setAlwaysOnTop(flag) {
    return electron.ipcRenderer.invoke("window:setAlwaysOnTop", flag);
  },
  setFloatingMode(mode) {
    return electron.ipcRenderer.invoke("window:setFloatingMode", mode);
  },
  setCompact(flag) {
    return electron.ipcRenderer.invoke("window:setCompact", flag);
  }
});
