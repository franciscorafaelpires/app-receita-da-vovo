import Constants from 'expo-constants';

function getDevHostFromExpo(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  return host || null;
}

const envBaseUrl = process.env.EXPO_PUBLIC_API_URL;
const devHost = getDevHostFromExpo();

export const API_BASE_URL = envBaseUrl ?? (devHost ? `http://${devHost}:3000` : 'http://localhost:3000');

export function apiUrl(path: string): string {
  return `${API_BASE_URL}/api/v1${path}`;
}
