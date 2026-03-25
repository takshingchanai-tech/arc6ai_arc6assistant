import { useState, useCallback } from 'react'
import { ApiClient } from '@arc6assistant/shared'
import type { AttachmentRef } from '@arc6assistant/shared'

export interface UploadedAttachment extends AttachmentRef {
  uploadedAt: number
}

export function useFileUpload(apiUrl: string, getSessionId: () => string | undefined) {
  const [uploads, setUploads] = useState<UploadedAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async (file: File): Promise<AttachmentRef | null> => {
      setIsUploading(true)
      setUploadError(null)

      try {
        const client = new ApiClient(apiUrl, getSessionId())
        const result = await client.upload(file, file.name)

        const attachment: UploadedAttachment = {
          fileId: result.fileId,
          fileName: result.fileName,
          fileType: result.fileType,
          uploadedAt: Date.now(),
        }

        setUploads((prev) => [...prev, attachment])
        return attachment
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Upload failed'
        setUploadError(errMsg)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    [apiUrl, getSessionId]
  )

  const removeUpload = useCallback((fileId: string) => {
    setUploads((prev) => prev.filter((u) => u.fileId !== fileId))
  }, [])

  return { uploads, isUploading, uploadError, uploadFile, removeUpload }
}
