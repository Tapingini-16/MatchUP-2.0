import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar, Platform } from "react-native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider } from "@/src/context/auth";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Push notification handlers — MODULE SCOPE, before any component.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

export default function RootLayout() {
  const router = useRouter();
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    "BarlowCondensed-Bold": require("../assets/fonts/BarlowCondensed-Bold.ttf"),
    "BarlowCondensed-SemiBold": require("../assets/fonts/BarlowCondensed-SemiBold.ttf"),
    "BarlowCondensed-Medium": require("../assets/fonts/BarlowCondensed-Medium.ttf"),
    "DMSans-Regular": require("../assets/fonts/DMSans-Regular.ttf"),
    "DMSans-Medium": require("../assets/fonts/DMSans-Medium.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
    "SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Push notification tap handling — deep-link into the app.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const handleUrl = (url?: string | null) => {
      if (!url) return;
      if (url.startsWith("http")) Linking.openURL(url);
      else router.push(url as any);
    };
    const warm = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data: any = resp.notification.request.content.data || {};
      handleUrl(data.deeplink || data.action_url);
    });
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (!resp) return;
      const data: any = resp.notification.request.content.data || {};
      handleUrl(data.deeplink || data.action_url);
    });
    return () => {
      warm.remove();
    };
  }, [router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#090A0C" }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar barStyle="light-content" backgroundColor="#090A0C" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#090A0C" },
              animation: "fade",
            }}
          />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
