import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, EmptyState } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

export default function BlockedScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.listBlocks();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unblock = async (b: any) => {
    await api.unblock(b.target_type, b.target_id);
    setItems((prev) => prev.filter((it) => !(it.target_type === b.target_type && it.target_id === b.target_id)));
  };

  return (
    <Screen testID="blocked-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Bloqués</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(b) => `${b.target_type}-${b.target_id}`}
        contentContainerStyle={{ padding: spacing.base }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.row} testID={`blocked-${item.target_id}`}>
            {item.target_type === "user" ? (
              <Avatar uri={item.target?.photo} name={item.target?.name} size={44} />
            ) : (
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={20} color={colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.target?.name ?? "Inconnu"}</Text>
              <Text style={styles.type}>{item.target_type === "user" ? "Joueur" : "Groupe" + (item.target?.city ? ` · ${item.target.city}` : "")}</Text>
            </View>
            <Pressable style={styles.unblockBtn} onPress={() => unblock(item)} testID={`unblock-${item.target_id}`}>
              <Text style={styles.unblockText}>Débloquer</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <EmptyState
              title="Aucun bloqué"
              subtitle="Utilise l&apos;icône · · · sur un groupe ou tape long sur un message pour bloquer."
              icon={<Ionicons name="shield-checkmark-outline" size={48} color={colors.textMuted} />}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 20, color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 14 },
  type: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  unblockText: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 12 },
});
