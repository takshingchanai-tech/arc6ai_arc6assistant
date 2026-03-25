import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

export function setupUpdater(): void {
  if (is.dev) return // No updates in dev mode

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', () => {
    // Will install on next quit
  })

  // Check on startup, then every 4 hours
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000)
}
