import { Platform } from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Face ID / Touch ID (iPhone) and fingerprint / face unlock (Android).
//
// How it protects the account: the sign-in session stays in the phone's
// secure store, and the app refuses to show anything until the phone's own
// biometric check passes. The face/fingerprint data never leaves the phone and
// is never seen by this app — the phone only answers "yes" or "no".

const ENABLED_KEY = 'gr.biometric.enabled'
const ASKED_KEY   = 'gr.biometric.asked'

/** The phone has a biometric sensor AND the user has set up a face/fingerprint. */
export async function isAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())
  } catch {
    return false
  }
}

/** What to call it on this phone: "Face ID", "Touch ID", "fingerprint" … */
export async function getLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    const face  = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    const print = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    if (Platform.OS === 'ios') return face ? 'Face ID' : 'Touch ID'
    if (face && print) return 'fingerprint or face'
    if (face)  return 'face unlock'
    if (print) return 'fingerprint'
  } catch { /* fall through */ }
  return 'biometrics'
}

export async function isEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true'
}

export async function setEnabled(on: boolean): Promise<void> {
  if (on) await AsyncStorage.setItem(ENABLED_KEY, 'true')
  else    await AsyncStorage.removeItem(ENABLED_KEY)
}

/** Have we already offered to turn it on (so we only ask once)? */
export async function wasOffered(): Promise<boolean> {
  return (await AsyncStorage.getItem(ASKED_KEY)) === 'true'
}
export async function markOffered(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, 'true')
}

/**
 * Show the phone's biometric prompt. Falls back to the phone's own passcode /
 * PIN / pattern if the face or finger is not recognised.
 */
export async function authenticate(reason: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    })
    return result.success
  } catch {
    return false
  }
}
