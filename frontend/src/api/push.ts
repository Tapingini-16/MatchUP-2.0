// Push notification registration — call after login on every app open.
// No-op on web (expo-notifications APIs crash on web).
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { api } from "@/src/api/client";

export async function registerForPush(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    if (!tokenResp?.data) return;
    await api.registerPush(Platform.OS, tokenResp.data);
  } catch (e) {
    // Push failure must never block the app
    console.log("push register skipped:", e);
  }
}
