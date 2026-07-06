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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

const LEVELS = [
  { key: "rookie", label: "Débutant" },
  { key: "intermediate", label: "Intermédiaire" },
  { key: "advanced", label: "Avancé" },
  { key: "elite", label: "Élite" },
  { key: "mixed", label: "Tous niveaux" },
];

const DAYS = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Jeu" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sam" },
  { key: "sun", label: "Dim" },
];

const POSITIONS = [
  { key: "GK", label: "Gardien" },
  { key: "DEF", label: "Défenseur" },
  { key: "MID", label: "Milieu" },
  { key: "FWD", label: "Attaquant" },
];

const COVERS = [
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800",
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800",
  "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800",
  "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800",
  "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800",
];

export default function CreateGroup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [maxMembers, setMaxMembers] = useState("20");
  const [photo, setPhoto] = useState(COVERS[0]);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [positionsNeeded, setPositionsNeeded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Choisis un nom");
    if (city.trim().length < 2) return setError("Précise la ville");
    if (description.trim().length < 10) return setError("Ajoute une description (10 caractères min)");
    setSaving(true);
    try {
      const g = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        level,
        max_members: parseInt(maxMembers, 10) || 20,
        photo,
        preferred_days: preferredDays,
        positions_needed: positionsNeeded,
      });
      router.replace(`/group/${g.id}`);
    } catch (e: any) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="create-group-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Nouveau groupe</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}>
          <Text style={styles.label}>Photo de couverture</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {COVERS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setPhoto(c)}
                style={[styles.coverPick, photo === c && { borderColor: colors.primary, borderWidth: 3 }]}
              >
                <View
                  style={{
                    width: 100,
                    height: 70,
                    backgroundColor: colors.surface,
                    overflow: "hidden",
                    borderRadius: radius.md - 2,
                  }}
                >
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: colors.surface,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.coverImg}>
                      <View
                        style={{
                          ...StyleSheet.absoluteFillObject,
                          overflow: "hidden",
                          borderRadius: radius.md - 2,
                        }}
                      >
                        <View style={styles.coverImg} />
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Nom du groupe *</Text>
          <TextInput
            testID="create-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Les Titans du 11ème"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Ville *</Text>
          <TextInput
            testID="create-city-input"
            value={city}
            onChangeText={setCity}
            placeholder="Paris 11"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            testID="create-desc-input"
            value={description}
            onChangeText={setDescription}
            placeholder="Décris ton groupe, les jours de match, l'ambiance..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { minHeight: 100, textAlignVertical: "top", paddingTop: 12 }]}
            multiline
          />

          <Text style={styles.label}>Niveau</Text>
          <View style={styles.pillRow}>
            {LEVELS.map((l) => (
              <Pressable
                key={l.key}
                onPress={() => setLevel(l.key)}
                style={[
                  styles.pill,
                  level === l.key && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                ]}
              >
                <Text style={{ color: level === l.key ? colors.primary : colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Membres max</Text>
          <TextInput
            value={maxMembers}
            onChangeText={setMaxMembers}
            placeholder="20"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={2}
          />

          <Text style={styles.label}>Jours de match (optionnel)</Text>
          <View style={styles.pillRow}>
            {DAYS.map((d) => {
              const active = preferredDays.includes(d.key);
              return (
                <Pressable
                  key={d.key}
                  onPress={() =>
                    setPreferredDays((prev) =>
                      prev.includes(d.key) ? prev.filter((x) => x !== d.key) : [...prev, d.key],
                    )
                  }
                  style={[
                    styles.pill,
                    active && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                  ]}
                  testID={`create-day-${d.key}`}
                >
                  <Text style={{ color: active ? colors.primary : colors.textSecondary, fontFamily: "DMSans-Bold" }}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Postes recherchés (optionnel)</Text>
          <Text style={{ fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 12, marginTop: -2, marginBottom: 6 }}>
            Aide les joueurs à trouver ton groupe
          </Text>
          <View style={styles.pillRow}>
            {POSITIONS.map((p) => {
              const active = positionsNeeded.includes(p.key);
              return (
                <Pressable
                  key={p.key}
                  onPress={() =>
                    setPositionsNeeded((prev) =>
                      prev.includes(p.key) ? prev.filter((x) => x !== p.key) : [...prev, p.key],
                    )
                  }
                  style={[
                    styles.pill,
                    active && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                  ]}
                  testID={`create-pos-${p.key}`}
                >
                  <Text style={{ color: active ? colors.primary : colors.textSecondary, fontFamily: "DMSans-Medium" }}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.saveBar}>
        <Button label="Créer le groupe" onPress={submit} loading={saving} fullWidth size="lg" testID="create-submit-button" />
      </View>
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
  label: {
    fontFamily: "DMSans-Bold",
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: spacing.base,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: "DMSans-Medium",
    fontSize: 15,
  },
  coverPick: {
    borderRadius: radius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImg: {
    width: 100,
    height: 70,
    borderRadius: radius.md - 2,
    backgroundColor: colors.surface,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,90,95,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,90,95,0.4)",
    borderRadius: radius.md,
    padding: 12,
    marginTop: spacing.base,
  },
  errorText: { color: colors.danger, fontFamily: "DMSans-Medium", fontSize: 13, flex: 1 },
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.base,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
