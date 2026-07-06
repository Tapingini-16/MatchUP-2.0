import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: "DMSans-Medium", fontSize: 11, letterSpacing: 0.3 },
        tabBarIcon: ({ focused, color }) => {
          const iconMap: Record<string, [any, any]> = {
            index: ["home", "home-outline"],
            discover: ["compass", "compass-outline"],
            chat: ["chatbubbles", "chatbubbles-outline"],
            profile: ["person", "person-outline"],
          };
          const [filled, outline] = iconMap[route.name] ?? ["ellipse", "ellipse-outline"];
          return (
            <View style={styles.iconWrap} testID={`tab-icon-${route.name}`}>
              <Ionicons name={focused ? filled : outline} size={24} color={color} />
              {focused && <View style={styles.activeDot} />}
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="discover" options={{ title: "Explorer" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", justifyContent: "center" },
  activeDot: {
    position: "absolute",
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
