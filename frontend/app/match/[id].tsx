import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";
import { Screen } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth";
import { api } from "@/src/api/client";
import { colors, spacing, radius, type as t } from "@/src/theme";

type RsvpStatus = "going" | "maybe" | "decline";

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedForAssign, setSelectedForAssign] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const m = await api.getMatch(id);
      setMatch(m);
      const g = await api.getGroup(m.group_id);
      setGroup(g);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !match || !group) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      </Screen>
    );
  }

  const isAdmin = group.is_admin;
  const isMember = group.is_member;
  const myStatus: RsvpStatus | null = match.rsvps?.[user?.id ?? ""] ?? null;
  const going: string[] = Object.entries(match.rsvps || {})
    .filter(([, v]) => v === "going")
    .map(([k]) => k);
  const maybe: string[] = Object.entries(match.rsvps || {})
    .filter(([, v]) => v === "maybe")
    .map(([k]) => k);
  const teamA: string[] = match.teams?.a ?? [];
  const teamB: string[] = match.teams?.b ?? [];
  const bench: string[] = match.teams?.bench ?? [];
  const assignedIds = new Set([...teamA, ...teamB, ...bench]);
  const unassigned = going.filter((uid) => !assignedIds.has(uid));

  const rsvp = async (s: RsvpStatus) => {
    setBusy(true);
    try {
      await api.rsvp(match.id, s);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const assign = async (uid: string, team: "a" | "b" | "bench" | "none") => {
    await api.assignTeam(match.id, uid, team);
    setSelectedForAssign(null);
    await load();
  };

  const renderPlayer = (uid: string, opts?: { picker?: boolean }) => {
    const u = match.users?.[uid];
    if (!u) return null;
    const active = selectedForAssign === uid;
    return (
      <Pressable
        key={uid}
        onPress={() => {
          if (isAdmin && !opts?.picker) {
            setSelectedForAssign(active ? null : uid);
          }
        }}
        style={[styles.playerChip, active && { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}
        testID={`player-${uid}`}
      >
        <Avatar uri={u.photo} name={u.name} size={32} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.playerName} numberOfLines={1}>
            {u.name.split(" ")[0]}
          </Text>
          <Text style={styles.playerPos}>{u.position || "—"}</Text>
        </View>
        {active && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="match-detail-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient colors={[colors.primaryDim, colors.bg]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: spacing.base, paddingTop: 20 }}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{dayjs(match.date).format("DD")}</Text>
              <Text style={styles.dateMonth}>{dayjs(match.date).format("MMMM").toUpperCase()}</Text>
              <Text style={styles.dateTime}>{dayjs(match.date).format("dddd · HH[h]mm")}</Text>
            </View>
            <Text style={styles.title}>{match.title}</Text>
            <Pressable onPress={() => router.push(`/group/${group.id}` as any)}>
              <Text style={styles.groupLink}>{group.name}</Text>
            </Pressable>
            <View style={styles.locRow}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={styles.locText}>{match.location}</Text>
            </View>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{going.length}</Text>
            <Text style={styles.statLbl}>Présents</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.accent }]}>{maybe.length}</Text>
            <Text style={styles.statLbl}>Peut-être</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{match.max_players - going.length}</Text>
            <Text style={styles.statLbl}>Places</Text>
          </View>
        </View>

        {/* RSVP */}
        {isMember && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ta réponse</Text>
            <View style={styles.rsvpRow}>
              {[
                { key: "going", label: "J'y suis", icon: "checkmark-circle" as any, color: colors.primary },
                { key: "maybe", label: "Peut-être", icon: "help-circle" as any, color: colors.accent },
                { key: "decline", label: "Non", icon: "close-circle" as any, color: colors.danger },
              ].map((r) => {
                const active = myStatus === r.key;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => rsvp(r.key as RsvpStatus)}
                    disabled={busy}
                    style={[
                      styles.rsvpBtn,
                      active && { backgroundColor: r.color + "22", borderColor: r.color },
                    ]}
                    testID={`rsvp-${r.key}`}
                  >
                    <Ionicons name={r.icon} size={20} color={active ? r.color : colors.textSecondary} />
                    <Text style={[styles.rsvpText, active && { color: r.color }]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Teams composition */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.sectionTitle}>Composition</Text>
            {isAdmin && (
              <Text style={styles.hintText}>
                {selectedForAssign ? "Choisis une équipe →" : "Touche un joueur pour l'affecter"}
              </Text>
            )}
          </View>

          {/* Team A */}
          <TeamZone
            label="Équipe A"
            color={colors.primary}
            players={teamA.map((uid) => renderPlayer(uid))}
            canDrop={!!selectedForAssign}
            onDrop={selectedForAssign ? () => assign(selectedForAssign, "a") : undefined}
          />
          {/* Team B */}
          <TeamZone
            label="Équipe B"
            color={colors.info}
            players={teamB.map((uid) => renderPlayer(uid))}
            canDrop={!!selectedForAssign}
            onDrop={selectedForAssign ? () => assign(selectedForAssign, "b") : undefined}
          />
          {/* Bench */}
          <TeamZone
            label="Banc"
            color={colors.textSecondary}
            players={bench.map((uid) => renderPlayer(uid))}
            canDrop={!!selectedForAssign}
            onDrop={selectedForAssign ? () => assign(selectedForAssign, "bench") : undefined}
          />

          {/* Unassigned pool */}
          {unassigned.length > 0 && (
            <View style={styles.poolWrap}>
              <Text style={styles.poolLabel}>NON AFFECTÉS ({unassigned.length})</Text>
              <View style={styles.poolGrid}>{unassigned.map((uid) => renderPlayer(uid))}</View>
              {isAdmin && selectedForAssign && (
                <Button
                  label="Retirer de toutes les équipes"
                  variant="ghost"
                  onPress={() => assign(selectedForAssign, "none")}
                  style={{ marginTop: 8 } as any}
                />
              )}
            </View>
          )}

          {going.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="football" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>Personne n&apos;a encore confirmé sa présence</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TeamZone({
  label,
  color,
  players,
  canDrop,
  onDrop,
}: {
  label: string;
  color: string;
  players: React.ReactNode[];
  canDrop: boolean;
  onDrop?: () => void;
}) {
  return (
    <View style={[styles.teamZone, { borderColor: color + "44" }]}>
      <View style={styles.teamHeader}>
        <View style={[styles.teamDot, { backgroundColor: color }]} />
        <Text style={[styles.teamLabel, { color }]}>{label}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.teamCount}>{players.length}</Text>
        {canDrop && onDrop && (
          <Pressable onPress={onDrop} style={[styles.dropBtn, { borderColor: color }]} testID={`drop-${label}`}>
            <Ionicons name="arrow-down-circle" size={20} color={color} />
            <Text style={[styles.dropText, { color }]}>Ici</Text>
          </Pressable>
        )}
      </View>
      {players.length === 0 ? (
        <Text style={styles.teamEmpty}>Vide</Text>
      ) : (
        <View style={styles.teamGrid}>{players}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 240, paddingTop: 50, paddingBottom: 20, overflow: "hidden" },
  heroTop: { paddingHorizontal: spacing.base, flexDirection: "row" },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElevated,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  dateBox: { marginBottom: 12 },
  dateDay: { fontFamily: "BarlowCondensed-Bold", fontSize: 64, color: colors.primary, lineHeight: 60, letterSpacing: -2 },
  dateMonth: { fontFamily: "DMSans-Bold", fontSize: 13, color: colors.primary, letterSpacing: 3, marginTop: -4 },
  dateTime: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 30, color: colors.text, letterSpacing: -0.4, marginTop: 6 },
  groupLink: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 13, marginTop: 4 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  locText: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 14 },
  statsBar: {
    flexDirection: "row", alignItems: "center", padding: spacing.base,
    marginHorizontal: spacing.base, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginTop: -8,
  },
  statBox: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 32, backgroundColor: colors.border },
  statNum: { fontFamily: "BarlowCondensed-Bold", color: colors.primary, fontSize: 26 },
  statLbl: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  section: { padding: spacing.base },
  sectionTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 20, color: colors.text, marginBottom: spacing.md, letterSpacing: -0.2 },
  hintText: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 11 },
  rsvpRow: { flexDirection: "row", gap: 8 },
  rsvpBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rsvpText: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 13 },
  teamZone: {
    marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, backgroundColor: colors.surface,
  },
  teamHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  teamLabel: { fontFamily: "DMSans-Bold", fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase" },
  teamCount: { fontFamily: "BarlowCondensed-Bold", color: colors.text, fontSize: 18 },
  dropBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1,
  },
  dropText: { fontFamily: "DMSans-Bold", fontSize: 11 },
  teamEmpty: { fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 12, paddingVertical: 8 },
  teamGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  playerChip: {
    flexDirection: "row", alignItems: "center", padding: 6, paddingRight: 12,
    backgroundColor: colors.bg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    minWidth: "48%",
  },
  playerName: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 13 },
  playerPos: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 10 },
  poolWrap: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryDim },
  poolLabel: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  poolGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emptyBox: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13, textAlign: "center" },
});
