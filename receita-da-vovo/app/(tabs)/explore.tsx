import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiUrl } from '@/constants/api';
import { KitchenPalette } from '@/constants/ui-theme';

type ShoppingItem = {
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
};

type ShoppingList = {
  name: string;
  items: ShoppingItem[];
};

function itemKey(item: Pick<ShoppingItem, 'name' | 'unit'>) {
  return `${item.name.trim().toLowerCase()}::${(item.unit || 'un').trim().toLowerCase()}`;
}

export default function ShoppingListScreen() {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [updatingItems, setUpdatingItems] = useState(false);
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(16)).current;

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl('/shopping-list'));

      if (!response.ok) {
        throw new Error('Falha ao carregar lista');
      }

      const data = (await response.json()) as ShoppingList;
      setList(data);
      setSelectedKeys((previous) => {
        const availableKeys = new Set((data?.items || []).map((item) => itemKey(item)));
        return previous.filter((key) => availableKeys.has(key));
      });
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar lista de compras. Confira a URL da API.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function setSelectedItemsChecked(checked: boolean) {
    if (selectedKeys.length === 0) return;

    setUpdatingItems(true);
    try {
      const refs = (list?.items || [])
        .filter((item) => selectedKeys.includes(itemKey(item)))
        .map((item) => ({ name: item.name, unit: item.unit }));

      const response = await fetch(apiUrl('/shopping-list/items/checked'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: refs, checked }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Falha ao atualizar itens (${response.status})`);
      }

      setSelectedKeys([]);
      await loadList();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Nao foi possivel atualizar os itens selecionados.');
    } finally {
      setUpdatingItems(false);
    }
  }

  async function deleteItemsByKeys(keys: string[]) {
    if (keys.length === 0) return;

    setUpdatingItems(true);
    try {
      const refs = (list?.items || [])
        .filter((item) => keys.includes(itemKey(item)))
        .map((item) => ({ name: item.name, unit: item.unit }));

      const response = await fetch(apiUrl('/shopping-list/items'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: refs }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Falha ao excluir itens (${response.status})`);
      }

      setSelectedKeys((previous) => previous.filter((key) => !keys.includes(key)));
      await loadList();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Nao foi possivel excluir item da lista.');
    } finally {
      setUpdatingItems(false);
    }
  }

  function toggleItemSelection(item: ShoppingItem) {
    const key = itemKey(item);
    setSelectedKeys((previous) =>
      previous.includes(key) ? previous.filter((current) => current !== key) : [...previous, key]
    );
  }

  function onItemLongPress(item: ShoppingItem) {
    const pressedItemKey = itemKey(item);

    Alert.alert('Excluir item', `Deseja excluir "${item.name}" da lista de compras?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void deleteItemsByKeys([pressedItemKey]);
        },
      },
    ]);
  }

  const selectedItems = (list?.items || []).filter((item) => selectedKeys.includes(itemKey(item)));
  const allSelectedChecked = selectedItems.length > 0 && selectedItems.every((item) => item.checked);

  useFocusEffect(
    useCallback(() => {
      void loadList();
    }, [loadList])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('shopping-list-updated', () => {
      void loadList();
    });

    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(introTranslateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      subscription.remove();
    };
  }, [introOpacity, introTranslateY, loadList]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.backgroundBlobTop} />

      <Animated.View
        style={{
          flex: 1,
          opacity: introOpacity,
          transform: [{ translateY: introTranslateY }],
        }}>
        <FlatList
          data={list?.items ?? []}
          keyExtractor={(item, index) => `${itemKey(item)}-${index}`}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <View style={styles.headerRow}>
                <View style={styles.heroCopy}>
                  <ThemedText type="title" style={styles.title}>
                    Lista de Compras
                  </ThemedText>
                  <ThemedText style={styles.subtitle}>
                    Toque para selecionar um ou varios itens, depois marque como comprado ou desmarque.
                  </ThemedText>
                  <ThemedText style={styles.subtitle}>
                    Segure um item para abrir a confirmacao de exclusao.
                  </ThemedText>
                </View>
                <Pressable style={styles.refreshButton} onPress={loadList}>
                  <ThemedText type="defaultSemiBold" style={styles.refreshText}>
                    Atualizar
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.summaryCard}>
                <ThemedText style={styles.summaryLabel}>Itens totais</ThemedText>
                <ThemedText type="title" style={styles.summaryNumber}>
                  {list?.items.length ?? 0}
                </ThemedText>
              </View>

              {selectedKeys.length > 0 ? (
                <View style={styles.actionsCard}>
                  <ThemedText style={styles.summaryLabel}>{selectedKeys.length} item(ns) selecionado(s)</ThemedText>
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.actionButton, updatingItems ? styles.actionButtonDisabled : undefined]}
                      disabled={updatingItems}
                      onPress={() => void setSelectedItemsChecked(!allSelectedChecked)}>
                      <ThemedText type="defaultSemiBold" style={styles.actionButtonText}>
                        {allSelectedChecked ? 'Desmarcar selecionados' : 'Marcar como comprados'}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[styles.actionButtonDanger, updatingItems ? styles.actionButtonDisabled : undefined]}
                      disabled={updatingItems}
                      onPress={() =>
                        Alert.alert('Excluir selecionados', 'Deseja excluir os itens selecionados?', [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Excluir',
                            style: 'destructive',
                            onPress: () => {
                              void deleteItemsByKeys(selectedKeys);
                            },
                          },
                        ])
                      }>
                      <ThemedText type="defaultSemiBold" style={styles.actionButtonDangerText}>
                        Excluir selecionados
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyCard}>
                <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
                  A lista ainda esta vazia
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  Adicione ingredientes nas receitas ou gere a lista pelo planejamento.
                </ThemedText>
              </View>
            )
          }
          renderItem={({ item }) => {
            const isSelected = selectedKeys.includes(itemKey(item));

            return (
              <Pressable
                style={[styles.itemCard, isSelected ? styles.itemCardSelected : undefined]}
                onPress={() => toggleItemSelection(item)}
                onLongPress={() => onItemLongPress(item)}>
                <View
                  style={[
                    styles.itemDot,
                    item.checked ? styles.itemDotChecked : undefined,
                    isSelected ? styles.itemDotSelected : undefined,
                  ]}
                />
                <View style={styles.itemTextWrap}>
                  <ThemedText type="defaultSemiBold" style={[styles.itemName, item.checked ? styles.itemNameChecked : undefined]}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={styles.itemMeta}>
                    {item.quantity} {item.unit}
                  </ThemedText>
                  {item.checked ? <ThemedText style={styles.checkedBadge}>Comprado</ThemedText> : null}
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={loading ? <ActivityIndicator size="large" color={KitchenPalette.primary} /> : null}
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
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: KitchenPalette.blobB,
    top: -130,
    right: -90,
  },
  headerRow: {
    gap: 12,
  },
  heroCopy: {
    gap: 6,
  },
  title: {
    color: KitchenPalette.text,
    fontSize: 34,
    lineHeight: 36,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: KitchenPalette.surface,
    alignSelf: 'flex-start',
  },
  refreshText: {
    color: KitchenPalette.text,
  },
  subtitle: {
    color: KitchenPalette.muted,
    lineHeight: 22,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    backgroundColor: KitchenPalette.surface,
    padding: 16,
    gap: 4,
  },
  summaryLabel: {
    color: KitchenPalette.muted,
  },
  summaryNumber: {
    color: KitchenPalette.primary,
  },
  actionsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    backgroundColor: KitchenPalette.surface,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: KitchenPalette.secondary,
  },
  actionButtonText: {
    color: '#F6F4EE',
  },
  actionButtonDanger: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: KitchenPalette.primary,
  },
  actionButtonDangerText: {
    color: '#FFF8F2',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  list: {
    paddingTop: 64,
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 120,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: KitchenPalette.border,
    borderRadius: 16,
    backgroundColor: KitchenPalette.surface,
    padding: 14,
  },
  itemCardSelected: {
    borderColor: KitchenPalette.secondary,
    backgroundColor: '#F7FBEF',
  },
  itemDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: KitchenPalette.accent,
    borderWidth: 2,
    borderColor: '#F9E8C7',
  },
  itemDotChecked: {
    backgroundColor: KitchenPalette.secondary,
    borderColor: '#DAE5CF',
  },
  itemDotSelected: {
    borderColor: KitchenPalette.secondary,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    color: KitchenPalette.text,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: KitchenPalette.muted,
  },
  itemMeta: {
    color: KitchenPalette.muted,
  },
  checkedBadge: {
    marginTop: 4,
    color: KitchenPalette.secondary,
    fontSize: 12,
  },
});
