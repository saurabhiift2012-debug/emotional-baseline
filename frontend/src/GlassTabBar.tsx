import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useApp } from "./AppContext";
import { AppText, font, useTheme } from "./ui";

const ICONS: Record<string, any> = {
  index: "sun",
  insights: "compass",
  progress: "trending-up",
  support: "heart",
  me: "user",
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useApp();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  const labels: Record<string, string> = {
    index: t("tab_today"),
    insights: t("tab_insights"),
    progress: t("tab_progress"),
    support: t("tab_support"),
    me: t("tab_me"),
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} testID="glass-tabbar">
      <BlurView
        intensity={scheme === "dark" ? 40 : 60}
        tint={scheme === "dark" ? "dark" : "light"}
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        style={StyleSheet.absoluteFill}
      />
      {/* translucent wash for legibility + a hairline top border */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, opacity: scheme === "dark" ? 0.55 : 0.62 }]} />
      <View style={[styles.hairline, { backgroundColor: colors.border }]} />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const iconName = ICONS[route.name] || "circle";
          const color = focused ? colors.indigo : colors.onSurfaceSecondary;

          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.item}
            >
              <View style={[styles.iconPill, focused && { backgroundColor: colors.tintLav }]}>
                <Feather name={iconName} size={20} color={color} />
              </View>
              <AppText style={[styles.label, { color }, focused && styles.labelActive]}>
                {labels[route.name] ?? route.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    paddingTop: 8,
    overflow: "hidden",
  },
  hairline: { position: "absolute", top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 2 },
  iconPill: { paddingHorizontal: 18, paddingVertical: 4, borderRadius: 999 },
  label: { fontFamily: font.body, fontSize: 11, fontWeight: "500" },
  labelActive: { fontWeight: "700" },
});
