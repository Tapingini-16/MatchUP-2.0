import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, type as t, levelMeta, positionMeta } from "@/src/theme";

const BADGES: Record<string, { label: string; icon: any; color: string }> = {
  newcomer: { label: "Nouveau", icon: "sparkles", color: colors.info },
  playmaker: { label: "Playmaker", icon: "flash", color: colors.accent },
  captain: { label: "Capitaine", icon: "star", color: colors.accent },
  veteran: { label: "Vétéran", icon: "trophy", color: colors.primary },
  "top-scorer": { label: "Buteur", icon: "football", color: colors.danger },
  elite: { label: "Élite", icon: "medal", color: colors.danger },
  verified: { label: "Vérifié", icon: "checkmark-circle", color: colors.primary },
  wall: { label: "Mur", icon: "shield", color: colors.info },
  reliable: { label: "Fiable", icon: "thumbs-up", color: colors.primary },
  cleansheet: { label: "Clean Sheet", icon: "lock-closed", color: colors.info },
  "hands-of-steel": { label: "Mains d'acier", icon: "hand-left", color: colors.accent },
};

export default function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  if (!user) return null;
  const pos = positionMeta(user.position);
  const lvl = levelMeta(user.level);

  return (
    <Screen edges={["top"]} testID="profile-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {/* Header banner */}
        <View style={styles.bannerWrap}>
          <LinearGradient
            colors={[colors.primaryDim, colors.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          />
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.iconBtn}
              testID="profile-settings-button"
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.avatarRow}>
            <Avatar uri={user.photo} name={user.name} size={96} verified={user.verified} online />
            <View style={{ flex: 1, marginLeft: spacing.base, marginTop: 44 }}>
              <Text style={styles.name}>{user.name}</Text>
              {user.city && <Text style={styles.location}>📍 {user.city}</Text>}
            </View>
          </View>
        </View>

        {/* Level + position pills */}
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: lvl.color + "22", borderColor: lvl.color }]}>
            <Text style={[styles.tagText, { color: lvl.color }]}>{lvl.label}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.tagText}>{pos.label}</Text>
          </View>
          {user.foot && (
            <View style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.tagText}>Pied {user.foot === "left" ? "gauche" : user.foot === "right" ? "droit" : "des deux"}</Text>
            </View>
          )}
        </View>

        {/* Bio */}
        {user.bio ? (
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        ) : (
          <Pressable style={styles.bioEmpty} onPress={() => router.push("/edit-profile")}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.bioEmptyText}>Ajoute une bio pour te présenter</Text>
          </Pressable>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <StatCard label="Matchs" value={user.matches_played} icon="football" />
            <StatCard label="Buts" value={user.goals} icon="rocket" />
            <StatCard label="Passes déc." value={user.assists} icon="paper-plane" />
          </View>
          <View style={styles.repCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.repLabel}>Réputation</Text>
              <Text style={styles.repValue}>{user.reputation}</Text>
            </View>
            <View style={styles.repBarWrap}>
              <View style={[styles.repBar, { width: `${Math.min(100, user.reputation / 15)}%` }]} />
            </View>
          </View>
        </View>

        {/* Badges */}
        {user.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <View style={styles.badgesWrap}>
              {user.badges.map((b) => {
                const meta = BADGES[b] ?? { label: b, icon: "ribbon" as any, color: colors.textSecondary };
                return (
                  <View key={b} style={styles.badge}>
                    <View style={[styles.badgeIcon, { backgroundColor: meta.color + "22" }]}>
                      <Ionicons name={meta.icon} size={16} color={meta.color} />
                    </View>
                    <Text style={styles.badgeText}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label="Modifier mon profil"
            variant="secondary"
            fullWidth
            onPress={() => router.push("/edit-profile")}
            icon={<Ionicons name="create-outline" size={18} color={colors.text} />}
            testID="edit-profile-button"
          />
          <Button
            label="Se déconnecter"
            variant="ghost"
            fullWidth
            onPress={async () => {
              await signOut();
              router.replace("/(auth)/onboarding");
            }}
            testID="signout-button"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: any }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: { height: 200, marginBottom: 20 },
  banner: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },
  headerButtons: {
    position: "absolute",
    top: spacing.md,
    right: spacing.base,
    zIndex: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: {
    position: "absolute",
    bottom: -30,
    left: spacing.base,
    right: spacing.base,
    flexDirection: "row",
  },
  name: { ...t.h2, color: colors.text },
  location: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  tagRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.base,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  tagText: { fontFamily: "DMSans-Medium", color: colors.text, fontSize: 12 },
  bioCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bioText: { fontFamily: "DMSans-Regular", color: colors.text, lineHeight: 22, fontSize: 14 },
  bioEmpty: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bioEmptyText: { color: colors.primary, fontFamily: "DMSans-Medium" },
  section: { paddingHorizontal: spacing.base, marginTop: spacing.xl },
  sectionTitle: {
    fontFamily: "BarlowCondensed-Bold",
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
    gap: 4,
  },
  statValue: { fontFamily: "BarlowCondensed-Bold", fontSize: 26, color: colors.text, marginTop: 4 },
  statLabel: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  repCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
  },
  repLabel: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  repValue: { fontFamily: "BarlowCondensed-Bold", color: colors.primary, fontSize: 26 },
  repBarWrap: {
    flex: 2,
    height: 8,
    backgroundColor: colors.bg,
    borderRadius: 4,
    overflow: "hidden",
  },
  repBar: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  badgesWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: "DMSans-Medium", color: colors.text, fontSize: 12 },
});
