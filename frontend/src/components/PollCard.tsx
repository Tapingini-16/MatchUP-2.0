// Poll card + vote UI rendered inside chat messages.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/api/client";

type Props = {
  message: any;
  userId: string;
  onVoted: (updated: any) => void;
};

export function PollCard({ message, userId, onVoted }: Props) {
  const poll = message.poll || {};
  const question: string = poll.question ?? "";
  const options: string[] = poll.options ?? [];
  const votes: Record<string, number> = poll.votes ?? {};
  const myVote = votes[userId];
  const counts = options.map((_, i) => Object.values(votes).filter((v) => v === i).length);
  const total = Object.keys(votes).length;

  const vote = async (i: number) => {
    if (myVote === i) return;
    try {
      const updated = await api.votePoll(message.id, i);
      onVoted(updated);
    } catch (e) {
      console.log("vote error", e);
    }
  };

  return (
    <View style={styles.card} testID={`poll-${message.id}`}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={14} color={colors.primary} />
        <Text style={styles.tag}>SONDAGE</Text>
      </View>
      <Text style={styles.question}>{question}</Text>
      {options.map((opt, i) => {
        const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
        const active = myVote === i;
        return (
          <Pressable
            key={i}
            onPress={() => vote(i)}
            style={[styles.option, active && { borderColor: colors.primary }]}
            testID={`poll-${message.id}-opt-${i}`}
          >
            <View style={[styles.fill, { width: `${pct}%` }, active && { backgroundColor: colors.primaryMuted }]} />
            <View style={styles.row}>
              <Ionicons
                name={active ? "radio-button-on" : "radio-button-off"}
                size={16}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.optText, active && { color: colors.primary, fontFamily: "DMSans-Bold" }]}>{opt}</Text>
              <Text style={styles.count}>{counts[i]}</Text>
            </View>
          </Pressable>
        );
      })}
      <Text style={styles.total}>
        {total} vote{total > 1 ? "s" : ""}
        {myVote !== undefined ? " · Tu as voté" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    minWidth: 240,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 4 },
  tag: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 10, letterSpacing: 1 },
  question: { fontFamily: "BarlowCondensed-Bold", color: colors.text, fontSize: 17, marginBottom: 6, letterSpacing: -0.2 },
  option: {
    position: "relative",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: "hidden",
    marginTop: 4,
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colors.primaryMuted,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 10 },
  optText: { flex: 1, fontFamily: "DMSans-Medium", color: colors.text, fontSize: 13 },
  count: { fontFamily: "BarlowCondensed-Bold", color: colors.textSecondary, fontSize: 15 },
  total: { fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 11, marginTop: 6 },
});
