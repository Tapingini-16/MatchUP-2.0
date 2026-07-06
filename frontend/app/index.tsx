import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/auth";
import { colors } from "@/src/theme";

export default function Index() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (user) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/onboarding");
    }
  }, [ready, user, router]);

  return (
    <View style={styles.root}>
      <Text style={styles.logo}>PITCHFINDER</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontFamily: "BarlowCondensed-Bold",
    fontSize: 34,
    color: colors.primary,
    letterSpacing: 4,
  },
});
