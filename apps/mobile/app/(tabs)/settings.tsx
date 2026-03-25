import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native'
import { useState } from 'react'
import { useSettings } from '../../hooks/useSettings.js'

export default function SettingsScreen(): JSX.Element {
  const { apiUrl, setApiUrl } = useSettings()
  const [draft, setDraft] = useState(apiUrl)
  const [saved, setSaved] = useState(false)

  const handleSave = async (): Promise<void> => {
    if (!draft.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with https://')
      return
    }
    await setApiUrl(draft.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = async (): Promise<void> => {
    const defaultUrl = 'https://arc6assistant.workers.dev'
    setDraft(defaultUrl)
    await setApiUrl(defaultUrl)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend URL</Text>
        <Text style={styles.sectionDesc}>
          The URL of your Arc6 Assistant API (Cloudflare Worker).
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
          placeholder="https://arc6assistant.workers.dev"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset to default</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveText}>{saved ? '✓ Saved' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>App</Text>
          <Text style={styles.aboutValue}>Arc6 Assistant</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Built by</Text>
          <Text style={styles.aboutValue}>Arc6AI</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionDesc: { fontSize: 13, color: '#6B7280', marginBottom: 10, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  resetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  resetText: { fontSize: 13, color: '#6B7280' },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  saveText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  aboutLabel: { fontSize: 14, color: '#374151' },
  aboutValue: { fontSize: 14, color: '#6B7280' },
})
