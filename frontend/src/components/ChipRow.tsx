import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/src/theme";

export type ChipItem = { key: string; label: string; color?: string };

type Props = {
  items: ChipItem[];
  selected: string;
  onSelect: (key: string) => void;
  testID?: string;
};

// STICKY horizontal filter chip row — chips never wrap, no size change on select.
// Row height 56 · chip height 36 · flexShrink:0
export function ChipRow({ items, selected, onSelect, testID }: Props) {
  return (
    <View style={styles.row} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((it) => {
          const active = it.key === selected;
          return (
            <Pressable
              key={it.key}
              testID={`chip-${it.key}`}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(it.key);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryMuted : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              {it.color && (
                <View style={[styles.dot, { backgroundColor: it.color }]} />
              )}
              <Text
                style={{
                  color: active ? colors.primary : colors.textSecondary,
                  fontFamily: "DMSans-Medium",
                  fontSize: 13,
                }}
              >
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 56, justifyContent: "center" },
  content: { paddingHorizontal: spacing.base, gap: 8, alignItems: "center" },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: spacing.base,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
});
