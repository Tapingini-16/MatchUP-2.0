// Map view — real react-native-maps on iOS/Android, stylized mock on Web.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/Screen";
import NativeMap from "@/src/components/NativeMap";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.listGroups({ sort: "distance" });
      setGroups(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const region = useMemo(() => {
    const pts = groups
      .map((g) => ({ lat: g.field_lat, lng: g.field_lng }))
      .filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
    if (pts.length === 0) return DEFAULT_REGION;
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.12, longitudeDelta: 0.12 };
  }, [groups]);

  const geoGroups = groups.filter((g) => typeof g.field_lat === "number" && typeof g.field_lng === "number");

  return (
    <Screen edges={["top"]} testID="map-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Carte des groupes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapWrap}>
        {Platform.OS !== "web" ? (
          <NativeMap
            region={region}
            groups={geoGroups}
            onSelect={(id) => router.push(`/group/${id}`)}
          />
        ) : (
          <>
            <LinearGradient colors={["#0D2A18", "#062010", "#040A08"]} style={StyleSheet.absoluteFillObject} />
            <View style={styles.centerCircle} />
            <View style={styles.centerLine} />
            {[1, 2, 3, 4].map((r) => (
              <View key={`h${r}`} style={[styles.gridLine, { top: `${r * 20}%` }]} />
            ))}
            {[1, 2, 3, 4].map((c) => (
              <View key={`v${c}`} style={[styles.gridLineV, { left: `${c * 20}%` }]} />
            ))}
            {groups.slice(0, 8).map((g, i) => {
              const x = 15 + ((i * 37) % 70);
              const y = 15 + ((i * 53) % 65);
              return (
                <Pressable
                  key={g.id}
                  style={[styles.pin, { left: `${x}%`, top: `${y}%` }]}
                  onPress={() => router.push(`/group/${g.id}`)}
                  testID={`map-pin-${g.id}`}
                >
                  <View style={styles.pinDot} />
                  <View style={styles.pinLabel}>
                    <Text style={styles.pinName} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.pinDist}>{g.distance_km?.toFixed?.(1) ?? "?"} km</Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.mapBadge}>
              <Ionicons name="information-circle" size={13} color={colors.textSecondary} />
              <Text style={styles.mapBadgeText}>Vue simplifiée sur web · Carte native sur mobile</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {groups.length} groupe{groups.length > 1 ? "s" : ""} à proximité
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 8, paddingBottom: 40 }}>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => router.push(`/group/${g.id}`)}
              style={styles.listItem}
              testID={`map-list-${g.id}`}
            >
              <View style={styles.listPin}>
                <Ionicons name="location" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listName}>{g.name}</Text>
                <Text style={styles.listMeta} numberOfLines={1}>
                  {g.field_location || g.city} · {g.distance_km?.toFixed?.(1) ?? "?"} km
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  mapWrap: {
    height: 320,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    backgroundColor: colors.surface,
  },
  centerCircle: {
    position: "absolute", top: "50%", left: "50%", width: 80, height: 80, marginLeft: -40, marginTop: -40,
    borderRadius: 40, borderWidth: 1, borderColor: "rgba(30,215,96,0.25)",
  },
  centerLine: { position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "rgba(30,215,96,0.15)" },
  gridLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.06)" },
  gridLineV: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.06)" },
  pin: { position: "absolute", alignItems: "center" },
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.bg },
  pinLabel: {
    marginTop: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
    backgroundColor: "rgba(9,10,12,0.9)", borderWidth: 1, borderColor: colors.border, maxWidth: 110,
  },
  pinName: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 10 },
  pinDist: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 9 },
  mapBadge: {
    position: "absolute", bottom: 8, left: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: "rgba(9,10,12,0.8)", borderWidth: 1, borderColor: colors.border,
  },
  mapBadgeText: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 10, flex: 1 },
  listHeader: { paddingHorizontal: spacing.base, paddingTop: spacing.lg },
  listTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 18, color: colors.text },
  listItem: {
    flexDirection: "row", alignItems: "center", padding: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  listPin: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  listName: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 14 },
  listMeta: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
