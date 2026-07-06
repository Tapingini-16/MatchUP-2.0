import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, type as t } from "@/src/theme";

export default function SignIn() {
  const router = useRouter();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("demo@pitchfinder.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Connexion impossible");
    }
  };

  return (
    <Screen testID="signin-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={{ marginTop: 8, marginBottom: spacing.xl }}>
            <Text style={styles.brand}>PITCHFINDER</Text>
            <Text style={styles.heading}>Bon retour sur le terrain</Text>
            <Text style={styles.sub}>Connecte-toi pour retrouver ton équipe</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="signin-email-input"
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
            <View style={styles.inputRow}>
              <TextInput
                testID="signin-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eye} hitSlop={12}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox} testID="signin-error">
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            label="Se connecter"
            onPress={submit}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.lg }}
            testID="signin-submit-button"
          />

          <Pressable onPress={() => router.replace("/(auth)/sign-up")} style={{ marginTop: spacing.xl }}>
            <Text style={styles.footer}>
              Pas encore de compte ?{" "}
              <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>Créer un compte</Text>
            </Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Ionicons name="flash" size={14} color={colors.primary} />
            <Text style={styles.demoText}>
              Compte démo pré-rempli : <Text style={{ color: colors.text }}>demo@pitchfinder.app</Text>
            </Text>
          </View>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  eye: { padding: spacing.md },
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
  footer: { color: colors.textSecondary, textAlign: "center", fontFamily: "DMSans-Medium" },
  demoBox: {
    marginTop: spacing.xxl,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoText: { color: colors.textSecondary, fontFamily: "DMSans-Regular", fontSize: 12, flex: 1 },
});
