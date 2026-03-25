import { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from 'react-native'
import type { AttachmentRef } from '@arc6assistant/shared'

interface Props {
  onSend: (text: string, attachments: AttachmentRef[]) => void
  onFilePress: () => void
  pendingAttachments: AttachmentRef[]
  onRemoveAttachment: (fileId: string) => void
  isLoading: boolean
  isUploading: boolean
}

export function MessageInput({
  onSend,
  onFilePress,
  pendingAttachments,
  onRemoveAttachment,
  isLoading,
  isUploading,
}: Props): JSX.Element {
  const [text, setText] = useState('')

  const canSend = (text.trim() || pendingAttachments.length > 0) && !isLoading && !isUploading

  const handleSend = (): void => {
    if (!canSend) return
    onSend(text.trim(), pendingAttachments)
    setText('')
  }

  return (
    <View style={styles.container}>
      {pendingAttachments.length > 0 && (
        <View style={styles.attachments}>
          {pendingAttachments.map((att) => (
            <View key={att.fileId} style={styles.attachmentTag}>
              <Text style={styles.attachmentText} numberOfLines={1}>
                📎 {att.fileName}
              </Text>
              <TouchableOpacity onPress={() => onRemoveAttachment(att.fileId)}>
                <Text style={styles.removeText}> ×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          onPress={onFilePress}
          disabled={isUploading}
          style={styles.attachButton}
        >
          <Text style={[styles.attachIcon, isUploading && styles.disabled]}>
            {isUploading ? '⏳' : '📎'}
          </Text>
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message Arc6 Assistant..."
          placeholderTextColor="#9CA3AF"
          multiline
          style={styles.input}
          returnKeyType="default"
          blurOnSubmit={false}
          onSubmitEditing={Platform.OS === 'ios' ? undefined : handleSend}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, canSend ? styles.sendActive : styles.sendDisabled]}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingBottom: 8, paddingTop: 4, backgroundColor: '#fff' },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  attachmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attachmentText: { fontSize: 12, color: '#3B82F6', maxWidth: 140 },
  removeText: { fontSize: 14, color: '#93C5FD', fontWeight: 'bold' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  attachButton: { paddingBottom: 2 },
  attachIcon: { fontSize: 20 },
  disabled: { opacity: 0.4 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    paddingTop: 2,
    paddingBottom: 2,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendActive: { backgroundColor: '#3B82F6' },
  sendDisabled: { backgroundColor: '#D1D5DB' },
  sendIcon: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', lineHeight: 18 },
})
