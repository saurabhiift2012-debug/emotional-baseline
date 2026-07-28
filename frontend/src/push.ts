import { Platform } from "react-native";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

// Registers the device's native push token with the backend relay.
// Native-only (push is unavailable on web / Expo Go). Never throws.
export async function registerForPush(userId: string) {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    await fetch(`${BASE}/api/register-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        platform: Platform.OS,
        device_token: tokenResp.data,
      }),
    });
  } catch {
    // permission denied / not a dev build — silently ignore
  }
}
