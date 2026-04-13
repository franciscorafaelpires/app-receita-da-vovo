import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiUrl } from '@/constants/api';
import { KitchenPalette } from '@/constants/ui-theme';

type Recipe = {
  _id: string;
  title: string;
};

type PlanItem = {
  day: string;
  recipeId: string | null;
  recipeTitle: string;
};

type MealPlan = {
  name: string;
  items: PlanItem[];
};

const DAYS_LABEL: Record<string, string> = {
  segunda: 'Segunda',
  terca: 'Terca',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sabado',
  domingo: 'Domingo',
};

export default function PlanningScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(16)).current;

  const sortedItems = useMemo(() => {
    return plan?.items ?? [];
  }, [plan]);

  async function loadData() {
    try {
      setLoading(true);
      const [recipesRes, planRes] = await Promise.all([
        fetch(apiUrl('/recipes')),
        fetch(apiUrl('/meal-plan')),
      ]);

      if (!recipesRes.ok || !planRes.ok) {
        throw new Error('Falha ao carregar dados');
      }

      const recipesData = await recipesRes.json();
      const planData = await planRes.json();

      setRecipes(Array.isArray(recipesData) ? recipesData : []);
      setPlan(planData);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar o planejamento semanal.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 440,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introTranslateY, {
        toValue: 0,
        duration: 440,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [introOpacity, introTranslateY]);

  async function assignRecipeToDay(day: string, recipeId: string | null) {
    try {
      setSavingDay(day);
      const response = await fetch(apiUrl('/meal-plan/day'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, recipeId }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar dia');
      }

      const updatedPlan = await response.json();
      setPlan(updatedPlan);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel atualizar o planejamento.');
    } finally {
      setSavingDay(null);
    }
  }

  async function generateShoppingListFromPlan() {
    try {
      const response = await fetch(apiUrl('/shopping-list/from-meal-plan'), {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar lista');
      }

      Alert.alert('Sucesso', 'Lista de compras gerada com base no planejamento.');
    } catch {
      Alert.alert('Erro', 'Nao foi possivel gerar lista de compras a partir do planejamento.');
    }
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
      <View style={styles.backgroundBlobTop} />
      <View style={styles.backgroundBlobBottom} />

      <Animated.View
        style={{
          flex: 1,
          opacity: introOpacity,
          transform: [{ translateY: introTranslateY }],
        }}>
        <View style={styles.headerCard}>
          <ThemedText type="title" style={styles.title}>
            Planejamento
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Monte sua semana e gere a lista de compras completa com um toque.
          </ThemedText>
          <Pressable style={styles.generateButton} onPress={generateShoppingListFromPlan}>
            <ThemedText type="defaultSemiBold" style={styles.generateButtonText}>
              Gerar lista de compras da semana
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {sortedItems.map((item) => (
            <View key={item.day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <ThemedText type="subtitle" style={styles.dayTitle}>
                  {DAYS_LABEL[item.day] ?? item.day}
                </ThemedText>
                <ThemedText style={styles.dayRecipeTitle}>
                  {item.recipeTitle || 'Sem receita definida'}
                </ThemedText>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.clearButton}
                  disabled={savingDay === item.day}
                  onPress={() => assignRecipeToDay(item.day, null)}>
                  <ThemedText type="defaultSemiBold" style={styles.clearButtonText}>
                    Limpar dia
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.recipeListWrap}>
                {recipes.length === 0 ? (
                  <ThemedText style={styles.emptyRecipesText}>Nenhuma receita cadastrada.</ThemedText>
                ) : (
                  recipes.map((recipe) => (
                    <Pressable
                      key={recipe._id}
                      style={[
                        styles.recipeButton,
                        item.recipeId === recipe._id ? styles.recipeButtonSelected : undefined,
                      ]}
                      disabled={savingDay === item.day}
                      onPress={() => assignRecipeToDay(item.day, recipe._id)}>
                      <ThemedText
                        style={
                          item.recipeId === recipe._id
                            ? styles.recipeButtonSelectedText
                            : styles.recipeButtonText
                        }>
                        {recipe.title}
                      </ThemedText>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenPalette.background,
  },
  container: {
    flex: 1,
    backgroundColor: KitchenPalette.background,
  },
  backgroundBlobTop: {
    position: 'absolute',
    top: -120,
    left: -70,
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: KitchenPalette.blobA,
  },
  backgroundBlobBottom: {
    position: 'absolute',
    bottom: -140,
    right: -90,
    width: 290,
    height: 290,
    borderRadius: 999,
    backgroundColor: KitchenPalette.blobB,
  },
  headerCard: {
    marginTop: 64,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    backgroundColor: KitchenPalette.surface,
    padding: 16,
    gap: 10,
  },
  title: {
    color: KitchenPalette.text,
    fontSize: 34,
    lineHeight: 36,
  },
  subtitle: {
    color: KitchenPalette.muted,
    lineHeight: 22,
  },
  generateButton: {
    backgroundColor: KitchenPalette.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFF8F2',
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 10,
  },
  dayCard: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 18,
    backgroundColor: KitchenPalette.surface,
    padding: 14,
    gap: 8,
  },
  dayHeader: {
    gap: 4,
  },
  dayTitle: {
    color: KitchenPalette.text,
  },
  dayRecipeTitle: {
    color: KitchenPalette.muted,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  clearButton: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 12,
    backgroundColor: KitchenPalette.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: KitchenPalette.text,
  },
  recipeListWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emptyRecipesText: {
    color: KitchenPalette.muted,
  },
  recipeButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: KitchenPalette.surfaceAlt,
  },
  recipeButtonSelected: {
    backgroundColor: KitchenPalette.secondary,
  },
  recipeButtonText: {
    color: KitchenPalette.text,
    fontSize: 14,
  },
  recipeButtonSelectedText: {
    color: '#EFF5EA',
    fontSize: 14,
  },
});
