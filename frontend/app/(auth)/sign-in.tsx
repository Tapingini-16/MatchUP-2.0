import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth";
import { colors, spacing, radius, type as t } from "@/src/theme";

export default function SignIn() {
  const router = useRouter();
  const { signIn, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState("demo@matchup.app");
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
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        style={{ flex: 1 }}
      >
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={{ marginTop: 8, marginBottom: spacing.xl }}>
            <Text style={styles.brand}>MATCHUP</Text>
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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={async () => {
              try {
                await signInWithGoogle();
                router.replace("/(tabs)");
              } catch (e: any) {
                setError(e.message || "Google Auth impossible");
              }
            }}
            style={styles.googleBtn}
            testID="signin-google-button"
          >
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={styles.googleText}>Continuer avec Google</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/(auth)/sign-up")} style={{ marginTop: spacing.xl }}>
            <Text style={styles.footer}>
              Pas encore de compte ?{" "}
              <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>Créer un compte</Text>
            </Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Ionicons name="flash" size={14} color={colors.primary} />
            <Text style={styles.demoText}>
              Compte démo pré-rempli : <Text style={{ color: colors.text }}>demo@matchup.app</Text>
            </Text>
          </View>
      </KeyboardAwareScrollView>
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: "DMSans-Medium", color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  googleText: { fontFamily: "DMSans-Bold", color: colors.text, fontSize: 15 },
});
