import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Storage for the Supabase sign-in session.
//
// The session is kept in the phone's secure hardware store (iOS Keychain /
// Android Keystore) instead of plain app storage, so another app or a phone
// backup cannot read it. SecureStore values are limited to ~2 KB and a session
// is larger than that, so it is split across several numbered entries.

const CHUNK = 1800
const OPTS: SecureStore.SecureStoreOptions = {
  // Readable after the phone has been unlocked once since boot (so the token
  // can refresh in the background) and never copied to another device.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
}

// SecureStore keys may only contain letters, digits, '.', '-' and '_'
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_')

async function getItem(key: string): Promise<string | null> {
  const k = safe(key)
  const count = Number(await SecureStore.getItemAsync(`${k}.n`, OPTS))
  if (!count) return null
  let value = ''
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${k}.${i}`, OPTS)
    if (part == null) return null   // incomplete write → treat as signed out
    value += part
  }
  return value
}

async function removeItem(key: string): Promise<void> {
  const k = safe(key)
  const count = Number(await SecureStore.getItemAsync(`${k}.n`, OPTS))
  for (let i = 0; i < (count || 0); i++) await SecureStore.deleteItemAsync(`${k}.${i}`, OPTS)
  await SecureStore.deleteItemAsync(`${k}.n`, OPTS)
}

async function setItem(key: string, value: string): Promise<void> {
  const k = safe(key)
  const previous = Number(await SecureStore.getItemAsync(`${k}.n`, OPTS)) || 0
  const parts: string[] = []
  for (let i = 0; i < value.length; i += CHUNK) parts.push(value.slice(i, i + CHUNK))

  for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(`${k}.${i}`, parts[i], OPTS)
  await SecureStore.setItemAsync(`${k}.n`, String(parts.length), OPTS)
  // Drop leftovers from a previous, longer value
  for (let i = parts.length; i < previous; i++) await SecureStore.deleteItemAsync(`${k}.${i}`, OPTS)
}

// SecureStore does not exist in a web browser; fall back there (dev preview only)
export const secureStorage =
  Platform.OS === 'web' ? AsyncStorage : { getItem, setItem, removeItem }
