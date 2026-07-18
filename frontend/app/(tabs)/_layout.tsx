import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useApp } from "@/src/AppContext";
import { useTheme } from "@/src/ThemeContext";
import { font } from "@/src/theme";

const ICONS: Record<string, any> = {
  index: "sun",
  insights: "compass",
  progress: "trending-up",
  support: "heart",
  me: "user",
};

export default function TabsLayout() {
  const { t } = useApp();
  const { colors } = useTheme();
  const labels: Record<string, string> = {
    index: t("tab_today"),
    insights: t("tab_insights"),
    progress: t("tab_progress"),
    support: t("tab_support"),
    me: t("tab_me"),
  };
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.indigo,
        tabBarInactiveTintColor: colors.onSurfaceSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 86 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
        tabBarLabelStyle: { fontFamily: font.body, fontSize: 11, fontWeight: "500" },
        tabBarLabel: labels[route.name] ?? route.name,
        tabBarIcon: ({ color, size }) => (
          <Feather name={ICONS[route.name] || "circle"} size={size - 2} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="support" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
