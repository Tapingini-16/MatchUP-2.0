import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, EmptyState } from "@/src/components/Screen";
import { colors, spacing, radius } from "@/src/theme";

export default function Notifications() {
  const router = useRouter();

  // MVP: show a friendly placeholder with the design system.
  const items = [
    { icon: "football" as any, title: "Nouveau match programmé", subtitle: "Les Titans du 11ème · demain à 20h", time: "il y a 2h" },
    { icon: "people" as any, title: "Sarah a rejoint le groupe", subtitle: "FC République", time: "il y a 5h" },
    { icon: "chatbubble" as any, title: "3 nouveaux messages", subtitle: "Bastille United", time: "hier" },
    { icon: "trophy" as any, title: "Nouveau badge débloqué : Playmaker", subtitle: "Continue comme ça 💪", time: "hier" },
  ];

  return (
    <Screen testID="notifications-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base }}>
        {items.map((it, i) => (
          <View key={i} style={styles.item}>
            <View style={styles.iconWrap}>
              <Ionicons name={it.icon} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{it.title}</Text>
              <Text style={styles.itemSub}>{it.subtitle}</Text>
            </View>
            <Text style={styles.itemTime}>{it.time}</Text>
          </View>
        ))}
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
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  itemTitle: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 14 },
  itemSub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  itemTime: { fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 11 },
});
