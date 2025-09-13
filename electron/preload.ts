import { ipcRenderer, contextBridge, clipboard } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

// Expose a high-level assistant API tailored for the renderer UI
contextBridge.exposeInMainWorld('assistant', {
  readClipboard() {
    return clipboard.readText()
  },
  run(
    mode: 'summarize' | 'rewrite' | 'outline' | 'todos',
    input: string,
    apiKey?: string,
    options?: { model?: string; temperature?: number; systemPrompt?: string },
  ) {
    return ipcRenderer.invoke('assistant:run', { mode, input, apiKey, options })
  },
  setAlwaysOnTop(flag: boolean) {
    return ipcRenderer.invoke('window:setAlwaysOnTop', flag)
  },
  setFloatingMode(mode: 'normal' | 'overlay' | 'pip' | 'dock-left' | 'dock-right') {
    return ipcRenderer.invoke('window:setFloatingMode', mode)
  },
  setCompact(flag: boolean) {
    return ipcRenderer.invoke('window:setCompact', flag)
  }
})
