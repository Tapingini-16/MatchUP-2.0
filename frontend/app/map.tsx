// Map view — Leaflet.js + OpenStreetMap on ALL platforms (free & open-source).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import LeafletMap, { type LeafletMarker } from "@/src/components/LeafletMap";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

const DEFAULT_CENTER = { latitude: 48.8566, longitude: 2.3522 }; // Paris

export default function MapScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.listGroups({ sort: "distance" });
      setGroups(Array.isArray(d) ? d : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const geoGroups = useMemo(
    () =>
      groups.filter(
        (g) => typeof g.field_lat === "number" && typeof g.field_lng === "number",
      ),
    [groups],
  );

  const center = useMemo(() => {
    if (geoGroups.length === 0) return DEFAULT_CENTER;
    const lat = geoGroups.reduce((s, p) => s + p.field_lat, 0) / geoGroups.length;
    const lng = geoGroups.reduce((s, p) => s + p.field_lng, 0) / geoGroups.length;
    return { latitude: lat, longitude: lng };
  }, [geoGroups]);

  const markers: LeafletMarker[] = useMemo(
    () =>
      geoGroups.map((g) => ({
        id: g.id,
        lat: g.field_lat,
        lng: g.field_lng,
        title: g.name,
      })),
    [geoGroups],
  );

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
        <LeafletMap
          latitude={center.latitude}
          longitude={center.longitude}
          zoom={11}
          markers={markers}
          interactive
          showSelectedMarker={false}
          draggableMarker={false}
          height={320}
          onMarkerPress={(id) => router.push(`/group/${id}`)}
        />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {groups.length} groupe{groups.length > 1 ? "s" : ""} à proximité
        </Text>
        <View style={styles.attributionRow}>
          <Ionicons name="leaf" size={11} color={colors.textMuted} />
          <Text style={styles.attributionText}>Leaflet · © OpenStreetMap</Text>
        </View>
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
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  listHeader: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  listTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 18, color: colors.text },
  attributionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  attributionText: { fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 10 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  listPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  listName: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 14 },
  listMeta: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
