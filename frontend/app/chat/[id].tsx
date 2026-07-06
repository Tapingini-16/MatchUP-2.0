import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Screen } from "@/src/components/Screen";
import { Avatar } from "@/src/components/Avatar";
import { ReportModal } from "@/src/components/ReportModal";
import { useAuth } from "@/src/context/auth";
import { api } from "@/src/api/client";
import { colors, spacing, radius, type as t } from "@/src/theme";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const listRef = useRef<FlatList>(null);

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

  const send = async () => {
    if (!text.trim() || !id) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(id, text.trim());
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
    <Screen edges={["top", "bottom"]} testID="chat-screen">
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
          <Pressable style={styles.iconBtn} hitSlop={12}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.base, gap: 4 }}
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
                    <View style={{ width: 32, marginRight: 8 }}>
                      {showAvatar && <Avatar uri={item.user_photo} name={item.user_name} size={32} />}
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMe
                        ? { backgroundColor: colors.primary, borderTopRightRadius: 4 }
                        : { backgroundColor: colors.surface, borderTopLeftRadius: 4 },
                    ]}
                  >
                    {!isMe && showAvatar && <Text style={styles.senderName}>{item.user_name.split(" ")[0]}</Text>}
                    <Text style={[styles.msgText, isMe && { color: colors.textOnPrimary }]}>{item.text}</Text>
                    <Text style={[styles.msgTime, isMe && { color: "rgba(10,15,12,0.6)" }]}>
                      {dayjs(item.created_at).format("HH:mm")}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            placeholder="Écris un message..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={500}
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
    padding: spacing.md,
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
});
