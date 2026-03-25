declare global {
  interface Window {
    arc6: {
      openFile(): Promise<{ name: string; buffer: ArrayBuffer; path: string } | null>
      saveFile(fileName: string, buffer: ArrayBuffer): Promise<boolean>
      minimizeWindow(): void
      closeWindow(): void
      platform: NodeJS.Platform
    }
  }
}

export {}
