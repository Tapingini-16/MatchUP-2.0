import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, EmptyState } from "@/src/components/Screen";
import { GroupCard } from "@/src/components/GroupCard";
import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/auth";
import { api } from "@/src/api/client";
import { colors, spacing, radius, type as t } from "@/src/theme";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listGroups({ sort: "distance" });
      setGroups(data);
    } catch (e) {
      console.log("Home load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <Screen edges={["top"]} testID="home-screen">
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.base }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Top header */}
            <View style={styles.topBar}>
              <Pressable onPress={() => router.push("/(tabs)/profile")}>
                <Avatar uri={user?.photo} name={user?.name} size={44} verified={user?.verified} />
              </Pressable>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.greet}>Salut{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋</Text>
                <Text style={styles.greetSub}>Prêt pour ton prochain match ?</Text>
              </View>
              <Pressable
                onPress={() => router.push("/notifications")}
                style={styles.iconBtn}
                testID="notif-button"
              >
                <Ionicons name="notifications" size={20} color={colors.text} />
                <View style={styles.notifDot} />
              </Pressable>
            </View>

            {/* Hero card */}
            <Pressable
              style={styles.hero}
              onPress={() => router.push("/create-group")}
              testID="create-group-cta"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTag}>CRÉER TON GROUPE</Text>
                <Text style={styles.heroTitle}>Lance ta propre équipe</Text>
                <Text style={styles.heroSub}>Invite tes potes, organise vos matchs</Text>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="add" size={26} color={colors.textOnPrimary} />
              </View>
            </Pressable>

            {/* Section title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Groupes près de toi</Text>
              <Pressable onPress={() => router.push("/(tabs)/discover")} hitSlop={8}>
                <Text style={styles.link}>Voir tout</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.base }}>
            <GroupCard group={item} onPress={() => router.push(`/group/${item.id}`)} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <EmptyState
              title="Aucun groupe pour le moment"
              subtitle="Sois le premier à créer un groupe dans ta ville"
              icon={<Ionicons name="football" size={48} color={colors.textMuted} />}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    flexDirection: "row",
    alignItems: "center",
  },
  greet: { fontFamily: "BarlowCondensed-Bold", fontSize: 20, color: colors.text },
  greetSub: { fontFamily: "DMSans-Regular", fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  hero: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  heroTag: { ...t.overline, color: colors.primary, marginBottom: 4 },
  heroTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 20, color: colors.text },
  heroSub: { fontFamily: "DMSans-Regular", fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text, letterSpacing: -0.2 },
  link: { color: colors.primary, fontFamily: "DMSans-Medium", fontSize: 13 },
  loader: { padding: spacing.xxl, alignItems: "center" },
});
