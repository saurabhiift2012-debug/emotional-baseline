import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, LogBox, Platform, Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts } from "expo-font";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AppProvider, useApp } from "@/src/AppContext";
import { ThemeProvider, useTheme } from "@/src/ThemeContext";
import { MoodGate } from "@/src/MoodGate";
import { Logo } from "@/src/Logo";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

// Push: foreground display behaviour (module scope, native only).
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
// Push: Android channel (module scope, before any notification arrives).
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

function UrgentHelpLink() {
  const { colors } = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  // Show ONLY on the Today, Insights, Progress and Me tabs.
  // (Hidden on Support — it has its own emergency section — and everywhere else.)
  const inTabs = segments.includes("(tabs)");
  const last = segments[segments.length - 1] || "";
  const allowed = inTabs && ["(tabs)", "index", "insights", "progress", "me"].includes(last);
  if (!allowed) {
    return null;
  }
  return (
    <Pressable
      testID="urgent-help-link"
      onPress={() => router.push("/crisis")}
      style={[styles.pill, { top: insets.top + 6, backgroundColor: colors.rose }]}
      hitSlop={8}
    >
      <Feather name="life-buoy" size={13} color="#FFFFFF" />
      <Text style={styles.pillText}>{t("need_urgent_help")}</Text>
    </Pressable>
  );
}

function BrandSplash() {
  const { colors } = useTheme();
  const [gone, setGone] = useState(false);
  const opacity = useSharedValue(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 }, (fin) => { if (fin) runOnJS(setGone)(true); });
    }, 850);
    return () => clearTimeout(timer);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.splash, { backgroundColor: colors.surface }, style]}>
      <Logo size={128} />
    </Animated.View>
  );
}

function ThemedStack() {
  const { colors, scheme } = useTheme();
  const router = useRouter();

  // Push tap handling (warm + cold start) and denied-permission weekly nudge.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const routeFrom = (data: any) => {
      const url = data?.deeplink || data?.action_url;
      if (!url) return;
      url.startsWith("http") ? Linking.openURL(url) : router.push(url);
    };
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFrom(response?.notification?.request?.content?.data || {});
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeFrom(response.notification.request.content.data || {});
    });
    (async () => {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status !== "denied" || canAskAgain) return;
      const lastNudge = await AsyncStorage.getItem("pushNudgeAt");
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (lastNudge && Date.now() - Number(lastNudge) <= oneWeek) return;
      Alert.alert(
        "Turn on notifications?",
        "Get instant updates when a psychologist accepts, declines, or reschedules your session.",
        [
          { text: "Later", style: "cancel", onPress: () => AsyncStorage.setItem("pushNudgeAt", String(Date.now())) },
          { text: "Open Settings", onPress: () => { AsyncStorage.setItem("pushNudgeAt", String(Date.now())); Linking.openSettings(); } },
        ]
      );
    })();
    return () => { tapSub.remove(); };
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Screen name="checkin" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="story" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="crisis" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      <UrgentHelpLink />
      <MoodGate />
      <BrandSplash />
    </View>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    Fraunces: require("../assets/fonts/Fraunces.ttf"),
    DMSans: require("../assets/fonts/DMSans.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <AppProvider>
              <ThemedStack />
            </AppProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    zIndex: 100,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  pillText: { color: "#FFFFFF", fontWeight: "700", fontSize: 11 },
  splash: { alignItems: "center", justifyContent: "center", zIndex: 200 },
});
