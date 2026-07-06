import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { colors, spacing, type as t } from "@/src/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    key: "1",
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200",
    tag: "COMMUNAUTÉ LOCALE",
    title: "Trouve ton équipe près de chez toi",
    subtitle: "Découvre des groupes de foot amateur autour de toi et rejoins la communauté en quelques secondes.",
  },
  {
    key: "2",
    image: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1200",
    tag: "ORGANISATION",
    title: "Des matchs sans galère",
    subtitle: "Calendrier, composition des équipes, chat de groupe : tout ce qu'il faut pour jouer.",
  },
  {
    key: "3",
    image: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1200",
    tag: "PROGRESSE",
    title: "Ton profil de joueur",
    subtitle: "Stats, badges, réputation. Construis ta légende sur le terrain, match après match.",
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);
  const router = useRouter();

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      ref.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      router.replace("/(auth)/sign-up");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="onboarding-screen">
      <FlatList
        ref={ref}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        keyExtractor={(it) => it.key}
        renderItem={({ item }) => (
          <ImageBackground source={{ uri: item.image }} style={{ width, height: "100%" }} resizeMode="cover">
            <LinearGradient
              colors={["rgba(9,10,12,0.25)", "rgba(9,10,12,0.6)", "rgba(9,10,12,0.98)"]}
              locations={[0, 0.5, 0.9]}
              style={StyleSheet.absoluteFillObject}
            />
            <Screen edges={["top", "bottom"]}>
              <View style={styles.top}>
                <Text style={styles.brand}>PITCHFINDER</Text>
                <Pressable
                  onPress={() => router.replace("/(auth)/sign-in")}
                  testID="onboarding-skip"
                  hitSlop={12}
                >
                  <Text style={styles.skip}>Passer</Text>
                </Pressable>
              </View>
              <View style={styles.bottom}>
                <Text style={styles.tag}>{item.tag}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </Screen>
          </ImageBackground>
        )}
      />

      <View style={styles.pinned} pointerEvents="box-none">
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? colors.primary : colors.borderStrong,
                  width: i === index ? 24 : 6,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.actions}>
          <Button
            label={index === SLIDES.length - 1 ? "Créer un compte" : "Suivant"}
            onPress={goNext}
            fullWidth
            size="lg"
            testID="onboarding-next-button"
            icon={<Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />}
          />
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            style={{ paddingVertical: 12 }}
            testID="onboarding-signin-link"
          >
            <Text style={styles.signInLink}>
              Déjà un compte ? <Text style={{ color: colors.primary }}>Se connecter</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontFamily: "BarlowCondensed-Bold",
    color: colors.primary,
    fontSize: 18,
    letterSpacing: 3,
  },
  skip: { color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 14 },
  bottom: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingBottom: 230,
  },
  tag: { ...t.overline, color: colors.primary, marginBottom: spacing.md },
  title: { ...t.hero, color: colors.text, marginBottom: spacing.md },
  subtitle: { ...t.body, color: colors.textSecondary, maxWidth: "94%" },
  pinned: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: spacing.lg },
  dot: { height: 6, borderRadius: 3 },
  actions: { gap: spacing.sm },
  signInLink: { textAlign: "center", color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 14 },
});
