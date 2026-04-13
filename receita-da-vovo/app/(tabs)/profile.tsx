import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KitchenPalette } from '@/constants/ui-theme';
import { authFetch, clearSession, getOrCreateDeviceId, getSession, saveSession, type SessionData } from '@/lib/session';
import { router } from 'expo-router';

type Collection = {
  _id: string;
  name: string;
  recipeIds: (
    | string
    | {
        _id: string;
        title?: string;
        imageUrl?: string;
      }
  )[];
};

type HistoryItem = {
  _id: string;
  notes: string;
  difficultyVote: number;
  realTimeMinutes: number;
  preparedAt: string;
  recipeId?: {
    title?: string;
  };
};

export default function ProfileScreen() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recipeTitlesById, setRecipeTitlesById] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState('');
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const current = await getSession();
      if (!current) {
        router.replace('/auth');
        return;
      }

      setSession(current);
      setAnalyticsConsent(!!current.user.analyticsConsent);
      setBiometricEnabled(!!current.user.biometricEnabled);

      const [collectionsRes, historyRes] = await Promise.all([
        authFetch('/collections'),
        authFetch('/history'),
      ]);

      if (collectionsRes.ok) {
        const loadedCollections = (await collectionsRes.json()) as Collection[];
        setCollections(loadedCollections);

        const unresolvedIds = new Set<string>();
        const discoveredTitles: Record<string, string> = {};

        for (const collection of loadedCollections) {
          for (const recipe of collection.recipeIds) {
            if (typeof recipe === 'string') {
              unresolvedIds.add(recipe);
            } else if (recipe.title) {
              discoveredTitles[recipe._id] = recipe.title;
            }
          }
        }

        if (Object.keys(discoveredTitles).length > 0) {
          setRecipeTitlesById((prev) => ({ ...prev, ...discoveredTitles }));
        }

        if (unresolvedIds.size > 0) {
          const lookups = await Promise.allSettled(
            Array.from(unresolvedIds).map(async (id) => {
              const response = await authFetch(`/recipes/${id}`);
              if (!response.ok) return { id, title: '' };
              const recipe = await response.json();
              return { id, title: recipe?.title || '' };
            })
          );

          const fetchedTitles: Record<string, string> = {};
          for (const result of lookups) {
            if (result.status === 'fulfilled' && result.value.title) {
              fetchedTitles[result.value.id] = result.value.title;
            }
          }

          if (Object.keys(fetchedTitles).length > 0) {
            setRecipeTitlesById((prev) => ({ ...prev, ...fetchedTitles }));
          }
        }
      }
      if (historyRes.ok) {
        setHistory(await historyRes.json());
      }
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar perfil.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createCollection() {
    if (!newCollectionName.trim()) return;

    const response = await authFetch('/collections', {
      method: 'POST',
      body: JSON.stringify({ name: newCollectionName.trim() }),
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel criar colecao.');
      return;
    }

    setNewCollectionName('');
    await loadData();
  }

  function startEditCollection(collection: Collection) {
    setEditingCollectionId(collection._id);
    setEditingCollectionName(collection.name);
  }

  function cancelEditCollection() {
    setEditingCollectionId('');
    setEditingCollectionName('');
  }

  async function saveCollectionName(collectionId: string) {
    const name = editingCollectionName.trim();
    if (!name) {
      Alert.alert('Validacao', 'Informe um nome para a colecao.');
      return;
    }

    const response = await authFetch(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel atualizar a colecao.');
      return;
    }

    cancelEditCollection();
    await loadData();
  }

  async function deleteCollection(collectionId: string) {
    Alert.alert('Excluir colecao', 'Deseja realmente excluir esta colecao?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const response = await authFetch(`/collections/${collectionId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            Alert.alert('Erro', 'Nao foi possivel excluir a colecao.');
            return;
          }

          if (editingCollectionId === collectionId) {
            cancelEditCollection();
          }

          await loadData();
        },
      },
    ]);
  }

  async function removeRecipeFromCollection(collectionId: string, recipeId: string) {
    const response = await authFetch(`/collections/${collectionId}/recipes/${recipeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel remover a receita da colecao.');
      return;
    }

    await loadData();
  }

  function getRecipeInfo(recipe: Collection['recipeIds'][number]) {
    if (typeof recipe === 'string') {
      return {
        id: recipe,
        title: recipeTitlesById[recipe] || `Receita ${recipe.slice(0, 6)}...`,
      };
    }

    return {
      id: recipe._id,
      title: recipe.title || recipeTitlesById[recipe._id] || 'Receita sem titulo',
    };
  }

  async function updateConsent(value: boolean) {
    setAnalyticsConsent(value);
    const response = await authFetch('/analytics/consent', {
      method: 'POST',
      body: JSON.stringify({ enabled: value }),
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel atualizar consentimento.');
      setAnalyticsConsent(!value);
      return;
    }

    if (session) {
      const updated = {
        ...session,
        user: {
          ...session.user,
          analyticsConsent: value,
        },
      };
      setSession(updated);
      await saveSession(updated);
    }
  }

  async function updateBiometric(value: boolean) {
    let deviceId = '';

    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometria', 'Biometria indisponivel no dispositivo.');
        return;
      }

      deviceId = await getOrCreateDeviceId();
    }

    const response = await authFetch('/auth/biometric/enable', {
      method: 'POST',
      body: JSON.stringify({ enabled: value, deviceId }),
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel atualizar biometria.');
      return;
    }

    setBiometricEnabled(value);

    if (session) {
      const updated = {
        ...session,
        user: {
          ...session.user,
          biometricEnabled: value,
        },
      };
      setSession(updated);
      await saveSession(updated);
    }
  }

  async function logout() {
    await clearSession();
    router.replace('/auth');
  }

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={KitchenPalette.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.card}>
              <ThemedText type="title" style={styles.title}>
                Perfil
              </ThemedText>
              <ThemedText style={styles.subtitle}>{session?.user.name}</ThemedText>
              <ThemedText style={styles.subtitle}>{session?.user.email}</ThemedText>

              <View style={styles.rowBetween}>
                <ThemedText>Consentimento de analytics</ThemedText>
                <Switch value={analyticsConsent} onValueChange={updateConsent} />
              </View>

              <View style={styles.rowBetween}>
                <ThemedText>Login biometrico</ThemedText>
                <Switch value={biometricEnabled} onValueChange={updateBiometric} />
              </View>

              <Pressable style={styles.logoutButton} onPress={logout}>
                <ThemedText type="defaultSemiBold" style={styles.logoutText}>
                  Sair
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.card}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Colecoes
              </ThemedText>
              <View style={styles.rowInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nova colecao"
                  placeholderTextColor={KitchenPalette.muted}
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                />
                <Pressable style={styles.smallButton} onPress={createCollection}>
                  <ThemedText style={styles.smallButtonText}>Criar</ThemedText>
                </Pressable>
              </View>

              {collections.length === 0 ? (
                <ThemedText style={styles.subtitle}>Nenhuma colecao criada ainda.</ThemedText>
              ) : (
                collections.map((collection) => (
                  <View key={collection._id} style={styles.collectionItem}>
                    {editingCollectionId === collection._id ? (
                      <TextInput
                        style={styles.input}
                        value={editingCollectionName}
                        onChangeText={setEditingCollectionName}
                        placeholder="Nome da colecao"
                        placeholderTextColor={KitchenPalette.muted}
                      />
                    ) : (
                      <ThemedText type="defaultSemiBold">{collection.name}</ThemedText>
                    )}
                    <ThemedText style={styles.subtitle}>{collection.recipeIds.length} receita(s)</ThemedText>
                    <View style={styles.collectionActions}>
                      {editingCollectionId === collection._id ? (
                        <>
                          <Pressable style={styles.smallButton} onPress={() => saveCollectionName(collection._id)}>
                            <ThemedText style={styles.smallButtonText}>Salvar</ThemedText>
                          </Pressable>
                          <Pressable style={styles.outlineButton} onPress={cancelEditCollection}>
                            <ThemedText style={styles.outlineButtonText}>Cancelar</ThemedText>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <Pressable style={styles.smallButton} onPress={() => startEditCollection(collection)}>
                            <ThemedText style={styles.smallButtonText}>Editar</ThemedText>
                          </Pressable>
                          <Pressable style={styles.outlineDangerButton} onPress={() => deleteCollection(collection._id)}>
                            <ThemedText style={styles.outlineDangerButtonText}>Excluir</ThemedText>
                          </Pressable>
                        </>
                      )}
                    </View>

                    {collection.recipeIds.length > 0 ? (
                      <View style={styles.recipeList}>
                        {collection.recipeIds.map((recipe) => {
                          const info = getRecipeInfo(recipe);
                          return (
                            <View key={`${collection._id}-${info.id}`} style={styles.recipeListItem}>
                              <ThemedText style={styles.recipeListText}>{info.title}</ThemedText>
                              <Pressable
                                style={styles.inlineDangerButton}
                                onPress={() => removeRecipeFromCollection(collection._id, info.id)}>
                                <ThemedText style={styles.inlineDangerButtonText}>Remover</ThemedText>
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>

            <ThemedText type="subtitle" style={styles.historyTitle}>
              Historico de receitas preparadas
            </ThemedText>
          </>
        }
        ListEmptyComponent={<ThemedText style={styles.subtitle}>Sem historico ainda.</ThemedText>}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <ThemedText type="defaultSemiBold">{item.recipeId?.title || 'Receita'}</ThemedText>
            <ThemedText style={styles.subtitle}>Dificuldade: {item.difficultyVote}/5</ThemedText>
            <ThemedText style={styles.subtitle}>Tempo real: {item.realTimeMinutes} min</ThemedText>
            {item.notes ? <ThemedText style={styles.subtitle}>Notas: {item.notes}</ThemedText> : null}
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: KitchenPalette.background,
  },
  container: {
    flex: 1,
    backgroundColor: KitchenPalette.background,
  },
  list: {
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 18,
    backgroundColor: KitchenPalette.surface,
    padding: 14,
    gap: 8,
  },
  title: {
    color: KitchenPalette.text,
  },
  sectionTitle: {
    color: KitchenPalette.text,
  },
  subtitle: {
    color: KitchenPalette.muted,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B9372E',
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#B9372E',
  },
  rowInput: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
  smallButton: {
    backgroundColor: KitchenPalette.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallButtonText: {
    color: '#FFF8F2',
  },
  collectionItem: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: KitchenPalette.surfaceAlt,
    gap: 8,
  },
  collectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: KitchenPalette.surface,
  },
  outlineButtonText: {
    color: KitchenPalette.text,
  },
  outlineDangerButton: {
    borderWidth: 1,
    borderColor: '#B9372E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: KitchenPalette.surface,
  },
  outlineDangerButtonText: {
    color: '#B9372E',
  },
  recipeList: {
    gap: 8,
  },
  recipeListItem: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 10,
    backgroundColor: KitchenPalette.surface,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  recipeListText: {
    flex: 1,
    color: KitchenPalette.text,
  },
  inlineDangerButton: {
    borderWidth: 1,
    borderColor: '#B9372E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineDangerButtonText: {
    color: '#B9372E',
    fontSize: 12,
  },
  historyTitle: {
    marginTop: 2,
    color: KitchenPalette.text,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 14,
    backgroundColor: KitchenPalette.surface,
    padding: 12,
    gap: 3,
  },
});
