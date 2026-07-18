import React, { useEffect } from "react";
import { View, Pressable, StyleSheet, Platform, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
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

const PILL_W = 60;
const PILL_H = 36;

function TabIcon({ name, focused, color }: { name: any; focused: boolean; color: string }) {
  const scale = useSharedValue(focused ? 1 : 0.92);
  useEffect(() => {
    scale.value = withTiming(focused ? 1.06 : 0.92, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [focused, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Feather name={name} size={20} color={color} />
    </Animated.View>
  );
}

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useApp();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const labels: Record<string, string> = {
    index: t("tab_today"),
    insights: t("tab_insights"),
    progress: t("tab_progress"),
    support: t("tab_support"),
    me: t("tab_me"),
  };

  const n = state.routes.length;
  const itemW = width / n;
  const targetX = state.index * itemW + itemW / 2 - PILL_W / 2;
  const tx = useSharedValue(targetX);

  useEffect(() => {
    tx.value = withTiming(targetX, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [targetX, tx]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 10 }]} testID="glass-tabbar">
      <BlurView
        intensity={Platform.OS === "ios" ? 100 : scheme === "dark" ? 40 : 60}
        tint={Platform.OS === "ios" ? "systemChromeMaterial" : scheme === "dark" ? "dark" : "light"}
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        style={StyleSheet.absoluteFill}
      />
      {/* light legibility wash — iOS system material already handles most of it */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, opacity: Platform.OS === "ios" ? 0.12 : scheme === "dark" ? 0.5 : 0.6 }]} />
      <View style={[styles.hairline, { backgroundColor: colors.border }]} />

      {/* sliding active highlight pill */}
      <Animated.View style={[styles.slidingPill, { width: PILL_W, backgroundColor: colors.tintLav }, pillStyle]} />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
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
              <View style={styles.iconBox}>
                <TabIcon name={ICONS[route.name] || "circle"} focused={focused} color={color} />
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
    paddingTop: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  hairline: { position: "absolute", top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  slidingPill: { position: "absolute", top: 8, left: 0, height: PILL_H, borderRadius: 999 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 2 },
  iconBox: { height: PILL_H, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: font.body, fontSize: 11, fontWeight: "500" },
  labelActive: { fontWeight: "700" },
});
