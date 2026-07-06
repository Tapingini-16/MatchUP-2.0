// Report bottom-sheet — reusable for user or group targets.
import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/Button";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

const REASONS = [
  { key: "spam", label: "Spam / publicité" },
  { key: "harassment", label: "Harcèlement / insultes" },
  { key: "inappropriate", label: "Contenu inapproprié" },
  { key: "fake", label: "Faux profil / arnaque" },
  { key: "other", label: "Autre" },
];

type Props = {
  visible: boolean;
  targetType: "user" | "group";
  targetId: string;
  targetName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function ReportModal({ visible, targetType, targetId, targetName, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setReason(null);
    setMessage("");
    setDone(false);
    setBusy(false);
  };

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await api.report({ target_type: targetType, target_id: targetId, reason, message: message.trim() || undefined });
      setDone(true);
      onSubmitted?.();
      setTimeout(() => {
        reset();
        onClose();
      }, 1400);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet} testID="report-modal">
          <View style={styles.grip} />
          {done ? (
            <View style={styles.doneWrap}>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={32} color={colors.textOnPrimary} />
              </View>
              <Text style={styles.doneTitle}>Signalement envoyé</Text>
              <Text style={styles.doneSub}>Merci, notre équipe va vérifier.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Signaler {targetType === "user" ? "ce joueur" : "ce groupe"}</Text>
              {targetName ? <Text style={styles.sub}>{targetName}</Text> : null}
              <Text style={styles.label}>Raison</Text>
              <View style={styles.reasons}>
                {REASONS.map((r) => {
                  const active = reason === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => setReason(r.key)}
                      style={[styles.reason, active && { borderColor: colors.danger, backgroundColor: "rgba(255,90,95,0.14)" }]}
                      testID={`report-reason-${r.key}`}
                    >
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={active ? colors.danger : colors.textSecondary}
                      />
                      <Text style={[styles.reasonText, active && { color: colors.danger }]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Détails (optionnel)</Text>
              <TextInput
                testID="report-message-input"
                value={message}
                onChangeText={setMessage}
                placeholder="Explique la situation..."
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
                maxLength={300}
              />

              <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                <Button label="Annuler" variant="ghost" onPress={onClose} style={{ flex: 1 } as any} />
                <Button
                  label="Signaler"
                  variant="danger"
                  onPress={submit}
                  loading={busy}
                  disabled={!reason}
                  style={{ flex: 1 } as any}
                  testID="report-submit-button"
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
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
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13, marginTop: 2, marginBottom: 8 },
  label: {
    fontFamily: "DMSans-Bold",
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 8,
  },
  reasons: { gap: 6 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonText: { fontFamily: "DMSans-Medium", color: colors.text, fontSize: 14 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    color: colors.text,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
  },
  doneWrap: { alignItems: "center", paddingVertical: 24 },
  doneIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  doneTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text },
  doneSub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, marginTop: 4 },
});
