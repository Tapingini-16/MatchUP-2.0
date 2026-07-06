import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, type as t } from "@/src/theme";

export default function SignUp() {
  const router = useRouter();
  const { signUp, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Ton nom doit contenir au moins 2 caractères");
    if (password.length < 6) return setError("Ton mot de passe doit faire au moins 6 caractères");
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Impossible de créer le compte");
    }
  };

  return (
    <Screen testID="signup-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={{ marginTop: 8, marginBottom: spacing.xl }}>
            <Text style={styles.brand}>PITCHFINDER</Text>
            <Text style={styles.heading}>Rejoins le mouvement</Text>
            <Text style={styles.sub}>Construis ton profil de joueur en 30 secondes</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Prénom & nom</Text>
            <TextInput
              testID="signup-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Alex Martin"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="signup-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="joueur@exemple.fr"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              testID="signup-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="Au moins 6 caractères"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              secureTextEntry
            />
          </View>

          {error && (
            <View style={styles.errorBox} testID="signup-error">
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            label="Créer mon compte"
            onPress={submit}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.lg }}
            testID="signup-submit-button"
          />

          <Text style={styles.terms}>
            En continuant tu acceptes nos <Text style={{ color: colors.primary }}>Conditions</Text> et notre{" "}
            <Text style={{ color: colors.primary }}>Politique de confidentialité</Text>.
          </Text>

          <Pressable onPress={() => router.replace("/(auth)/sign-in")} style={{ marginTop: spacing.xl }}>
            <Text style={styles.footer}>
              Déjà un compte ?{" "}
              <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>Se connecter</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: spacing.md, flexGrow: 1 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  brand: { fontFamily: "BarlowCondensed-Bold", color: colors.primary, letterSpacing: 3, fontSize: 14, marginBottom: 12 },
  heading: { ...t.h1, color: colors.text, marginBottom: 6 },
  sub: { ...t.body, color: colors.textSecondary },
  field: { marginBottom: spacing.base },
  label: { ...t.caption, color: colors.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    fontFamily: "DMSans-Medium",
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
    marginTop: 8,
  },
  errorText: { color: colors.danger, fontFamily: "DMSans-Medium", fontSize: 13, flex: 1 },
  terms: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: spacing.base, lineHeight: 18 },
  footer: { color: colors.textSecondary, textAlign: "center", fontFamily: "DMSans-Medium" },
});
