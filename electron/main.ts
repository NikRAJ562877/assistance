import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
// Avoid optional native deps of ws at runtime
process.env.WS_NO_BUFFER_UTIL = process.env.WS_NO_BUFFER_UTIL || '1'
process.env.WS_NO_UTF_8_VALIDATE = process.env.WS_NO_UTF_8_VALIDATE || '1'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let previousBounds: Electron.Rectangle | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// Example IPC handler
ipcMain.handle('ping', async (_event, payload: unknown) => {
  const now = new Date().toISOString()
  return { ok: true, now, payload }
})

// Assistant runner (demo logic)
ipcMain.handle('assistant:run', async (
  _event,
  {
    mode,
    input,
    apiKey: overrideKey,
    options,
  }: {
    mode: 'summarize' | 'rewrite' | 'outline' | 'todos'
    input: string
    apiKey?: string
    options?: { model?: string; temperature?: number; systemPrompt?: string }
  },
) => {
  const trimmed = (input ?? '').trim()
  if (!trimmed) {
    throw new Error('Input is empty')
  }
  const apiKey = (overrideKey && overrideKey.trim()) || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const prompts: Record<'summarize' | 'rewrite' | 'outline' | 'todos', string> = {
    summarize: 'Summarize the following text in 5 concise bullet points:',
    rewrite: 'Rewrite the following text to be clearer and more concise:',
    outline: 'Create a concise outline from the following text:',
    todos: 'Extract actionable TODO items from the following text:',
  }
  const system = options?.systemPrompt || prompts[mode] || 'Respond helpfully to:'

  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey })
  const params: any = {
    model: options?.model || 'gemini-2.0-flash',
    contents: `${system}\n\n${trimmed}`,
  }
  if (options?.temperature !== undefined) {
    params.config = { temperature: options.temperature }
  }
  const res: unknown = await ai.models.generateContent(params)
  const text = (res as any)?.text as string | undefined
  return text ?? ''
})

ipcMain.handle('window:setAlwaysOnTop', async (_event, flag: boolean) => {
  if (win) {
    win.setAlwaysOnTop(!!flag, 'floating')
    if (flag) {
      win.setVisibleOnAllWorkspaces(true)
      win.setAlwaysOnTop(true)
    } else {
      win.setVisibleOnAllWorkspaces(false)
    }
  }
  return { ok: true, alwaysOnTop: !!flag }
})

type FloatingMode = 'normal' | 'overlay' | 'pip' | 'dock-left' | 'dock-right'

ipcMain.handle('window:setFloatingMode', async (_event, mode: FloatingMode) => {
  if (!win) return { ok: false }
  const display = require('electron').screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  switch (mode) {
    case 'overlay': {
      win.setAlwaysOnTop(true, 'screen-saver')
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      win.setFullScreenable(false)
      break
    }
    case 'pip': {
      const w = Math.round(Math.min(480, width * 0.3))
      const h = Math.round(w * 0.75)
      win.setAlwaysOnTop(true, 'floating')
      win.setVisibleOnAllWorkspaces(true)
      win.setSize(w, h, true)
      win.setPosition(width - w - 16, 16)
      break
    }
    case 'dock-left': {
      const w = Math.round(Math.min(520, width * 0.33))
      const h = Math.round(height)
      win.setAlwaysOnTop(true, 'floating')
      win.setVisibleOnAllWorkspaces(true)
      win.setSize(w, h, true)
      win.setPosition(0, 0)
      break
    }
    case 'dock-right': {
      const w = Math.round(Math.min(520, width * 0.33))
      const h = Math.round(height)
      win.setAlwaysOnTop(true, 'floating')
      win.setVisibleOnAllWorkspaces(true)
      win.setSize(w, h, true)
      win.setPosition(width - w, 0)
      break
    }
    default: {
      win.setAlwaysOnTop(false)
      win.setVisibleOnAllWorkspaces(false)
      win.setFullScreenable(true)
      break
    }
  }
  return { ok: true, mode }
})

ipcMain.handle('window:setCompact', async (_event, flag: boolean) => {
  if (!win) return { ok: false }
  if (flag) {
    if (!previousBounds) previousBounds = win.getBounds()
    const display = require('electron').screen.getPrimaryDisplay()
    const { width, height } = display.workAreaSize
    const targetWidth = Math.min(560, Math.max(400, Math.round(width * 0.35)))
    const targetHeight = Math.min(600, Math.max(360, Math.round(height * 0.45)))
    win.setResizable(true)
    win.setMinimumSize(360, 300)
    win.setSize(targetWidth, targetHeight, true)
    win.center()
    win.setAlwaysOnTop(true, 'floating')
  } else {
    const bounds = previousBounds
    previousBounds = null
    win.setAlwaysOnTop(false)
    if (bounds) {
      win.setBounds(bounds, true)
    }
  }
  return { ok: true, compact: !!flag }
})
