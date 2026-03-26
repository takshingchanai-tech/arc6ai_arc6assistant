import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DEFAULT_API_URL = 'https://arc6assistant.takshingchanai.workers.dev'
const STORAGE_KEY = '@arc6assistant:apiUrl'

export function useSettings() {
  const [apiUrl, setApiUrlState] = useState(DEFAULT_API_URL)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setApiUrlState(stored)
      })
      .finally(() => setLoaded(true))
  }, [])

  const setApiUrl = async (url: string) => {
    setApiUrlState(url)
    await AsyncStorage.setItem(STORAGE_KEY, url)
  }

  return { apiUrl, setApiUrl, loaded }
}
