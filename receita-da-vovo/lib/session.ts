import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiUrl } from '@/constants/api';

export type SessionUser = {
  _id: string;
  name: string;
  email: string;
  biometricEnabled?: boolean;
  analyticsConsent?: boolean;
};

export type SessionData = {
  token: string;
  user: SessionUser;
};

const SESSION_KEY = '@receita-da-vovo/session';
const DEVICE_ID_KEY = '@receita-da-vovo/device-id';

export async function getSession(): Promise<SessionData | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function saveSession(data: SessionData): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const current = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (current) return current;

  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const session = await getSession();
  const headers = new Headers(options.headers || {});

  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
}

export async function sendAnalyticsEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  try {
    const response = await authFetch('/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ eventName, metadata }),
    });

    if (!response.ok) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
