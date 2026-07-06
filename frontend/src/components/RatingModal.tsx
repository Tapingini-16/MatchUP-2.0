// Post-match rating modal — level / punctuality / fair-play (1-5) per player.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/Button";
import { Avatar } from "@/src/components/Avatar";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

type Score = { level: number; punctuality: number; fairplay: number };

type Props = {
  visible: boolean;
  matchId: string;
  players: any[]; // {id, name, photo, position}
  onClose: () => void;
  onSaved?: () => void;
};

export function RatingModal({ visible, matchId, players, onClose, onSaved }: Props) {
  const [ratings, setRatings] = useState<Record<string, Score>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !matchId) return;
    api.myRatings(matchId).then((r) => setRatings(r || {})).catch(() => {});
  }, [visible, matchId]);

  const set = (uid: string, key: keyof Score, val: number) => {
    setRatings((prev) => ({
      ...prev,
      [uid]: { level: 3, punctuality: 3, fairplay: 3, ...(prev[uid] || {}), [key]: val },
    }));
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.rateMatch(matchId, ratings);
      onSaved?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet} testID="rating-modal">
          <View style={styles.grip} />
          <Text style={styles.title}>Note tes coéquipiers</Text>
          <Text style={styles.sub}>Niveau · Ponctualité · Fair-play</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 8, gap: 12 }} showsVerticalScrollIndicator={false}>
            {players.map((p) => {
              const r = ratings[p.id] || { level: 0, punctuality: 0, fairplay: 0 };
              return (
                <View key={p.id} style={styles.card} testID={`rate-${p.id}`}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Avatar uri={p.photo} name={p.name} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pname}>{p.name}</Text>
                      <Text style={styles.pmeta}>{p.position || "—"}</Text>
                    </View>
                  </View>
                  <Row label="Niveau" value={r.level} onChange={(v) => set(p.id, "level", v)} testID={`rate-${p.id}-level`} />
                  <Row label="Ponctualité" value={r.punctuality} onChange={(v) => set(p.id, "punctuality", v)} testID={`rate-${p.id}-punc`} />
                  <Row label="Fair-play" value={r.fairplay} onChange={(v) => set(p.id, "fairplay", v)} testID={`rate-${p.id}-fp`} />
                </View>
              );
            })}
            {players.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: "center", padding: 32, fontFamily: "DMSans-Regular" }}>
                Personne à noter pour ce match
              </Text>
            )}
          </ScrollView>
          <Button
            label="Enregistrer"
            onPress={submit}
            loading={busy}
            fullWidth
            size="lg"
            testID="rating-submit-button"
            style={{ marginTop: 8 } as any}
          />
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, onChange, testID }: { label: string; value: number; onChange: (v: number) => void; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={4}
            testID={`${testID}-${n}`}
          >
            <Ionicons name={n <= value ? "star" : "star-outline"} size={22} color={n <= value ? colors.accent : colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingBottom: 40,
    maxHeight: "88%",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  card: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  pname: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 14 },
  pmeta: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontFamily: "DMSans-Medium", color: colors.text, fontSize: 13 },
});
