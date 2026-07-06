import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

const DATE_PRESETS = [
  { key: "tomorrow", label: "Demain 19h", offsetH: 24 - new Date().getHours() + 19 },
  { key: "afterTomorrow", label: "Après-demain 19h", offsetH: 48 - new Date().getHours() + 19 },
  { key: "sat", label: "Samedi 15h", offsetH: (6 - new Date().getDay() + 7) % 7 * 24 - new Date().getHours() + 15 },
  { key: "sun", label: "Dimanche 11h", offsetH: (0 - new Date().getDay() + 7) % 7 * 24 - new Date().getHours() + 11 },
];

export default function CreateMatch() {
  const { group_id } = useLocalSearchParams<{ group_id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("Match hebdo");
  const [location, setLocation] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!group_id) return setError("Groupe introuvable");
    if (title.trim().length < 2) return setError("Titre trop court");
    if (location.trim().length < 2) return setError("Ajoute un lieu");
    setSaving(true);
    try {
      const m = await api.createMatch({
        group_id,
        title: title.trim(),
        location: location.trim(),
        date: selectedDate.toISOString(),
        max_players: parseInt(maxPlayers, 10) || 12,
      });
      router.replace(`/match/${m.id}` as any);
    } catch (e: any) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (offsetH: number) => {
    const d = new Date();
    d.setHours(d.getHours() + offsetH);
    setSelectedDate(d);
  };

  return (
    <Screen testID="create-match-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Nouveau match</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            testID="cm-title-input"
            value={title}
            onChangeText={setTitle}
            placeholder="Match hebdo"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Lieu</Text>
          <TextInput
            testID="cm-location-input"
            value={location}
            onChangeText={setLocation}
            placeholder="Stade Léo Lagrange"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Quand ?</Text>
          <View style={styles.presetRow}>
            {DATE_PRESETS.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => applyPreset(p.offsetH)}
                style={styles.presetChip}
                testID={`preset-${p.key}`}
              >
                <Text style={styles.presetText}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.dateDisplay}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={styles.dateText}>
              {dayjs(selectedDate).format("dddd DD MMMM · HH[h]mm")}
            </Text>
          </View>

          <Text style={styles.label}>Nombre de joueurs max</Text>
          <TextInput
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.input}
          />

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.saveBar}>
        <Button label="Créer le match" onPress={submit} loading={saving} fullWidth size="lg" testID="cm-submit-button" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 20, color: colors.text },
  label: {
    fontFamily: "DMSans-Bold", color: colors.textSecondary, fontSize: 11,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: spacing.base,
  },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.base, paddingVertical: 12,
    color: colors.text, fontFamily: "DMSans-Medium", fontSize: 15,
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  presetChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  presetText: { fontFamily: "DMSans-Medium", color: colors.text, fontSize: 12 },
  dateDisplay: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 14,
    backgroundColor: colors.primaryMuted, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primaryDim,
  },
  dateText: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 14 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,90,95,0.12)", borderWidth: 1, borderColor: "rgba(255,90,95,0.4)",
    borderRadius: radius.md, padding: 12, marginTop: spacing.base,
  },
  errorText: { color: colors.danger, fontFamily: "DMSans-Medium", fontSize: 13, flex: 1 },
  saveBar: {
    position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.base, paddingBottom: spacing.xl,
    backgroundColor: colors.bgElevated, borderTopWidth: 1, borderTopColor: colors.border,
  },
});
