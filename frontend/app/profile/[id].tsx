// Public profile screen — reused for viewing another player.
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { Button } from "@/src/components/Button";
import { ReportModal } from "@/src/components/ReportModal";
import { useAuth } from "@/src/context/auth";
import { api } from "@/src/api/client";
import { colors, spacing, radius, type as t, levelMeta, positionMeta } from "@/src/theme";

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useAuth();
  const [player, setPlayer] = useState<any>(null);
  const [friend, setFriend] = useState<string>("none");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, fs] = await Promise.all([api.getUser(id), api.friendStatus(id)]);
      setPlayer(p);
      setFriend(fs.status);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !player) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      </Screen>
    );
  }

  const isMe = me?.id === player.id;
  const lvl = levelMeta(player.level);
  const pos = positionMeta(player.position);

  const onFriend = async () => {
    if (!id) return;
    setBusy(true);
    try {
      if (friend === "none") {
        await api.friendRequest(id);
        setFriend("outgoing");
      } else if (friend === "incoming") {
        await api.friendAccept(id);
        setFriend("friends");
      } else if (friend === "friends") {
        await api.friendRemove(id);
        setFriend("none");
      } else if (friend === "outgoing") {
        // Cancel outgoing
        await api.friendRemove(id);
        setFriend("none");
      }
    } finally {
      setBusy(false);
    }
  };

  const friendLabel =
    friend === "friends"
      ? "Amis"
      : friend === "outgoing"
        ? "Demande envoyée"
        : friend === "incoming"
          ? "Accepter la demande"
          : "Ajouter en ami";
  const friendIcon =
    friend === "friends" ? "checkmark" : friend === "incoming" ? "person-add" : friend === "outgoing" ? "hourglass" : "person-add";

  return (
    <Screen edges={["top"]} testID="public-profile-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.bannerWrap}>
          <LinearGradient
            colors={[colors.primaryDim, colors.bg]}
            style={styles.banner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.topActions}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            {!isMe && (
              <Pressable onPress={() => setShowReport(true)} style={styles.iconBtn} hitSlop={12} testID="profile-report-button">
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
              </Pressable>
            )}
          </View>
          <View style={styles.avatarWrap}>
            <Avatar uri={player.photo} name={player.name} size={100} verified={player.verified} />
            <Text style={styles.name}>{player.name}</Text>
            {player.city && <Text style={styles.city}>📍 {player.city}</Text>}
          </View>
        </View>

        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: lvl.color + "22", borderColor: lvl.color }]}>
            <Text style={[styles.tagText, { color: lvl.color }]}>{lvl.label}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.tagText}>{pos.label}</Text>
          </View>
        </View>

        {player.bio ? (
          <View style={styles.bio}>
            <Text style={styles.bioText}>{player.bio}</Text>
          </View>
        ) : null}

        <View style={styles.stats}>
          <StatBox label="Matchs" value={player.matches_played} />
          <StatBox label="Buts" value={player.goals} />
          <StatBox label="Passes déc." value={player.assists} />
        </View>
        <View style={styles.rep}>
          <View style={{ flex: 1 }}>
            <Text style={styles.repLbl}>Réputation</Text>
            <Text style={styles.repVal}>{player.reputation}</Text>
          </View>
          <View style={styles.repBar}>
            <View style={[styles.repFill, { width: `${Math.min(100, player.reputation / 15)}%` }]} />
          </View>
        </View>

        {!isMe && (
          <View style={{ padding: spacing.base, gap: 8 }}>
            <Button
              label={friendLabel}
              onPress={onFriend}
              loading={busy}
              variant={friend === "friends" ? "secondary" : "primary"}
              fullWidth
              icon={<Ionicons name={friendIcon as any} size={18} color={friend === "friends" ? colors.text : colors.textOnPrimary} />}
              testID="friend-button"
            />
          </View>
        )}
      </ScrollView>
      <ReportModal
        visible={showReport}
        targetType="user"
        targetId={id ?? ""}
        targetName={player.name}
        onClose={() => setShowReport(false)}
      />
    </Screen>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { height: 260 },
  banner: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.base,
    paddingTop: spacing.sm,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  avatarWrap: { alignItems: "center", marginTop: 8 },
  name: { ...t.h1, color: colors.text, marginTop: spacing.md },
  city: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 8, padding: spacing.base, flexWrap: "wrap" },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  tagText: { fontFamily: "DMSans-Medium", color: colors.text, fontSize: 12 },
  bio: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bioText: { fontFamily: "DMSans-Regular", color: colors.text, fontSize: 14, lineHeight: 22 },
  stats: { flexDirection: "row", gap: spacing.sm, padding: spacing.base },
  statBox: { flex: 1, padding: spacing.base, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  statVal: { fontFamily: "BarlowCondensed-Bold", color: colors.text, fontSize: 24 },
  statLbl: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  rep: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  repLbl: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  repVal: { fontFamily: "BarlowCondensed-Bold", color: colors.primary, fontSize: 26 },
  repBar: { flex: 2, height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: "hidden" },
  repFill: { height: "100%", backgroundColor: colors.primary },
});
