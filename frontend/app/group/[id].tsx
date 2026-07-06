import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Screen } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { Button } from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, spacing, radius, type as t, levelMeta } from "@/src/theme";

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [g, m, mt] = await Promise.all([
        api.getGroup(id),
        api.groupMembers(id),
        api.listMatches(id),
      ]);
      setGroup(g);
      setMembers(m);
      setMatches(mt);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onJoin = async () => {
    if (!id || !group) return;
    setJoining(true);
    try {
      if (group.is_member) {
        router.push(`/chat/${id}`);
      } else {
        await api.joinGroup(id);
        await load();
      }
    } catch (e: any) {
      console.log("join error", e);
    } finally {
      setJoining(false);
    }
  };

  if (loading || !group) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      </Screen>
    );
  }

  const lvl = levelMeta(group.level);
  const next = matches[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="group-detail-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground
          source={{ uri: group.photo || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200" }}
          style={styles.hero}
        >
          <LinearGradient
            colors={["rgba(9,10,12,0.4)", "rgba(9,10,12,0)", "rgba(9,10,12,0.98)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={12} testID="group-back">
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Pressable style={styles.iconBtn} hitSlop={12} testID="group-share">
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.heroBottom}>
            <View style={[styles.levelPill, { backgroundColor: lvl.color + "22", borderColor: lvl.color }]}>
              <Text style={[styles.levelText, { color: lvl.color }]}>{lvl.label}</Text>
            </View>
            <Text style={styles.title}>{group.name}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="pin" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{group.city}</Text>
              </View>
              <View style={styles.dotSep} />
              <View style={styles.metaItem}>
                <Ionicons name="location" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{group.distance_km.toFixed(1)} km</Text>
              </View>
              <View style={styles.dotSep} />
              <View style={styles.metaItem}>
                <Ionicons name="people" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {group.members_count}/{group.max_members}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.description}>{group.description}</Text>
        </View>

        {/* Next match */}
        {next && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prochain match</Text>
            <View style={styles.matchCard}>
              <View style={styles.matchDate}>
                <Text style={styles.matchDay}>{dayjs(next.date).format("DD")}</Text>
                <Text style={styles.matchMonth}>{dayjs(next.date).format("MMM").toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchTitle}>{next.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Ionicons name="location" size={13} color={colors.textSecondary} />
                  <Text style={styles.matchLoc}>{next.location}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <Ionicons name="time" size={13} color={colors.textSecondary} />
                  <Text style={styles.matchLoc}>{dayjs(next.date).format("HH[h]mm")}</Text>
                </View>
              </View>
              <View style={styles.matchPlayers}>
                <Text style={styles.matchPlayersNum}>{next.players.length}/{next.max_players}</Text>
                <Text style={styles.matchPlayersLbl}>joueurs</Text>
              </View>
            </View>
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres ({members.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.base }}>
            {members.slice(0, 12).map((m) => (
              <View key={m.id} style={styles.memberCard}>
                <Avatar uri={m.photo} name={m.name} size={56} verified={m.verified} />
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.name.split(" ")[0]}
                </Text>
                <Text style={styles.memberRole}>{m.role === "admin" ? "Admin" : m.position || "—"}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Sticky bottom action */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>{group.is_member ? "Tu es membre" : "Places restantes"}</Text>
          <Text style={styles.bottomValue}>
            {group.is_member ? "✓ Accès complet" : `${group.spots_left} places`}
          </Text>
        </View>
        <Button
          label={group.is_member ? "Voir le chat" : "Rejoindre"}
          onPress={onJoin}
          loading={joining}
          size="lg"
          testID="group-join-button"
          icon={
            group.is_member ? (
              <Ionicons name="chatbubbles" size={18} color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="add" size={20} color={colors.textOnPrimary} />
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 340, justifyContent: "space-between", padding: spacing.base, paddingTop: 60 },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(9,10,12,0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroBottom: {},
  levelPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  levelText: { fontFamily: "DMSans-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 34, color: colors.text, letterSpacing: -0.5, marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 13 },
  dotSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  section: { padding: spacing.base },
  sectionTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 20, color: colors.text, marginBottom: spacing.md, letterSpacing: -0.2 },
  description: { fontFamily: "DMSans-Regular", color: colors.text, lineHeight: 22, fontSize: 14 },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.base,
  },
  matchDate: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  matchDay: { fontFamily: "BarlowCondensed-Bold", fontSize: 26, color: colors.primary, lineHeight: 28 },
  matchMonth: { fontFamily: "DMSans-Bold", fontSize: 10, color: colors.primary, letterSpacing: 1 },
  matchTitle: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 15 },
  matchLoc: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12 },
  matchPlayers: { alignItems: "center" },
  matchPlayersNum: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text },
  matchPlayersLbl: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11 },
  memberCard: { alignItems: "center", width: 70, gap: 4 },
  memberName: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 12, marginTop: 4 },
  memberRole: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 10 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  bottomLabel: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  bottomValue: { fontFamily: "BarlowCondensed-Bold", color: colors.text, fontSize: 18, marginTop: 2 },
});
