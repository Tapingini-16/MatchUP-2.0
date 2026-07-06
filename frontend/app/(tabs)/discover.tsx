import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, EmptyState } from "@/src/components/Screen";
import { GroupCard } from "@/src/components/GroupCard";
import { ChipRow, ChipItem } from "@/src/components/ChipRow";
import { api } from "@/src/api/client";
import { colors, spacing, radius, type as t } from "@/src/theme";

const LEVEL_CHIPS: ChipItem[] = [
  { key: "all", label: "Tous" },
  { key: "rookie", label: "Débutant", color: colors.levelRookie },
  { key: "intermediate", label: "Intermédiaire", color: colors.levelIntermediate },
  { key: "advanced", label: "Avancé", color: colors.levelAdvanced },
  { key: "elite", label: "Élite", color: colors.levelElite },
  { key: "mixed", label: "Mixte", color: colors.levelMixed },
];

const SORT_CHIPS: ChipItem[] = [
  { key: "distance", label: "Proche" },
  { key: "members", label: "Populaire" },
  { key: "recent", label: "Récent" },
];

export default function Discover() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("distance");
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listGroups({ q: q || undefined, level, sort });
      setGroups(data);
    } catch (e) {
      console.log("Discover load error", e);
    } finally {
      setLoading(false);
    }
  }, [q, level, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <Screen edges={["top"]} testID="discover-screen">
      {/* Sticky header */}
      <View style={styles.header}>
        <Text style={styles.headline}>Explorer</Text>
        <Text style={styles.sub}>Trouve le groupe qui te correspond</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            testID="discover-search-input"
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher un groupe, une ville..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={12}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ChipRow items={LEVEL_CHIPS} selected={level} onSelect={setLevel} testID="level-chips" />

      <View style={styles.sortRow}>
        <Text style={styles.count}>
          {loading ? "Recherche..." : `${groups.length} groupe${groups.length > 1 ? "s" : ""}`}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {SORT_CHIPS.map((s) => {
            const active = s.key === sort;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                testID={`sort-${s.key}`}
                style={[styles.sortChip, active && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
              >
                <Text
                  style={{
                    fontFamily: "DMSans-Medium",
                    fontSize: 12,
                    color: active ? colors.primary : colors.textSecondary,
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xxxl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.base }} />}
        renderItem={({ item }) => <GroupCard group={item} onPress={() => router.push(`/group/${item.id}`)} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <EmptyState
              title="Aucun résultat"
              subtitle="Essaie d'ajuster tes filtres ou change de niveau"
              icon={<Ionicons name="search" size={40} color={colors.textMuted} />}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: 8 },
  headline: { ...t.h1, color: colors.text },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 14, marginTop: 2, marginBottom: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: "DMSans-Medium",
    fontSize: 15,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  count: { color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 13 },
  sortChip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: { padding: spacing.xxl, alignItems: "center" },
});
