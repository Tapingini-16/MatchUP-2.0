import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

type Props = {
  children: React.ReactNode;
  edges?: ("top" | "bottom" | "left" | "right")[];
  paddingTop?: boolean;
  testID?: string;
};

export function Screen({ children, edges = ["top", "bottom"], testID }: Props) {
  return (
    <SafeAreaView edges={edges} style={styles.root} testID={testID}>
      {children}
    </SafeAreaView>
  );
}

export function EmptyState({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "BarlowCondensed-Bold",
    fontSize: 22,
    color: colors.text,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
