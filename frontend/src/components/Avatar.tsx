import React from "react";
import { Image, StyleSheet, View, Text } from "react-native";
import { colors, radius } from "@/src/theme";

type Props = {
  uri?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
  verified?: boolean;
};

export function Avatar({ uri, name, size = 48, online, verified }: Props) {
  const initials = (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text
            style={{
              color: colors.text,
              fontFamily: "BarlowCondensed-Bold",
              fontSize: size * 0.4,
            }}
          >
            {initials}
          </Text>
        )}
      </View>
      {online && (
        <View
          style={[
            styles.online,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              right: 0,
              bottom: 0,
              borderWidth: size * 0.05,
            },
          ]}
        />
      )}
      {verified && (
        <View
          style={[
            styles.verified,
            {
              width: size * 0.34,
              height: size * 0.34,
              borderRadius: size * 0.17,
            },
          ]}
        >
          <Text style={{ color: colors.textOnPrimary, fontSize: size * 0.2, fontWeight: "900" }}>
            ✓
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  online: {
    position: "absolute",
    backgroundColor: colors.primary,
    borderColor: colors.bg,
  },
  verified: {
    position: "absolute",
    right: -2,
    top: -2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
