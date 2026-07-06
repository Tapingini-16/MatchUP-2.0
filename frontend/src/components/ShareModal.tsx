// Share sheet with visible light card + copy button (fixes the black-on-black bug).
import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/Button";
import { colors, spacing, radius } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
};

export function ShareModal({ visible, onClose, groupId, groupName }: Props) {
  const url =
    typeof window !== "undefined" && (window as any).location
      ? `${(window as any).location.origin}/group/${groupId}`
      : `https://matchup.app/group/${groupId}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    try {
      if (Platform.OS !== "web") {
        await Share.share({ message: `Rejoins-moi sur ${groupName} — ${url}`, url });
      } else if ((navigator as any).share) {
        await (navigator as any).share({ title: groupName, text: `Rejoins-moi sur ${groupName}`, url });
      }
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet} testID="share-modal">
          <View style={styles.grip} />
          <View style={styles.iconWrap}>
            <Ionicons name="share" size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>Partager le groupe</Text>
          <Text style={styles.sub}>Invite tes potes à rejoindre {groupName}</Text>

          {/* LIGHT card — high contrast so link is always readable */}
          <View style={styles.linkCard} testID="share-link-card">
            <View style={{ flex: 1 }}>
              <Text style={styles.linkLabel}>LIEN</Text>
              <Text style={styles.linkText} numberOfLines={1}>
                {url}
              </Text>
            </View>
            <Pressable onPress={copy} style={[styles.copyBtn, copied && { backgroundColor: colors.primary }]} testID="share-copy-button">
              <Ionicons name={copied ? "checkmark" : "copy"} size={18} color={copied ? colors.textOnPrimary : colors.text} />
              <Text style={[styles.copyText, copied && { color: colors.textOnPrimary }]}>{copied ? "Copié" : "Copier"}</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <Button label="Fermer" variant="ghost" onPress={onClose} style={{ flex: 1 } as any} />
            <Button
              label="Partager"
              onPress={nativeShare}
              style={{ flex: 1 } as any}
              testID="share-native-button"
              icon={<Ionicons name="paper-plane" size={16} color={colors.textOnPrimary} />}
            />
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
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  iconWrap: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryDim,
    marginBottom: 12,
  },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 22, color: colors.text, textAlign: "center" },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 20 },
  // Light card — HIGH CONTRAST regardless of theme
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  linkLabel: { fontFamily: "DMSans-Bold", color: "#475569", fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  linkText: { fontFamily: "DMSans-Medium", color: "#0F172A", fontSize: 13 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: "#F0F2F5",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  copyText: { fontFamily: "DMSans-Bold", color: "#0F172A", fontSize: 12 },
});
