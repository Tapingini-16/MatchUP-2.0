import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, type as t } from "@/src/theme";

const POSITIONS = [
  { key: "GK", label: "Gardien" },
  { key: "DEF", label: "Défenseur" },
  { key: "MID", label: "Milieu" },
  { key: "FWD", label: "Attaquant" },
];
const LEVELS = [
  { key: "rookie", label: "Débutant" },
  { key: "intermediate", label: "Intermédiaire" },
  { key: "advanced", label: "Avancé" },
  { key: "elite", label: "Élite" },
];
const FEET = [
  { key: "left", label: "Gauche" },
  { key: "right", label: "Droit" },
  { key: "both", label: "Les deux" },
];
const AVAILS = [
  { key: "morning", label: "Matin" },
  { key: "afternoon", label: "Après-midi" },
  { key: "evening", label: "Soir" },
  { key: "weekend", label: "Weekend" },
];

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [radiusKm, setRadiusKm] = useState(user?.radius_km ? String(user.radius_km) : "10");
  const [position, setPosition] = useState<string | null>(user?.position ?? null);
  const [level, setLevel] = useState<string | null>(user?.level ?? "intermediate");
  const [foot, setFoot] = useState<string | null>(user?.foot ?? null);
  const [avails, setAvails] = useState<string[]>(user?.availabilities ?? []);
  const [photo, setPhoto] = useState<string | null>(user?.photo ?? null);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateUser({
        name: name.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        age: age ? parseInt(age, 10) : null,
        radius_km: radiusKm ? parseInt(radiusKm, 10) : null,
        position,
        level,
        foot,
        availabilities: avails,
        photo,
      } as any);
      router.back();
    } catch (e) {
      console.log(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvail = (k: string) =>
    setAvails((prev) => (prev.includes(k) ? prev.filter((a) => a !== k) : [...prev, k]));

  return (
    <Screen testID="edit-profile-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="edit-back">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Modifier profil</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        style={{ flex: 1 }}
      >
          <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
            <Pressable onPress={pickPhoto} testID="edit-photo-button">
              <Avatar uri={photo} name={name} size={110} />
              <View style={styles.photoBadge}>
                <Ionicons name="camera" size={16} color={colors.textOnPrimary} />
              </View>
            </Pressable>
            <Text style={styles.photoHint}>Touche pour changer la photo</Text>
          </View>

          <FieldLabel label="Nom" />
          <TextInput
            testID="edit-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Ton nom"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <FieldLabel label="Bio" />
          <TextInput
            testID="edit-bio-input"
            value={bio}
            onChangeText={setBio}
            placeholder="Parle un peu de toi..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { minHeight: 90, textAlignVertical: "top", paddingTop: 12 }]}
            multiline
            maxLength={280}
          />

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Ville" />
              <TextInput
                testID="edit-city-input"
                value={city}
                onChangeText={setCity}
                placeholder="Paris"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
            <View style={{ width: 100 }}>
              <FieldLabel label="Âge" />
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="27"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>

          <FieldLabel label="Rayon (km)" />
          <TextInput
            value={radiusKm}
            onChangeText={setRadiusKm}
            placeholder="10"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={3}
          />

          <FieldLabel label="Poste préféré" />
          <View style={styles.pillRow}>
            {POSITIONS.map((p) => (
              <Pill
                key={p.key}
                label={p.label}
                active={position === p.key}
                onPress={() => setPosition(position === p.key ? null : p.key)}
              />
            ))}
          </View>

          <FieldLabel label="Niveau" />
          <View style={styles.pillRow}>
            {LEVELS.map((l) => (
              <Pill key={l.key} label={l.label} active={level === l.key} onPress={() => setLevel(l.key)} />
            ))}
          </View>

          <FieldLabel label="Pied fort" />
          <View style={styles.pillRow}>
            {FEET.map((f) => (
              <Pill
                key={f.key}
                label={f.label}
                active={foot === f.key}
                onPress={() => setFoot(foot === f.key ? null : f.key)}
              />
            ))}
          </View>

          <FieldLabel label="Disponibilités" />
          <View style={styles.pillRow}>
            {AVAILS.map((a) => (
              <Pill key={a.key} label={a.label} active={avails.includes(a.key)} onPress={() => toggleAvail(a.key)} />
            ))}
          </View>
      </KeyboardAwareScrollView>

      <View style={styles.saveBar}>
        <Button
          label="Enregistrer"
          onPress={save}
          loading={saving}
          fullWidth
          size="lg"
          testID="edit-save-button"
        />
      </View>
    </Screen>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
      ]}
    >
      <Text
        style={{
          fontFamily: "DMSans-Medium",
          color: active ? colors.primary : colors.textSecondary,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
  photoBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.bg,
  },
  photoHint: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
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
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
