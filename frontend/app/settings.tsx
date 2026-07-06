import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius } from "@/src/theme";

export default function Settings() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [notifs, setNotifs] = React.useState(true);
  const [darkMode] = React.useState(true);

  const sections = [
    {
      title: "Compte",
      items: [
        { icon: "person" as any, label: "Modifier mon profil", onPress: () => router.push("/edit-profile") },
        { icon: "shield-checkmark" as any, label: "Sécurité & mot de passe", onPress: () => {} },
        { icon: "ban" as any, label: "Utilisateurs & groupes bloqués", onPress: () => router.push("/blocked") },
        { icon: "lock-closed" as any, label: "Confidentialité", onPress: () => {} },
      ],
    },
    {
      title: "Préférences",
      items: [
        { icon: "notifications" as any, label: "Notifications", right: <Switch value={notifs} onValueChange={setNotifs} trackColor={{ true: colors.primary, false: colors.border }} /> },
        { icon: "moon" as any, label: "Thème sombre", right: <Switch value={darkMode} disabled trackColor={{ true: colors.primary, false: colors.border }} /> },
        { icon: "language" as any, label: "Langue", right: <Text style={styles.rightText}>Français</Text> },
      ],
    },
    {
      title: "Aide",
      items: [
        { icon: "help-circle" as any, label: "Centre d'aide", onPress: () => {} },
        { icon: "chatbox-ellipses" as any, label: "Contacter le support", onPress: () => {} },
        { icon: "document-text" as any, label: "Conditions d'utilisation", onPress: () => {} },
      ],
    },
  ];

  return (
    <Screen testID="settings-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Paramètres</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}>
        {sections.map((section) => (
          <View key={section.title} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((it: any, i) => (
                <Pressable
                  key={it.label}
                  onPress={it.onPress}
                  style={[
                    styles.row,
                    i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={it.icon} size={17} color={colors.primary} />
                  </View>
                  <Text style={styles.rowLabel}>{it.label}</Text>
                  {it.right ? it.right : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={[styles.card, styles.dangerBtn]}
          onPress={async () => {
            await signOut();
            router.replace("/(auth)/onboarding");
          }}
          testID="settings-signout-button"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.dangerText}>Se déconnecter</Text>
        </Pressable>

        <Text style={styles.version}>MatchUp · v1.0.0</Text>
      </ScrollView>
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
  sectionTitle: {
    fontFamily: "DMSans-Bold",
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    gap: spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontFamily: "DMSans-Medium", color: colors.text, fontSize: 14 },
  rightText: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.base,
    marginTop: spacing.md,
  },
  dangerText: { fontFamily: "DMSans-Bold", color: colors.danger, fontSize: 14 },
  version: {
    textAlign: "center",
    fontFamily: "DMSans-Regular",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
