import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = is.dev
    ? join(__dirname, '../../build/trayIcon.png')
    : join(process.resourcesPath, 'trayIcon.png')

  // Fallback: use a blank icon if the file doesn't exist yet
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty()
    }
  } catch {
    icon = nativeImage.createEmpty()
  }

  // macOS: use template image (auto light/dark mode)
  if (process.platform === 'darwin') {
    icon = icon.resize({ width: 16, height: 16 })
    icon.setTemplateImage(true)
  }

  tray = new Tray(icon)
  tray.setToolTip('Arc6 Assistant')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Arc6 Assistant',
      click: () => showWindow(mainWindow),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        ;(app as unknown as { isQuitting: boolean }).isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  // Left-click toggles window on Windows/Linux
  tray.on('click', () => {
    toggleWindow(mainWindow)
  })

  // Double-click to open on macOS
  tray.on('double-click', () => {
    showWindow(mainWindow)
  })
}

function showWindow(win: BrowserWindow): void {
  if (win.isVisible()) {
    win.focus()
  } else {
    win.show()
    win.focus()
  }
}

function toggleWindow(win: BrowserWindow): void {
  if (win.isVisible() && win.isFocused()) {
    win.hide()
  } else {
    showWindow(win)
  }
}
