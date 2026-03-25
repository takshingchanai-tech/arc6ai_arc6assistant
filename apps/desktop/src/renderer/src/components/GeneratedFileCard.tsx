interface Props {
  fileName: string
  format: string
  downloadUrl: string
}

const FORMAT_ICONS: Record<string, string> = {
  docx: '📄',
  xlsx: '📊',
  pdf: '📋',
}

export default function GeneratedFileCard({ fileName, format, downloadUrl }: Props): JSX.Element {
  const handleDownload = async (): Promise<void> => {
    // Fetch the file and save via Electron IPC
    const res = await fetch(downloadUrl)
    const buffer = await res.arrayBuffer()
    await window.arc6.saveFile(fileName, buffer)
  }

  return (
    <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 my-1">
      <span className="text-xl">{FORMAT_ICONS[format] ?? '📁'}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate max-w-[140px]">{fileName}</p>
        <p className="text-xs text-gray-400">{format.toUpperCase()} file ready</p>
      </div>
      <button
        onClick={handleDownload}
        className="text-blue-500 hover:text-blue-700 text-xs font-medium ml-1 flex-shrink-0"
      >
        Save
      </button>
    </div>
  )
}
