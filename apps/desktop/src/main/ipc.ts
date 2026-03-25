import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { basename } from 'path'

export function setupIpc(_mainWindow: BrowserWindow): void {
  // Open file picker and return file data to renderer
  ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Supported Files', extensions: ['pdf', 'docx', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const buffer = await readFile(filePath)
    const fileName = basename(filePath)

    return {
      name: fileName,
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      path: filePath,
    }
  })

  // Save a file buffer to disk via native save dialog
  ipcMain.handle('save-file', async (_event, fileName: string, buffer: ArrayBuffer) => {
    const result = await dialog.showSaveDialog({
      defaultPath: fileName,
      filters: [
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || !result.filePath) return false

    await writeFile(result.filePath, Buffer.from(buffer))
    return true
  })

  // Window controls
  ipcMain.on('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on('close-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.hide()
  })
}
