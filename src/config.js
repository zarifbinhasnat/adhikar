import Constants from 'expo-constants';
import { Platform } from 'react-native';

const HUB_PORT = 8787;

// In Expo Go the bundle is served by Metro on the laptop, so the laptop's
// address is the host part of hostUri ("192.168.x.x:8081"). The hub runs there too.
function laptopHost() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  if (hostUri) return hostUri.split(':')[0];
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.hostname;
  return 'localhost';
}

export const HUB_URL = process.env.EXPO_PUBLIC_HUB_URL || `http://${laptopHost()}:${HUB_PORT}`;

export async function hubFetch(path, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${HUB_URL}${path}`, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`Hub responded ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}
