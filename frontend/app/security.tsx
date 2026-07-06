// Security center — change password + email/phone/MFA verification (dev accepts 000000).
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { useAuth } from "@/src/context/auth";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

type OtpKind = "email" | "phone" | "mfa";

export default function Security() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  const [otpKind, setOtpKind] = useState<OtpKind | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);

  const requestOtp = async (kind: OtpKind) => {
    setOtpKind(kind);
    setOtpMsg("Code envoyé (utilise 000000 en dev)");
    try {
      await api.requestOtp(kind);
    } catch (e: any) {
      setOtpMsg(e.message || "Erreur");
    }
  };

  const verify = async () => {
    if (!otpKind) return;
    setOtpBusy(true);
    setOtpMsg(null);
    try {
      await api.verifyOtp(otpCode, otpKind);
      setOtpMsg("Vérifié ✓");
      setOtpKind(null);
      setOtpCode("");
      await refresh();
    } catch (e: any) {
      setOtpMsg(e.message || "Code invalide");
    } finally {
      setOtpBusy(false);
    }
  };

  const submitPwd = async () => {
    setPwdBusy(true);
    setPwdMsg(null);
    try {
      await api.changePassword(cur, nw);
      setPwdMsg("Mot de passe mis à jour ✓");
      setCur("");
      setNw("");
    } catch (e: any) {
      setPwdMsg(e.message || "Erreur");
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <Screen testID="security-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Sécurité</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        style={{ flex: 1 }}
      >
          {/* Verifications */}
          <Text style={styles.section}>Vérifications</Text>
          <View style={styles.card}>
            <VerifyRow
              icon="mail"
              label="Email vérifié"
              done={!!(user as any)?.email_verified}
              onVerify={() => requestOtp("email")}
              testID="verify-email"
            />
            <View style={styles.sep} />
            <VerifyRow
              icon="phone-portrait"
              label="Téléphone vérifié"
              done={!!(user as any)?.phone_verified}
              onVerify={() => requestOtp("phone")}
              testID="verify-phone"
            />
            <View style={styles.sep} />
            <VerifyRow
              icon="shield-checkmark"
              label="Double authentification (MFA)"
              done={!!(user as any)?.mfa_enabled}
              onVerify={() => requestOtp("mfa")}
              testID="verify-mfa"
            />
          </View>

          {otpKind && (
            <View style={styles.otpCard} testID="otp-card">
              <Text style={styles.otpTitle}>Entre le code à 6 chiffres</Text>
              <Text style={styles.otpSub}>En développement, utilise <Text style={{ color: colors.primary, fontFamily: "DMSans-Bold" }}>000000</Text></Text>
              <TextInput
                testID="otp-input"
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.otpInput}
                blurOnSubmit={false}
              />
              {otpMsg && <Text style={styles.msg}>{otpMsg}</Text>}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button label="Annuler" variant="ghost" onPress={() => { setOtpKind(null); setOtpCode(""); setOtpMsg(null); }} style={{ flex: 1 } as any} />
                <Button label="Vérifier" onPress={verify} loading={otpBusy} style={{ flex: 1 } as any} testID="otp-submit" />
              </View>
            </View>
          )}

          {/* Password change */}
          <Text style={styles.section}>Mot de passe</Text>
          <View style={styles.card}>
            <Text style={styles.lbl}>Mot de passe actuel</Text>
            <TextInput
              testID="cur-pwd-input"
              value={cur}
              onChangeText={setCur}
              secureTextEntry
              style={styles.input}
              blurOnSubmit={false}
              placeholder="********"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.lbl}>Nouveau mot de passe</Text>
            <TextInput
              testID="new-pwd-input"
              value={nw}
              onChangeText={setNw}
              secureTextEntry
              style={styles.input}
              blurOnSubmit={false}
              placeholder="au moins 6 caractères"
              placeholderTextColor={colors.textMuted}
            />
            {pwdMsg && <Text style={styles.msg}>{pwdMsg}</Text>}
            <Button
              label="Changer le mot de passe"
              onPress={submitPwd}
              loading={pwdBusy}
              disabled={!cur || nw.length < 6}
              fullWidth
              testID="pwd-submit"
              style={{ marginTop: 8 } as any}
            />
          </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function VerifyRow({ icon, label, done, onVerify, testID }: any) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={done ? colors.primary : colors.textSecondary} />
      </View>
      <Text style={[styles.rowLabel, done && { color: colors.primary }]}>{label}</Text>
      {done ? (
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={13} color={colors.textOnPrimary} />
        </View>
      ) : (
        <Pressable onPress={onVerify} style={styles.verifyBtn} testID={testID}>
          <Text style={styles.verifyBtnText}>Vérifier</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 20, color: colors.text },
  section: { fontFamily: "DMSans-Bold", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: 8, marginLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.base, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  rowIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontFamily: "DMSans-Medium", color: colors.text, fontSize: 14 },
  verifyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary },
  verifyBtnText: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 12 },
  doneBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  otpCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, padding: spacing.base, marginBottom: 12 },
  otpTitle: { fontFamily: "BarlowCondensed-Bold", color: colors.text, fontSize: 18 },
  otpSub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 12 },
  otpInput: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 22, textAlign: "center", letterSpacing: 8, color: colors.text, fontFamily: "SpaceMono-Regular" },
  lbl: { fontFamily: "DMSans-Bold", color: colors.textSecondary, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, color: colors.text, fontFamily: "DMSans-Medium", fontSize: 15 },
  msg: { fontFamily: "DMSans-Medium", color: colors.textSecondary, fontSize: 12, marginTop: 8 },
});
