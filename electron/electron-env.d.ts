/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  assistant: {
    run: (
      mode: 'summarize' | 'rewrite' | 'outline' | 'todos',
      input: string,
      apiKey?: string,
      options?: {
        model?: string
        temperature?: number
        systemPrompt?: string
      }
    ) => Promise<string>
    readClipboard: () => string
    setAlwaysOnTop: (flag: boolean) => Promise<{ ok: boolean, alwaysOnTop: boolean }>
    setFloatingMode: (mode: 'normal' | 'overlay' | 'pip' | 'dock-left' | 'dock-right') => Promise<{ ok: boolean, mode?: string }>
    setCompact: (flag: boolean) => Promise<{ ok: boolean, compact: boolean }>
  }
}
