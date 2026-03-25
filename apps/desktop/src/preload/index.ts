import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('arc6', {
  // Open system file picker, returns { name, buffer, path } or null
  openFile: (): Promise<{ name: string; buffer: ArrayBuffer; path: string } | null> =>
    ipcRenderer.invoke('open-file'),

  // Save a file buffer to disk via native save dialog
  saveFile: (fileName: string, buffer: ArrayBuffer): Promise<boolean> =>
    ipcRenderer.invoke('save-file', fileName, buffer),

  // Window controls
  minimizeWindow: (): void => ipcRenderer.send('minimize-window'),
  closeWindow: (): void => ipcRenderer.send('close-window'),

  // Platform info
  platform: process.platform,
})
