import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useState } from 'react'
import { useSettings } from '../../hooks/useSettings.js'

interface GeneratedFileEntry {
  fileId: string
  fileName: string
  format: string
  downloadUrl: string
  generatedAt: number
}

// In production this would come from a session store or API
export default function FilesScreen(): JSX.Element {
  const { apiUrl } = useSettings()
  const [files] = useState<GeneratedFileEntry[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (file: GeneratedFileEntry): Promise<void> => {
    setDownloading(file.fileId)
    try {
      const localUri = `${FileSystem.documentDirectory}${file.fileName}`
      const downloadResult = await FileSystem.downloadAsync(file.downloadUrl, localUri)

      if (downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync()
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: getMimeType(file.format),
            dialogTitle: `Save ${file.fileName}`,
          })
        } else {
          Alert.alert('Downloaded', `Saved to: ${downloadResult.uri}`)
        }
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {files.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyTitle}>No files yet</Text>
          <Text style={styles.emptySubtitle}>
            Files generated during your chats will appear here.
          </Text>
        </View>
      ) : (
        files.map((file) => (
          <View key={file.fileId} style={styles.fileCard}>
            <Text style={styles.fileIcon}>{FORMAT_ICONS[file.format] ?? '📄'}</Text>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.fileName}
              </Text>
              <Text style={styles.fileMeta}>
                {file.format.toUpperCase()} · {formatDate(file.generatedAt)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDownload(file)}
              disabled={downloading === file.fileId}
              style={styles.downloadButton}
            >
              <Text style={styles.downloadText}>
                {downloading === file.fileId ? '...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const FORMAT_ICONS: Record<string, string> = { docx: '📄', xlsx: '📊', pdf: '📋' }

function getMimeType(format: string): string {
  const types: Record<string, string> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
  }
  return types[format] ?? 'application/octet-stream'
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString()
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  fileIcon: { fontSize: 28 },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  fileMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  downloadButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  downloadText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
})
