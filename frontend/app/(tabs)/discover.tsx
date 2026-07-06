import React, { useEffect, useState, useCallback } from "react";
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
import { AdvancedFiltersSheet, AdvancedFilters } from "@/src/components/AdvancedFilters";
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

const DEFAULT_FILTERS: AdvancedFilters = { radius_km: 30, day: null, position: null };

export default function Discover() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("distance");
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listGroups({
        q: q || undefined,
        level,
        sort,
        radius_km: advanced.radius_km < 30 ? advanced.radius_km : undefined,
        day: advanced.day || undefined,
        position: advanced.position || undefined,
      });
      setGroups(data);
    } catch (e) {
      console.log("Discover load error", e);
    } finally {
      setLoading(false);
    }
  }, [q, level, sort, advanced]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const activeCount =
    (advanced.radius_km < 30 ? 1 : 0) + (advanced.day ? 1 : 0) + (advanced.position ? 1 : 0);

  return (
    <Screen edges={["top"]} testID="discover-screen">
      {/* Sticky header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headline}>Explorer</Text>
            <Text style={styles.sub}>Trouve le groupe qui te correspond</Text>
          </View>
          <Pressable
            onPress={() => setShowFilters(true)}
            style={styles.filterBtn}
            testID="open-filters-button"
            hitSlop={8}
          >
            <Ionicons name="options" size={20} color={activeCount > 0 ? colors.primary : colors.text} />
            {activeCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

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

      {/* Active filters row */}
      {activeCount > 0 && (
        <View style={styles.activeRow}>
          {advanced.radius_km < 30 && (
            <ActiveFilterPill
              label={`≤ ${advanced.radius_km} km`}
              onClear={() => setAdvanced({ ...advanced, radius_km: 30 })}
            />
          )}
          {advanced.day && (
            <ActiveFilterPill
              label={dayLabel(advanced.day)}
              onClear={() => setAdvanced({ ...advanced, day: null })}
            />
          )}
          {advanced.position && (
            <ActiveFilterPill
              label={`Poste : ${advanced.position}`}
              onClear={() => setAdvanced({ ...advanced, position: null })}
            />
          )}
        </View>
      )}

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

      <AdvancedFiltersSheet
        visible={showFilters}
        value={advanced}
        onChange={setAdvanced}
        onClose={() => setShowFilters(false)}
        onReset={() => setAdvanced(DEFAULT_FILTERS)}
      />
    </Screen>
  );
}

function ActiveFilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable onPress={onClear} style={styles.activePill} testID={`active-${label}`}>
      <Text style={styles.activeText}>{label}</Text>
      <Ionicons name="close" size={14} color={colors.primary} />
    </Pressable>
  );
}

function dayLabel(k: string) {
  const map: Record<string, string> = {
    mon: "Lundi",
    tue: "Mardi",
    wed: "Mercredi",
    thu: "Jeudi",
    fri: "Vendredi",
    sat: "Samedi",
    sun: "Dimanche",
  };
  return map[k] ?? k;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: 8 },
  headline: { ...t.h1, color: colors.text },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 14, marginTop: 2, marginBottom: spacing.md },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  filterBadgeText: { color: colors.textOnPrimary, fontFamily: "DMSans-Bold", fontSize: 10 },
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
  activeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 12,
    paddingRight: 8,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  activeText: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 11 },
  loader: { padding: spacing.xxl, alignItems: "center" },
});
