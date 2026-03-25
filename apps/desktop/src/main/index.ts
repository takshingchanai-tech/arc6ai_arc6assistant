import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupTray } from './tray.js'
import { setupIpc } from './ipc.js'
import { setupUpdater } from './updater.js'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 360,
    minHeight: 500,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Hide to tray instead of quitting
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  return win
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.arc6ai.assistant')

  // Hide from dock on macOS — live in tray only
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  mainWindow = createWindow()
  setupTray(mainWindow)
  setupIpc(mainWindow)
  setupUpdater()

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  // Keep running in tray — do not quit
})

// Allow graceful quit from tray menu
declare global {
  // eslint-disable-next-line no-var
  var isQuitting: boolean
}
Object.defineProperty(app, 'isQuitting', {
  get: () => global.isQuitting ?? false,
  set: (v) => { global.isQuitting = v },
})
