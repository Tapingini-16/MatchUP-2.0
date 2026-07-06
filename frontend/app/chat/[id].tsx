import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, KeyboardEvents } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import dayjs from "dayjs";
import { Screen } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { ReportModal } from "@/src/components/ReportModal";
import { PollCard } from "@/src/components/PollCard";
import { PollComposer } from "@/src/components/PollComposer";
import { useAuth } from "@/src/context/auth";
import { api } from "@/src/api/client";
import { colors, spacing, radius } from "@/src/theme";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const listRef = useRef<FlatList>(null);

  const openLocation = () => {
    if (!group?.field_location) return;
    const q = encodeURIComponent(group.field_location);
    const url = group.field_lat && group.field_lng
      ? `https://www.google.com/maps/search/?api=1&query=${group.field_lat},${group.field_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    Linking.openURL(url).catch(() => {});
  };

  const pickImage = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    let status = current.status;
    let canAskAgain = current.canAskAgain;
    if (status !== "granted" && canAskAgain) {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      status = req.status;
      canAskAgain = req.canAskAgain;
    }
    if (status !== "granted") {
      Alert.alert(
        "Accès photos requis",
        "Autorise l'accès à ta galerie pour partager une photo dans le chat.",
        canAskAgain
          ? [{ text: "OK" }]
          : [
              { text: "Annuler", style: "cancel" },
              { text: "Ouvrir les réglages", onPress: () => Linking.openSettings() },
            ],
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });
    if (res.canceled || !res.assets[0]?.base64 || !id) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(id, { image: `data:image/jpeg;base64,${res.assets[0].base64}` });
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } finally {
      setSending(false);
    }
  };

  const createPoll = async (poll: { question: string; options: string[] }) => {
    if (!id) return;
    const msg = await api.sendMessage(id, { poll });
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [g, msgs] = await Promise.all([api.getGroup(id), api.getMessages(id)]);
      setGroup(g);
      setMessages(msgs);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (id) api.getMessages(id).then(setMessages).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [id, load]);

  // Scroll to bottom when the keyboard appears — critical UX fix.
  useEffect(() => {
    const sub = KeyboardEvents.addListener("keyboardDidShow", () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => sub.remove();
  }, []);

  const send = async () => {
    if (!text.trim() || !id) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(id, { text: text.trim() });
      setMessages((prev) => [...prev, msg]);
      setText("");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.log(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen edges={["top"]} testID="chat-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} testID="chat-back">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Pressable style={styles.headerInfo} onPress={() => id && router.push(`/group/${id}`)}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {group?.name || "…"}
            </Text>
            <Text style={styles.headerSub}>{group?.members_count || 0} membres</Text>
          </Pressable>
          {group?.field_location && (
            <Pressable style={styles.iconBtn} hitSlop={12} onPress={openLocation} testID="chat-location-button">
              <Ionicons name="navigate" size={18} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.base, gap: 4, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item, index }) => {
              const isMe = item.user_id === user?.id;
              const prev = messages[index - 1];
              const showAvatar = !isMe && (!prev || prev.user_id !== item.user_id);
              return (
                <Pressable
                  onLongPress={() => {
                    if (!isMe) setReportTarget({ id: item.user_id, name: item.user_name });
                  }}
                  style={[styles.msgRow, isMe && { justifyContent: "flex-end" }]}
                  testID={`msg-${item.id}`}
                >
                  {!isMe && (
                    <Pressable
                      onPress={() => router.push(`/profile/${item.user_id}`)}
                      style={{ width: 32, marginRight: 8 }}
                      testID={`msg-avatar-${item.user_id}`}
                    >
                      {showAvatar && <Avatar uri={item.user_photo} name={item.user_name} size={32} />}
                    </Pressable>
                  )}
                  {item.poll ? (
                    <PollCard
                      message={item}
                      userId={user?.id ?? ""}
                      onVoted={(updated) =>
                        setMessages((pv) => pv.map((m) => (m.id === updated.id ? updated : m)))
                      }
                    />
                  ) : item.image ? (
                    <View
                      style={[
                        styles.bubble,
                        isMe
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface },
                        { padding: 4, overflow: "hidden" },
                      ]}
                    >
                      <Image source={{ uri: item.image }} style={styles.msgImage} resizeMode="cover" />
                      {item.text ? (
                        <Text style={[styles.msgText, { padding: 6 }, isMe && { color: colors.textOnPrimary }]}>
                          {item.text}
                        </Text>
                      ) : null}
                      <Text style={[styles.msgTime, { paddingHorizontal: 6, paddingBottom: 4 }, isMe && { color: "rgba(10,15,12,0.6)" }]}>
                        {dayjs(item.created_at).format("HH:mm")}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.bubble,
                        isMe
                          ? { backgroundColor: colors.primary, borderTopRightRadius: 4 }
                          : { backgroundColor: colors.surface, borderTopLeftRadius: 4 },
                      ]}
                    >
                      {!isMe && showAvatar && (
                        <Text style={styles.senderName}>{item.user_name?.split(" ")[0]}</Text>
                      )}
                      <Text style={[styles.msgText, isMe && { color: colors.textOnPrimary }]}>{item.text}</Text>
                      <Text style={[styles.msgTime, isMe && { color: "rgba(10,15,12,0.6)" }]}>
                        {dayjs(item.created_at).format("HH:mm")}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
          <Pressable onPress={pickImage} style={styles.attachBtn} testID="chat-photo-button" hitSlop={8}>
            <Ionicons name="image" size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setShowPoll(true)} style={styles.attachBtn} testID="chat-poll-button" hitSlop={8}>
            <Ionicons name="stats-chart" size={20} color={colors.textSecondary} />
          </Pressable>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            placeholder="Écris un message..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={500}
            blurOnSubmit={false}
            returnKeyType="send"
            onSubmitEditing={() => text.trim() && send()}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
            testID="chat-send-button"
          >
            {sending ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={colors.textOnPrimary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ReportModal
        visible={!!reportTarget}
        targetType="user"
        targetId={reportTarget?.id ?? ""}
        targetName={reportTarget?.name}
        onClose={() => setReportTarget(null)}
      />
      <PollComposer visible={showPoll} onClose={() => setShowPoll(false)} onSubmit={createPoll} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontFamily: "DMSans-Bold", fontSize: 15, color: colors.text },
  headerSub: { fontFamily: "DMSans-Regular", fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  msgRow: { flexDirection: "row", marginVertical: 2, alignItems: "flex-end" },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: "78%",
  },
  senderName: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 11, marginBottom: 2 },
  msgText: { fontFamily: "DMSans-Regular", color: colors.text, fontSize: 14, lineHeight: 19 },
  msgTime: { fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.text,
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtn: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  msgImage: { width: 220, height: 220, borderRadius: 12 },
});
