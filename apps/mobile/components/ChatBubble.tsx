import { View, Text, StyleSheet } from 'react-native'
import type { ChatMessage } from '../hooks/useChat.js'

interface Props {
  message: ChatMessage
}

export function ChatBubble({ message }: Props): JSX.Element {
  const isUser = message.role === 'user'

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachments}>
            {message.attachments.map((att) => (
              <View key={att.fileId} style={styles.attachmentTag}>
                <Text style={styles.attachmentText}>📎 {att.fileName}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
          {message.content}
          {message.isStreaming && (
            <Text style={styles.cursor}>▌</Text>
          )}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleUser: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, lineHeight: 21 },
  textUser: { color: '#FFFFFF' },
  textAssistant: { color: '#1F2937' },
  cursor: { color: '#9CA3AF' },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  attachmentTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  attachmentText: { fontSize: 11, color: '#FFFFFF' },
})
