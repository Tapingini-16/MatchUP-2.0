// Create-poll bottom sheet — used from chat.
import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/Button";
import { colors, spacing, radius } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (poll: { question: string; options: string[] }) => Promise<void>;
};

export function PollComposer({ visible, onClose, onSubmit }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const setOpt = (i: number, v: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  };

  const submit = async () => {
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || clean.length < 2) return;
    setBusy(true);
    try {
      await onSubmit({ question: question.trim(), options: clean });
      setQuestion("");
      setOptions(["", ""]);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet} testID="poll-composer">
          <View style={styles.grip} />
          <Text style={styles.title}>Créer un sondage</Text>
          <Text style={styles.sub}>Vote sur la date, l&apos;heure, le terrain…</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Question</Text>
            <TextInput
              testID="poll-question-input"
              value={question}
              onChangeText={setQuestion}
              placeholder="Quel jour pour le prochain match ?"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={140}
              blurOnSubmit={false}
              returnKeyType="next"
            />
            <Text style={styles.label}>Options</Text>
            {options.map((opt, i) => (
              <View key={i} style={styles.optRow}>
                <TextInput
                  testID={`poll-opt-${i}`}
                  value={opt}
                  onChangeText={(v) => setOpt(i, v)}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1 }]}
                  maxLength={60}
                  blurOnSubmit={false}
                />
                {options.length > 2 && (
                  <Pressable onPress={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={10}>
                    <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            ))}
            {options.length < 6 && (
              <Pressable
                onPress={() => setOptions((prev) => [...prev, ""])}
                style={styles.addOpt}
                testID="poll-add-option"
              >
                <Ionicons name="add-circle" size={18} color={colors.primary} />
                <Text style={styles.addOptText}>Ajouter une option</Text>
              </Pressable>
            )}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button label="Annuler" variant="ghost" onPress={onClose} style={{ flex: 1 } as any} />
            <Button label="Créer" onPress={submit} loading={busy} style={{ flex: 1 } as any} testID="poll-submit" />
          </View>
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
    maxHeight: "88%",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  label: {
    fontFamily: "DMSans-Bold",
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    fontFamily: "DMSans-Medium",
    fontSize: 14,
  },
  optRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  addOpt: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addOptText: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 13 },
});
