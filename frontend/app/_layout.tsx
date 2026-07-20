import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts } from "expo-font";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AppProvider, useApp } from "@/src/AppContext";
import { ThemeProvider, useTheme } from "@/src/ThemeContext";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function UrgentHelpLink() {
  const { colors } = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  // Hide on the crisis screen and the auth/onboarding flow.
  const seg = segments.join("/");
  if (seg.includes("crisis") || seg.includes("login") || seg.includes("register") || seg.includes("onboarding") || seg === "") {
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

function ThemedStack() {
  const { colors, scheme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Screen name="checkin" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="story" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="crisis" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      <UrgentHelpLink />
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
});
