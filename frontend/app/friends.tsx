// Friends screen — tabs: Amis / Demandes.
import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, EmptyState } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { api } from "@/src/api/client";
import { colors, spacing, radius, levelMeta } from "@/src/theme";

export default function Friends() {
  const router = useRouter();
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [data, setData] = useState<{ friends: any[]; incoming: any[]; outgoing: any[] }>({
    friends: [],
    incoming: [],
    outgoing: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.friends();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const accept = async (uid: string) => {
    await api.friendAccept(uid);
    await load();
  };
  const decline = async (uid: string) => {
    await api.friendDecline(uid);
    await load();
  };

  return (
    <Screen edges={["top"]} testID="friends-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Mes amis</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        {(["friends", "requests"] as const).map((k) => {
          const active = tab === k;
          const label = k === "friends" ? `Amis (${data.friends.length})` : `Demandes (${data.incoming.length})`;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={[styles.tab, active && styles.tabActive]}
              testID={`friends-tab-${k}`}
            >
              <Text style={[styles.tabText, active && { color: colors.primary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "friends" ? (
        <FlatList
          data={data.friends}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.base }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/profile/${item.id}`)}
              testID={`friend-${item.id}`}
            >
              <Avatar uri={item.photo} name={item.name} size={44} verified={item.verified} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {levelMeta(item.level).label} · {item.position || "—"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
            ) : (
              <EmptyState
                title="Aucun ami pour le moment"
                subtitle="Ajoute des joueurs depuis leur profil"
                icon={<Ionicons name="people" size={44} color={colors.textMuted} />}
              />
            )
          }
        />
      ) : (
        <FlatList
          data={data.incoming}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.base }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`req-${item.id}`}>
              <Avatar uri={item.photo} name={item.name} size={44} verified={item.verified} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>veut être ton ami</Text>
              </View>
              <Pressable onPress={() => decline(item.id)} style={styles.declineBtn} testID={`friend-decline-${item.id}`}>
                <Ionicons name="close" size={18} color={colors.danger} />
              </Pressable>
              <Pressable onPress={() => accept(item.id)} style={styles.acceptBtn} testID={`friend-accept-${item.id}`}>
                <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
            ) : (
              <EmptyState
                title="Aucune demande"
                subtitle="Tu verras ici les joueurs qui veulent t'ajouter"
                icon={<Ionicons name="person-add" size={44} color={colors.textMuted} />}
              />
            )
          }
        />
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
  tabs: { flexDirection: "row", padding: spacing.base, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  tabText: { fontFamily: "DMSans-Bold", color: colors.textSecondary, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  name: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 14 },
  meta: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,90,95,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,90,95,0.4)",
  },
});
