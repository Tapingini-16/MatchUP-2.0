import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, type as t, levelMeta } from "@/src/theme";
import dayjs from "dayjs";

type Group = {
  id: string;
  name: string;
  photo?: string | null;
  city: string;
  level: string;
  members_count: number;
  max_members: number;
  distance_km: number;
  spots_left: number;
  next_match?: { date?: string; title?: string; location?: string } | null;
  is_member: boolean;
};

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const lvl = levelMeta(group.level);
  const nextDate = group.next_match?.date ? dayjs(group.next_match.date) : null;

  return (
    <Pressable
      testID={`group-card-${group.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.imageWrap}>
        {group.photo ? (
          <Image source={{ uri: group.photo }} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="football" size={64} color={colors.borderStrong} />
          </View>
        )}
        <LinearGradient
          colors={["rgba(9,10,12,0)", "rgba(9,10,12,0.75)", "rgba(9,10,12,0.95)"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Distance pill */}
        <View style={styles.distancePill}>
          <Ionicons name="location" size={12} color={colors.primary} />
          <Text style={styles.distanceText}>{group.distance_km.toFixed(1)} km</Text>
        </View>
        {/* Level pill */}
        <View style={[styles.levelPill, { backgroundColor: lvl.color + "22", borderColor: lvl.color }]}>
          <Text style={[styles.levelText, { color: lvl.color }]}>{lvl.label}</Text>
        </View>

        {/* Bottom content */}
        <View style={styles.bottomContent}>
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="people" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {group.members_count}/{group.max_members}
              </Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons name="pin" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{group.city}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={styles.footer}>
        {nextDate ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.footerLabel}>PROCHAIN MATCH</Text>
            <Text style={styles.footerValue} numberOfLines={1}>
              {nextDate.format("ddd DD MMM · HH[h]mm")}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.footerLabel}>ÉTAT</Text>
            <Text style={styles.footerValue}>Aucun match programmé</Text>
          </View>
        )}
        <View style={styles.spotsBadge}>
          <Text style={styles.spotsNumber}>{group.spots_left}</Text>
          <Text style={styles.spotsLabel}>places</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: { height: 200, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageFallback: {
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  distancePill: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(9,10,12,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceText: { color: colors.text, fontFamily: "DMSans-Medium", fontSize: 12 },
  levelPill: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  levelText: { fontFamily: "DMSans-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  bottomContent: {
    position: "absolute",
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.md,
  },
  name: { ...t.h2, color: colors.text, marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 13 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  footerLabel: { ...t.overline, color: colors.textMuted, marginBottom: 2 },
  footerValue: { fontFamily: "DMSans-Medium", color: colors.text, fontSize: 14 },
  spotsBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  spotsNumber: { fontFamily: "BarlowCondensed-Bold", color: colors.primary, fontSize: 20, lineHeight: 22 },
  spotsLabel: { fontFamily: "DMSans-Medium", color: colors.primary, fontSize: 10, letterSpacing: 0.4 },
});
