import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KitchenPalette } from '@/constants/ui-theme';
import { getOrCreateDeviceId, saveSession } from '@/lib/session';
import { apiUrl } from '@/constants/api';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [vegetarian, setVegetarian] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [lactoseFree, setLactoseFree] = useState(false);
  const [loading, setLoading] = useState(false);

  const [googleRequest, , promptGoogleSignIn] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  const canSubmit = useMemo(() => {
    if (mode === 'register') return !!name.trim() && !!email.trim() && !!password.trim();
    return !!email.trim() && !!password.trim();
  }, [mode, name, email, password]);

  async function handleSuccess(payload: { token: string; user: { _id: string; name: string; email: string } }) {
    await saveSession(payload);
    router.replace('/(tabs)');
  }

  async function runLocalAuthPrompt() {
    const isSupported = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!isSupported || !isEnrolled) {
      Alert.alert('Biometria', 'Biometria nao disponivel neste dispositivo.');
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirme sua identidade',
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar senha',
    });

    return result.success;
  }

  async function submitLocal() {
    if (!canSubmit) {
      Alert.alert('Validacao', 'Preencha os campos obrigatorios.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const body =
        mode === 'register'
          ? {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              password,
              preferences: {
                vegetarian,
                glutenFree,
                lactoseFree,
              },
              restrictions: restrictions
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            }
          : {
              email: email.trim().toLowerCase(),
              password,
            };

      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Falha de autenticacao');
      }

      const responsePayload = await response.json();
      await handleSuccess(responsePayload);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  }

  async function submitSocial(provider: 'google' | 'apple') {
    setLoading(true);
    try {
      const canUseDevFallback = __DEV__;
      let payload = {
        provider,
        idToken: '',
        email: email.trim().toLowerCase(),
        name: name.trim() || `Usuario ${provider}`,
        providerId: `${provider}-dev-${Date.now()}`,
      };

      async function applyDevelopmentFallback(reason: string) {
        if (!canUseDevFallback) {
          throw new Error(reason);
        }

        if (!payload.email) {
          throw new Error('Em desenvolvimento, informe um email para login social simulado.');
        }
      }

      if (provider === 'google') {
        if (!googleRequest) {
          await applyDevelopmentFallback('Google Sign-In nao configurado. Defina os client IDs no .env.');
        } else {
          const result = await promptGoogleSignIn();
          if (result.type === 'success') {
            const idToken = result.params?.id_token;
            if (!idToken) {
              await applyDevelopmentFallback('Google nao retornou id_token.');
            } else {
              payload = {
                ...payload,
                idToken,
                providerId: '',
              };
            }
          } else {
            await applyDevelopmentFallback('Login Google cancelado.');
          }
        }
      }

      if (provider === 'apple') {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        if (!isAvailable) {
          await applyDevelopmentFallback('Sign in with Apple indisponivel neste dispositivo.');
        } else {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          if (!credential.identityToken) {
            await applyDevelopmentFallback('Apple nao retornou identity token.');
          } else {
            const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
              .filter(Boolean)
              .join(' ')
              .trim();

            payload = {
              ...payload,
              idToken: credential.identityToken,
              providerId: credential.user,
              email: credential.email || payload.email,
              name: fullName || payload.name,
            };
          }
        }
      }

      const response = await fetch(apiUrl('/auth/social-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Falha no login social');
      }

      const responsePayload = await response.json();
      await handleSuccess(responsePayload);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha no login social');
    } finally {
      setLoading(false);
    }
  }

  async function submitBiometric() {
    if (!email.trim()) {
      Alert.alert('Validacao', 'Informe o email para login biometrico.');
      return;
    }

    const authOk = await runLocalAuthPrompt();
    if (!authOk) {
      Alert.alert('Biometria', 'Autenticacao biometrica cancelada.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getOrCreateDeviceId();

      const challengeResponse = await fetch(apiUrl('/auth/biometric/challenge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), deviceId }),
      });

      if (!challengeResponse.ok) {
        const errorBody = await challengeResponse.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Falha ao iniciar desafio biometrico');
      }

      const challengePayload = (await challengeResponse.json()) as { challenge: string };

      const response = await fetch(apiUrl('/auth/biometric/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          deviceId,
          challenge: challengePayload.challenge,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Falha no login biometrico');
      }

      const payload = await response.json();
      await handleSuccess(payload);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha no login biometrico');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.title}>
            Receita da Vovo
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Sprint 1: onboarding, login social e biometria.
          </ThemedText>

          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeButton, mode === 'login' ? styles.modeButtonActive : undefined]}
              onPress={() => setMode('login')}>
              <ThemedText style={mode === 'login' ? styles.modeTextActive : styles.modeText}>Entrar</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === 'register' ? styles.modeButtonActive : undefined]}
              onPress={() => setMode('register')}>
              <ThemedText style={mode === 'register' ? styles.modeTextActive : styles.modeText}>Cadastrar</ThemedText>
            </Pressable>
          </View>

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={name}
              onChangeText={setName}
              placeholderTextColor={KitchenPalette.muted}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={KitchenPalette.muted}
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={KitchenPalette.muted}
          />

          {mode === 'register' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Restricoes (separadas por virgula)"
                value={restrictions}
                onChangeText={setRestrictions}
                placeholderTextColor={KitchenPalette.muted}
              />

              <View style={styles.switchRow}>
                <ThemedText>Vegetariano</ThemedText>
                <Switch value={vegetarian} onValueChange={setVegetarian} />
              </View>
              <View style={styles.switchRow}>
                <ThemedText>Sem gluten</ThemedText>
                <Switch value={glutenFree} onValueChange={setGlutenFree} />
              </View>
              <View style={styles.switchRow}>
                <ThemedText>Sem lactose</ThemedText>
                <Switch value={lactoseFree} onValueChange={setLactoseFree} />
              </View>
            </>
          )}

          <Pressable style={styles.primaryButton} onPress={submitLocal} disabled={loading}>
            <ThemedText type="defaultSemiBold" style={styles.primaryText}>
              {loading ? 'Aguarde...' : mode === 'register' ? 'Cadastrar com onboarding' : 'Entrar'}
            </ThemedText>
          </Pressable>

          <View style={styles.socialRow}>
            <Pressable style={styles.secondaryButton} onPress={() => submitSocial('google')} disabled={loading}>
              <ThemedText style={styles.secondaryText}>Google</ThemedText>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => submitSocial('apple')} disabled={loading}>
              <ThemedText style={styles.secondaryText}>Apple</ThemedText>
            </Pressable>
          </View>

          <Pressable style={styles.biometricButton} onPress={submitBiometric} disabled={loading}>
            <ThemedText type="defaultSemiBold" style={styles.biometricText}>
              Entrar com biometria
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KitchenPalette.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    backgroundColor: KitchenPalette.surface,
    padding: 16,
    gap: 10,
  },
  title: {
    color: KitchenPalette.text,
  },
  subtitle: {
    color: KitchenPalette.muted,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: KitchenPalette.primary,
    borderColor: KitchenPalette.primary,
  },
  modeText: {
    color: KitchenPalette.text,
  },
  modeTextActive: {
    color: '#FFF8F2',
  },
  input: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: KitchenPalette.text,
    backgroundColor: '#FFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: KitchenPalette.primary,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryText: {
    color: '#FFF8F2',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    backgroundColor: KitchenPalette.surfaceAlt,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    color: KitchenPalette.text,
    fontSize: 13,
  },
  biometricButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KitchenPalette.secondary,
    alignItems: 'center',
    paddingVertical: 10,
  },
  biometricText: {
    color: KitchenPalette.secondary,
  },
});
