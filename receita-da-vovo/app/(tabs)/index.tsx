import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  Easing,
  FlatList,
  Image,
  Pressable,
  type StyleProp,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL, apiUrl } from '@/constants/api';
import { KitchenPalette } from '@/constants/ui-theme';
import { authFetch, getSession, sendAnalyticsEvent, type SessionData } from '@/lib/session';

type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
};

type Recipe = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  averageRating?: number;
  ratingsCount?: number;
  ingredients: Ingredient[];
};

type Collection = {
  _id: string;
  name: string;
};

function RecipeVideoPreview({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer({ uri });

  return <VideoView player={player} style={style} nativeControls contentFit="cover" />;
}

export default function RecipesScreen() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredientName, setIngredientName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewPhotos, setReviewPhotos] = useState<Record<string, string>>({});
  const [isSendingShoppingByRecipe, setIsSendingShoppingByRecipe] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(18)).current;

  const hasFormData = useMemo(() => title.trim().length > 0, [title]);

  const loadCollections = useCallback(async () => {
    const response = await authFetch('/collections');
    if (!response.ok) return;

    const data = (await response.json()) as Collection[];
    setCollections(data);

    setSelectedCollectionId((previous) => {
      const stillExists = data.some((collection) => collection._id === previous);
      if (stillExists) return previous;
      return data[0]?._id || '';
    });
  }, []);

  const loadRecipes = useCallback(async (query = '') => {
    try {
      const path = query.trim() ? `/recipes?q=${encodeURIComponent(query.trim())}` : '/recipes';
      const response = await fetch(apiUrl(path));
      const data = await response.json();

      const recipeList = Array.isArray(data) ? data : [];
      setRecipes(recipeList);
      void sendAnalyticsEvent('recipes_loaded', { count: recipeList.length, query });
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar receitas. Confira a URL da API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const currentSession = await getSession();
      if (!currentSession) {
        router.replace('/auth');
        return;
      }

      setSession(currentSession);
      await Promise.all([loadRecipes(), loadCollections()]);
    }

    bootstrap();
  }, [loadCollections, loadRecipes]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introTranslateY, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [introOpacity, introTranslateY]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadRecipes(searchQuery);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, loadRecipes]);

  useFocusEffect(
    useCallback(() => {
      void loadCollections();
    }, [loadCollections])
  );

  function addIngredient() {
    const normalized = ingredientName.trim();
    if (!normalized) return;

    setIngredients((prev) => [...prev, { name: normalized, quantity: 1, unit: 'un' }]);
    setIngredientName('');
  }

  async function createRecipe() {
    if (!session) {
      Alert.alert('Sessao', 'Faca login para criar receitas.');
      return;
    }

    if (!hasFormData) {
      Alert.alert('Validacao', 'Informe ao menos o titulo da receita.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await authFetch('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          ingredients,
          steps: [],
          imageUrl: imageUrl.trim(),
          videoUrl: videoUrl.trim(),
          videoDurationSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar receita');
      }

      setTitle('');
      setDescription('');
      setIngredients([]);
      setImageUrl('');
      setVideoUrl('');
      setVideoDurationSeconds(0);
      await loadRecipes();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar a receita.');
    } finally {
      setIsSaving(false);
    }
  }

  async function pickRecipeImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao', 'Permita acesso a galeria para selecionar uma imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUrl(result.assets[0].uri);
    }
  }

  async function pickRecipeVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao', 'Permita acesso a galeria para selecionar um video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 8,
      quality: 0.6,
    });

    const pickedAsset = result.assets?.[0];
    if (!result.canceled && pickedAsset?.uri) {
      const duration = Math.ceil((pickedAsset.duration || 0) / 1000);
      if (duration > 8) {
        Alert.alert('Validacao', 'O video deve ter no maximo 8 segundos.');
        return;
      }

      setVideoUrl(pickedAsset.uri);
      setVideoDurationSeconds(duration || 0);
    }
  }

  async function pickReviewPhoto(recipeId: string) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao', 'Permita acesso a galeria para foto da avaliacao.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setReviewPhotos((prev) => ({ ...prev, [recipeId]: result.assets[0].uri }));
    }
  }

  async function submitReview(recipeId: string) {
    if (!session) {
      Alert.alert('Sessao', 'Faca login para avaliar receitas.');
      return;
    }

    const rating = reviewRatings[recipeId] || 5;
    const comment = reviewComments[recipeId] || '';
    const image = reviewPhotos[recipeId] || '';

    const response = await authFetch(`/recipes/${recipeId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        rating,
        comment,
        imageUrl: image,
      }),
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel enviar avaliacao.');
      return;
    }

    Alert.alert('Sucesso', 'Avaliacao enviada.');
    await loadRecipes(searchQuery);
  }

  async function markAsPrepared(recipeId: string) {
    if (!session) {
      Alert.alert('Sessao', 'Faca login para registrar historico.');
      return;
    }

    const response = await authFetch('/history', {
      method: 'POST',
      body: JSON.stringify({
        recipeId,
        notes: 'Preparada via app',
        difficultyVote: 3,
        realTimeMinutes: 30,
      }),
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel registrar preparo.');
      return;
    }

    Alert.alert('Historico', 'Receita registrada como preparada.');
  }

  async function saveRecipeIntoCollection(recipeId: string, collectionId: string) {
    const response = await authFetch(`/collections/${collectionId}/recipes`, {
      method: 'POST',
      body: JSON.stringify({ recipeId }),
    });

    if (!response.ok) {
      Alert.alert('Erro', 'Nao foi possivel adicionar na colecao.');
      return;
    }

    const selected = collections.find((collection) => collection._id === collectionId);
    Alert.alert('Colecoes', `Receita salva em ${selected?.name || 'colecao'}.`);
  }

  async function addToCollection(recipeId: string) {
    if (collections.length === 0) {
      Alert.alert('Colecoes', 'Crie uma colecao na aba Perfil para salvar receitas.');
      return;
    }

    if (collections.length === 1) {
      await saveRecipeIntoCollection(recipeId, collections[0]._id);
      return;
    }

    Alert.alert(
      'Salvar receita',
      'Escolha em qual colecao deseja salvar:',
      [
        ...collections.map((collection) => ({
          text: collection.name,
          onPress: () => {
            setSelectedCollectionId(collection._id);
            void saveRecipeIntoCollection(recipeId, collection._id);
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  async function addRecipeIngredientsToShoppingList(recipeId: string) {
    if (isSendingShoppingByRecipe[recipeId]) {
      return;
    }

    setIsSendingShoppingByRecipe((previous) => ({ ...previous, [recipeId]: true }));
    try {
      const response = await fetch(apiUrl('/shopping-list/from-recipe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });

      if (!response.ok) {
        throw new Error('Falha ao adicionar ingredientes');
      }

      const payload = (await response.json()) as { addedItemsCount?: number };
      const addedItemsCount = Number(payload?.addedItemsCount) || 0;

      DeviceEventEmitter.emit('shopping-list-updated');

      Alert.alert(
        'Sucesso',
        addedItemsCount === 1
          ? '1 item adicionado na lista de compras.'
          : `${addedItemsCount} itens adicionados na lista de compras.`
      );
    } catch {
      Alert.alert('Erro', 'Nao foi possivel adicionar os ingredientes na lista.');
    } finally {
      setIsSendingShoppingByRecipe((previous) => ({ ...previous, [recipeId]: false }));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.backgroundBlobTop} />
      <View style={styles.backgroundBlobBottom} />

      <Animated.View
        style={{
          flex: 1,
          opacity: introOpacity,
          transform: [{ translateY: introTranslateY }],
        }}>
        <FlatList
          data={recipes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <View style={styles.heroCard}>
                <ThemedText type="title" style={styles.heroTitle}>
                  Caderno de Receitas
                </ThemedText>
                <ThemedText style={styles.subtitle}>
                  Crie pratos com foto/video, avalie, salve em colecoes e leve ingredientes para compras.
                </ThemedText>
                <ThemedText style={styles.apiText}>API: {API_BASE_URL}</ThemedText>
              </View>

              <View style={styles.formCard}>
                <ThemedText type="subtitle" style={styles.formTitle}>
                  Nova receita
                </ThemedText>
                <TextInput
                  placeholder="Titulo da receita"
                  placeholderTextColor={KitchenPalette.muted}
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  placeholder="Descricao"
                  placeholderTextColor={KitchenPalette.muted}
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                />
                <View style={styles.row}>
                  <TextInput
                    placeholder="Ingrediente"
                    placeholderTextColor={KitchenPalette.muted}
                    style={[styles.input, styles.flex]}
                    value={ingredientName}
                    onChangeText={setIngredientName}
                  />
                  <Pressable style={styles.secondaryButton} onPress={addIngredient}>
                    <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                      Adicionar
                    </ThemedText>
                  </Pressable>
                </View>

                <View style={styles.row}>
                  <Pressable style={styles.secondaryButton} onPress={pickRecipeImage}>
                    <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                      Foto da receita
                    </ThemedText>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={pickRecipeVideo}>
                    <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                      Video curto
                    </ThemedText>
                  </Pressable>
                </View>

                {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.previewImage} /> : null}
                {videoUrl ? (
                  <RecipeVideoPreview uri={videoUrl} style={styles.previewVideo} />
                ) : null}

                {ingredients.length > 0 && (
                  <View style={styles.tagsWrap}>
                    {ingredients.map((ingredient, index) => (
                      <View key={`${ingredient.name}-${index}`} style={styles.tag}>
                        <ThemedText style={styles.tagText}>{ingredient.name}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable style={styles.primaryButton} onPress={createRecipe} disabled={isSaving}>
                  <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                    {isSaving ? 'Salvando...' : 'Salvar receita'}
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.formCard}>
                <TextInput
                  placeholder="Buscar receita por titulo"
                  placeholderTextColor={KitchenPalette.muted}
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                <View style={styles.tagsWrap}>
                  {collections.map((collection) => (
                    <Pressable
                      key={collection._id}
                      onPress={() => setSelectedCollectionId(collection._id)}
                      style={[
                        styles.collectionChip,
                        selectedCollectionId === collection._id ? styles.collectionChipActive : undefined,
                      ]}>
                      <ThemedText
                        style={
                          selectedCollectionId === collection._id
                            ? styles.collectionChipTextActive
                            : styles.collectionChipText
                        }>
                        {collection.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <ThemedText type="subtitle" style={styles.listTitle}>
                Receitas cadastradas
              </ThemedText>
            </>
          }
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.emptyCard}>
                <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
                  Nenhuma receita ainda
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  Comece criando sua primeira receita para montar as listas automaticamente.
                </ThemedText>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                {item.title}
              </ThemedText>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.recipeImage} /> : null}
              {item.videoUrl ? (
                <RecipeVideoPreview uri={item.videoUrl} style={styles.recipeVideo} />
              ) : null}
              {item.description ? <ThemedText style={styles.cardMeta}>{item.description}</ThemedText> : null}
              <ThemedText style={styles.cardMeta}>{item.ingredients.length} ingrediente(s)</ThemedText>
              <ThemedText style={styles.cardMeta}>
                Avaliacao media: {(item.averageRating || 0).toFixed(1)} ({item.ratingsCount || 0})
              </ThemedText>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((value) => {
                  const selected = (reviewRatings[item._id] || 5) >= value;
                  return (
                    <Pressable
                      key={`${item._id}-star-${value}`}
                      onPress={() => setReviewRatings((prev) => ({ ...prev, [item._id]: value }))}>
                      <ThemedText style={selected ? styles.starActive : styles.starMuted}>★</ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                placeholder="Comentario da avaliacao"
                placeholderTextColor={KitchenPalette.muted}
                style={styles.input}
                value={reviewComments[item._id] || ''}
                onChangeText={(value) => setReviewComments((prev) => ({ ...prev, [item._id]: value }))}
              />

              <View style={styles.row}>
                <Pressable style={styles.secondaryButton} onPress={() => pickReviewPhoto(item._id)}>
                  <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                    Foto da avaliacao
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => submitReview(item._id)}>
                  <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                    Enviar avaliacao
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.row}>
                <Pressable style={styles.cardActionButton} onPress={() => markAsPrepared(item._id)}>
                  <ThemedText type="defaultSemiBold" style={styles.cardActionText}>
                    Marcar preparada
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.cardActionButton} onPress={() => addToCollection(item._id)}>
                  <ThemedText type="defaultSemiBold" style={styles.cardActionText}>
                    Salvar na colecao
                  </ThemedText>
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.cardActionButton,
                  isSendingShoppingByRecipe[item._id] ? styles.cardActionButtonDisabled : undefined,
                ]}
                disabled={!!isSendingShoppingByRecipe[item._id]}
                onPress={() => addRecipeIngredientsToShoppingList(item._id)}>
                <ThemedText type="defaultSemiBold" style={styles.cardActionText}>
                  {isSendingShoppingByRecipe[item._id]
                    ? 'Enviando ingredientes...'
                    : 'Enviar ingredientes para compras'}
                </ThemedText>
              </Pressable>
            </View>
          )}
          ListFooterComponent={isLoading ? <ActivityIndicator size="large" color={KitchenPalette.primary} /> : null}
        />
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KitchenPalette.background,
  },
  backgroundBlobTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: KitchenPalette.blobA,
  },
  backgroundBlobBottom: {
    position: 'absolute',
    bottom: -140,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: KitchenPalette.blobB,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    backgroundColor: KitchenPalette.surface,
    padding: 20,
    gap: 8,
    shadowColor: KitchenPalette.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  heroTitle: {
    color: KitchenPalette.text,
    fontSize: 34,
    lineHeight: 36,
  },
  subtitle: {
    color: KitchenPalette.muted,
    lineHeight: 22,
  },
  apiText: {
    fontSize: 12,
    color: KitchenPalette.muted,
  },
  formTitle: {
    color: KitchenPalette.text,
  },
  formCard: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    backgroundColor: KitchenPalette.surface,
  },
  input: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    color: KitchenPalette.text,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  previewVideo: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButton: {
    backgroundColor: KitchenPalette.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF8F2',
  },
  secondaryButton: {
    backgroundColor: KitchenPalette.surfaceAlt,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: KitchenPalette.text,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 9999,
    backgroundColor: KitchenPalette.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: KitchenPalette.text,
    fontSize: 13,
  },
  collectionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: KitchenPalette.surfaceAlt,
  },
  collectionChipActive: {
    backgroundColor: KitchenPalette.secondary,
    borderColor: KitchenPalette.secondary,
  },
  collectionChipText: {
    color: KitchenPalette.text,
  },
  collectionChipTextActive: {
    color: '#F6F4EE',
  },
  listTitle: {
    marginTop: 6,
    color: KitchenPalette.text,
  },
  list: {
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 10,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 18,
    backgroundColor: KitchenPalette.surface,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    color: KitchenPalette.text,
  },
  emptyText: {
    color: KitchenPalette.muted,
  },
  card: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    backgroundColor: KitchenPalette.surface,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: KitchenPalette.text,
    fontSize: 20,
    lineHeight: 24,
  },
  cardMeta: {
    color: KitchenPalette.muted,
  },
  recipeImage: {
    width: '100%',
    height: 170,
    borderRadius: 14,
  },
  recipeVideo: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  starActive: {
    color: KitchenPalette.accent,
    fontSize: 24,
    lineHeight: 28,
  },
  starMuted: {
    color: KitchenPalette.border,
    fontSize: 24,
    lineHeight: 28,
  },
  cardActionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: KitchenPalette.secondary,
  },
  cardActionButtonDisabled: {
    opacity: 0.7,
  },
  cardActionText: {
    color: '#F6F4EE',
    fontSize: 14,
  },
});
