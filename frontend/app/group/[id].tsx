import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  ImageBackground,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Screen } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { Button } from "@/src/components/Button";
import { ReportModal } from "@/src/components/ReportModal";
import { api } from "@/src/api/client";
import { colors, spacing, radius, levelMeta } from "@/src/theme";

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);

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
      if (g.is_admin) {
        try {
          const r = await api.joinRequests(id);
          setRequests(r);
        } catch {}
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const doJoin = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await api.joinGroup(id, joinMsg.trim() || undefined);
      setShowJoinModal(false);
      setJoinMsg("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelJoin = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await api.cancelJoin(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const approve = async (reqId: string) => {
    if (!id) return;
    await api.approveRequest(id, reqId);
    await load();
  };

  const reject = async (reqId: string) => {
    if (!id) return;
    await api.rejectRequest(id, reqId);
    await load();
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
  const status = group.join_status; // none | pending | member | admin

  const ctaLabel =
    status === "admin"
      ? "Voir le chat"
      : status === "member"
        ? "Voir le chat"
        : status === "pending"
          ? "Annuler la demande"
          : "Demander à rejoindre";

  const ctaAction = () => {
    if (status === "member" || status === "admin") {
      router.push(`/chat/${id}`);
    } else if (status === "pending") {
      cancelJoin();
    } else {
      setShowJoinModal(true);
    }
  };

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
            <Pressable
              style={styles.iconBtn}
              hitSlop={12}
              onPress={() => setShowMenu(true)}
              testID="group-menu-button"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View>
            <View style={styles.heroPills}>
              <View style={[styles.levelPill, { backgroundColor: lvl.color + "22", borderColor: lvl.color }]}>
                <Text style={[styles.levelText, { color: lvl.color }]}>{lvl.label}</Text>
              </View>
              {status === "admin" && (
                <View style={[styles.levelPill, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
                  <Ionicons name="ribbon" size={11} color={colors.primary} />
                  <Text style={[styles.levelText, { color: colors.primary, marginLeft: 4 }]}>Admin</Text>
                </View>
              )}
              {status === "pending" && (
                <View style={[styles.levelPill, { backgroundColor: colors.accent + "22", borderColor: colors.accent }]}>
                  <Ionicons name="time" size={11} color={colors.accent} />
                  <Text style={[styles.levelText, { color: colors.accent, marginLeft: 4 }]}>En attente</Text>
                </View>
              )}
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
                <Text style={styles.metaText}>{group.members_count}/{group.max_members}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Admin: pending requests */}
        {status === "admin" && requests.length > 0 && (
          <View style={styles.section}>
            <Pressable onPress={() => setShowRequests((s) => !s)} style={styles.reqHeader} testID="join-requests-toggle">
              <View style={{ flex: 1 }}>
                <Text style={styles.reqTitle}>{requests.length} demande{requests.length > 1 ? "s" : ""} en attente</Text>
                <Text style={styles.reqSub}>Touche pour {showRequests ? "masquer" : "gérer"}</Text>
              </View>
              <View style={styles.reqBadge}>
                <Text style={styles.reqBadgeText}>{requests.length}</Text>
              </View>
              <Ionicons name={showRequests ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
            </Pressable>
            {showRequests && (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                {requests.map((r) => (
                  <View key={r.id} style={styles.reqItem} testID={`req-${r.id}`}>
                    <Avatar uri={r.user_photo} name={r.user_name} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reqName}>{r.user_name}</Text>
                      {r.message ? <Text style={styles.reqMsg} numberOfLines={2}>&ldquo;{r.message}&rdquo;</Text> : null}
                    </View>
                    <Pressable onPress={() => reject(r.id)} style={styles.reqRejectBtn} testID={`reject-${r.id}`} hitSlop={8}>
                      <Ionicons name="close" size={18} color={colors.danger} />
                    </Pressable>
                    <Pressable onPress={() => approve(r.id)} style={styles.reqApproveBtn} testID={`approve-${r.id}`} hitSlop={8}>
                      <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.description}>{group.description}</Text>

          {/* Preferred days + positions needed */}
          {(group.preferred_days?.length > 0 || group.positions_needed?.length > 0) && (
            <View style={styles.metaCard}>
              {group.preferred_days?.length > 0 && (
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>JOURS DE MATCH</Text>
                  <View style={styles.metaChips}>
                    {group.preferred_days.map((d: string) => (
                      <View key={d} style={styles.dayChip}>
                        <Text style={styles.dayChipText}>{dayShort(d)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {group.positions_needed?.length > 0 && (
                <View style={[styles.metaBlock, { marginTop: group.preferred_days?.length > 0 ? 12 : 0 }]}>
                  <Text style={styles.metaLabel}>POSTES RECHERCHÉS</Text>
                  <View style={styles.metaChips}>
                    {group.positions_needed.map((p: string) => (
                      <View key={p} style={styles.posChip}>
                        <Ionicons name="person-add" size={11} color={colors.primary} />
                        <Text style={styles.posChipText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Next matches list */}
        {matches.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.sectionTitle}>Matchs</Text>
              {(status === "member" || status === "admin") && (
                <Pressable onPress={() => router.push({ pathname: "/create-match", params: { group_id: id } } as any)} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold", fontSize: 13 }}>+ Ajouter</Text>
                </Pressable>
              )}
            </View>
            {matches.slice(0, 4).map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/match/${m.id}` as any)}
                style={styles.matchCard}
                testID={`match-${m.id}`}
              >
                <View style={styles.matchDate}>
                  <Text style={styles.matchDay}>{dayjs(m.date).format("DD")}</Text>
                  <Text style={styles.matchMonth}>{dayjs(m.date).format("MMM").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchTitle}>{m.title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="location" size={13} color={colors.textSecondary} />
                    <Text style={styles.matchLoc}>{m.location}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Ionicons name="time" size={13} color={colors.textSecondary} />
                    <Text style={styles.matchLoc}>{dayjs(m.date).format("HH[h]mm")}</Text>
                  </View>
                </View>
                <View style={styles.matchPlayers}>
                  <Text style={styles.matchPlayersNum}>{(m.players || []).length}/{m.max_players}</Text>
                  <Text style={styles.matchPlayersLbl}>joueurs</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres ({members.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.base }}>
            {members.slice(0, 12).map((m) => (
              <View key={m.id} style={styles.memberCard}>
                <Avatar uri={m.photo} name={m.name} size={56} verified={m.verified} />
                <Text style={styles.memberName} numberOfLines={1}>{m.name.split(" ")[0]}</Text>
                <Text style={styles.memberRole}>{m.role === "admin" ? "Admin" : m.position || "—"}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Sticky bottom action */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>
            {status === "member" || status === "admin"
              ? "Tu es membre"
              : status === "pending"
                ? "Demande envoyée"
                : "Places restantes"}
          </Text>
          <Text style={styles.bottomValue}>
            {status === "member" || status === "admin"
              ? "✓ Accès complet"
              : status === "pending"
                ? "En attente admin"
                : `${group.spots_left} places`}
          </Text>
        </View>
        <Button
          label={ctaLabel}
          onPress={ctaAction}
          loading={busy}
          size="lg"
          variant={status === "pending" ? "secondary" : "primary"}
          testID="group-cta-button"
          icon={
            status === "member" || status === "admin" ? (
              <Ionicons name="chatbubbles" size={18} color={colors.textOnPrimary} />
            ) : status === "pending" ? (
              <Ionicons name="close-circle" size={18} color={colors.text} />
            ) : (
              <Ionicons name="add" size={20} color={colors.textOnPrimary} />
            )
          }
        />
      </View>

      {/* Join request modal */}
      <Modal visible={showJoinModal} transparent animationType="slide" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowJoinModal(false)} />
          <View style={styles.modalCard} testID="join-modal">
            <View style={styles.modalGrip} />
            <Text style={styles.modalTitle}>Demander à rejoindre {group.name}</Text>
            <Text style={styles.modalSub}>Un petit mot pour l&apos;admin ? (optionnel)</Text>
            <TextInput
              testID="join-message-input"
              value={joinMsg}
              onChangeText={setJoinMsg}
              placeholder="Salut ! J&apos;aimerais rejoindre votre groupe pour..."
              placeholderTextColor={colors.textMuted}
              style={styles.modalInput}
              multiline
              maxLength={200}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Button label="Annuler" variant="ghost" onPress={() => setShowJoinModal(false)} style={{ flex: 1 } as any} />
              <Button label="Envoyer" onPress={doJoin} loading={busy} style={{ flex: 1 } as any} testID="join-submit-button" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Group actions menu */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowMenu(false)} />
          <View style={styles.modalCard} testID="group-menu">
            <View style={styles.modalGrip} />
            <Pressable
              onPress={() => setShowMenu(false)}
              style={styles.menuItem}
              testID="menu-share"
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
              <Text style={styles.menuText}>Partager le groupe</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowMenu(false);
                setShowReport(true);
              }}
              style={styles.menuItem}
              testID="menu-report"
            >
              <Ionicons name="flag-outline" size={20} color={colors.accent} />
              <Text style={[styles.menuText, { color: colors.accent }]}>Signaler ce groupe</Text>
            </Pressable>
            {status !== "admin" && (
              <Pressable
                onPress={async () => {
                  setShowMenu(false);
                  if (!id) return;
                  await api.block("group", id);
                  router.back();
                }}
                style={styles.menuItem}
                testID="menu-block"
              >
                <Ionicons name="ban-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuText, { color: colors.danger }]}>Bloquer ce groupe</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setShowMenu(false)} style={[styles.menuItem, { justifyContent: "center", marginTop: 4 }]}>
              <Text style={{ fontFamily: "DMSans-Medium", color: colors.textSecondary }}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ReportModal
        visible={showReport}
        targetType="group"
        targetId={id ?? ""}
        targetName={group.name}
        onClose={() => setShowReport(false)}
      />
    </View>
  );
}

function dayShort(k: string) {
  const map: Record<string, string> = { mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim" };
  return map[k] ?? k;
}

const styles = StyleSheet.create({
  hero: { height: 340, justifyContent: "space-between", padding: spacing.base, paddingTop: 60 },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(9,10,12,0.65)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  heroPills: { flexDirection: "row", gap: 6, marginBottom: spacing.sm },
  levelPill: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1,
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
  reqHeader: {
    flexDirection: "row", alignItems: "center", padding: spacing.base,
    backgroundColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryDim, gap: 8,
  },
  reqTitle: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 14 },
  reqSub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  reqBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  reqBadgeText: { fontFamily: "BarlowCondensed-Bold", color: colors.textOnPrimary, fontSize: 14 },
  reqItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  reqName: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 14 },
  reqMsg: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  reqRejectBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,90,95,0.14)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,90,95,0.4)",
  },
  reqApproveBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  matchCard: {
    flexDirection: "row", alignItems: "center", padding: spacing.base,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    gap: spacing.base, marginTop: spacing.sm,
  },
  matchDate: {
    width: 60, height: 60, borderRadius: radius.md, backgroundColor: colors.primaryMuted,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.primaryDim,
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
    position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.base, paddingBottom: spacing.xl,
    backgroundColor: colors.bgElevated, borderTopWidth: 1, borderTopColor: colors.border,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
  },
  bottomLabel: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  bottomValue: { fontFamily: "BarlowCondensed-Bold", color: colors.text, fontSize: 18, marginTop: 2 },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.scrim },
  modalCard: {
    backgroundColor: colors.bgElevated, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: spacing.xl, paddingBottom: 40, borderTopWidth: 1, borderColor: colors.border,
  },
  modalGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text, marginBottom: 4 },
  modalSub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13, marginBottom: 12 },
  modalInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: 12, minHeight: 90, textAlignVertical: "top", color: colors.text, fontFamily: "DMSans-Regular", fontSize: 14,
  },
});
