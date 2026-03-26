import { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { useChat } from '../../hooks/useChat.js'
import { ChatBubble } from '../../components/ChatBubble.js'
import { MessageInput } from '../../components/MessageInput.js'
import type { AttachmentRef, UploadResponse } from '@arc6assistant/shared'
import { useSettings } from '../../hooks/useSettings.js'

interface PendingAttachment extends AttachmentRef {
  uploadedAt: number
}

export default function ChatScreen(): JSX.Element {
  const { apiUrl } = useSettings()
  const { messages, isLoading, error, sendMessage, clearMessages, getSessionId } = useChat(apiUrl)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFilePress = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'image/*',
      ],
      copyToCacheDirectory: true,
    })

    if (result.canceled || result.assets.length === 0) return

    const asset = result.assets[0]
    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
      } as unknown as Blob)
      const sessionId = getSessionId()
      if (sessionId) formData.append('sessionId', sessionId)

      const res = await fetch(`${apiUrl}/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
        throw new Error(body.error || `Upload failed: ${res.status}`)
      }
      const uploadResult = await res.json() as UploadResponse

      setPendingAttachments((prev) => [
        ...prev,
        {
          fileId: uploadResult.fileId,
          fileName: uploadResult.fileName,
          fileType: uploadResult.fileType,
          uploadedAt: Date.now(),
        },
      ])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [apiUrl])

  const handleSend = useCallback(
    (text: string, attachments: AttachmentRef[]) => {
      sendMessage(text, attachments)
      setPendingAttachments([])
    },
    [sendMessage]
  )

  const removeAttachment = useCallback((fileId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.fileId !== fileId))
  }, [])

  const displayError = error || uploadError

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {displayError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>Arc6 Assistant</Text>
            <Text style={styles.emptySubtitle}>
              Upload files or ask anything.{'\n'}I can analyze documents and search the web.
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            contentContainerStyle={styles.messageList}
            inverted={false}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onContentSizeChange={() => {}}
          />
        )}

        <View style={styles.inputWrapper}>
          <MessageInput
            onSend={handleSend}
            onFilePress={handleFilePress}
            pendingAttachments={pendingAttachments}
            onRemoveAttachment={removeAttachment}
            isLoading={isLoading}
            isUploading={isUploading}
          />
        </View>
      </KeyboardAvoidingView>

      {messages.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={clearMessages}>
          <Text style={styles.clearText}>New Chat</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  messageList: { paddingVertical: 12 },
  inputWrapper: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: { fontSize: 13, color: '#DC2626' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
})
