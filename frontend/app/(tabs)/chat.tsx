import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Screen, EmptyState } from "@/src/components/Screen";
import { api } from "@/src/api/client";
import { colors, spacing, radius, type as t, levelMeta } from "@/src/theme";

export default function ChatList() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.myGroups();
      setGroups(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen edges={["top"]} testID="chat-list-screen">
      <View style={styles.header}>
        <Text style={styles.headline}>Messages</Text>
        <Text style={styles.sub}>Discussions de tes groupes</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 80 }} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/chat/${item.id}`)}
            testID={`chat-row-${item.id}`}
          >
            <View style={styles.imgWrap}>
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.img} contentFit="cover" />
              ) : (
                <View style={[styles.img, { backgroundColor: colors.surfaceHigh }]} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.levelDot, { backgroundColor: levelMeta(item.level).color }]} />
                <Text style={styles.meta}>{levelMeta(item.level).label}</Text>
                <View style={styles.dot} />
                <Text style={styles.meta}>{item.members_count} membres</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <EmptyState
              title="Rejoins un groupe pour commencer"
              subtitle="Une fois membre, tes discussions apparaîtront ici"
              icon={<Ionicons name="chatbubbles" size={44} color={colors.textMuted} />}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headline: { ...t.h1, color: colors.text },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 14, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", padding: spacing.base, gap: spacing.md },
  imgWrap: { width: 56, height: 56, borderRadius: radius.md, overflow: "hidden" },
  img: { width: 56, height: 56 },
  name: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 15 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  levelDot: { width: 6, height: 6, borderRadius: 3 },
  meta: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
});
