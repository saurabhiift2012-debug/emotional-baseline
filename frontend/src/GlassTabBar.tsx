import React, { useEffect, useRef, useMemo } from "react";
import { View, Pressable, StyleSheet, Platform, PanResponder, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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

const SIDE = 14;          // floating margin from screen edges
const BAR_H = 60;         // capsule height
const RADIUS = BAR_H / 2; // full capsule
const PILL_INSET = 6;     // gap between the glass lens and item edges
const LENS_H = BAR_H - 12;
// damped, not bouncy
const SPRING = { damping: 18, stiffness: 200, mass: 0.9 };

function TabIcon({ name, focused, color }: { name: any; focused: boolean; color: string }) {
  const scale = useSharedValue(focused ? 1.06 : 0.94);
  useEffect(() => {
    scale.value = withTiming(focused ? 1.08 : 0.94, { duration: 240, easing: Easing.out(Easing.cubic) });
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
  const dark = scheme === "dark";

  const labels: Record<string, string> = {
    index: t("tab_today"),
    insights: t("tab_insights"),
    progress: t("tab_progress"),
    support: t("tab_support"),
    me: t("tab_me"),
  };

  const n = state.routes.length;
  const barW = width - SIDE * 2;
  const itemW = barW / n;
  const lensW = itemW - PILL_INSET * 2;
  const targetX = state.index * itemW + PILL_INSET;
  const tx = useSharedValue(targetX);

  useEffect(() => {
    tx.value = withSpring(targetX, SPRING);
  }, [targetX, tx]);

  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  // --- Drag the glass lens across tabs (in addition to tapping) ---
  const minX = PILL_INSET;
  const maxX = (n - 1) * itemW + PILL_INSET;
  const dragIdxRef = useRef(state.index);

  const navigateTo = (idx: number) => {
    const route = state.routes[idx];
    if (idx !== state.index) {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!event.defaultPrevented) navigation.navigate(route.name);
    }
  };
  const onDragStart = () => { dragIdxRef.current = state.index; };
  const onDragMove = (x: number) => {
    const L = Math.max(minX, Math.min(maxX, x - lensW / 2));
    tx.value = L;
    const idx = Math.max(0, Math.min(n - 1, Math.round((L - PILL_INSET) / itemW)));
    if (idx !== dragIdxRef.current) {
      dragIdxRef.current = idx;
      Haptics.selectionAsync();
    }
  };
  const onDragEnd = () => {
    const idx = dragIdxRef.current;
    tx.value = withSpring(idx * itemW + PILL_INSET, SPRING);
    navigateTo(idx);
  };

  // PanResponder: taps fall through to the Pressables (keeps tap + a11y);
  // only a horizontal drag (>6px) claims the gesture and slides the lens.
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.1,
    onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.1,
    onPanResponderGrant: onDragStart,
    onPanResponderMove: (e) => onDragMove(e.nativeEvent.pageX - SIDE),
    onPanResponderRelease: onDragEnd,
    onPanResponderTerminate: onDragEnd,
  }), [state.index, itemW, n, lensW, minX, maxX]);

  // Liquid Glass tint values
  const blurTint = Platform.OS === "ios"
    ? (dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight")
    : (dark ? "dark" : "light");
  const blurIntensity = Platform.OS === "ios" ? 75 : dark ? 55 : 85;

  return (
    <View style={[styles.outer, { left: SIDE, right: SIDE, bottom: insets.bottom + 8 }]} testID="glass-tabbar" pointerEvents="box-none">
      <View style={[styles.glass, { height: BAR_H, borderRadius: RADIUS }]}>
        <BlurView
          intensity={blurIntensity}
          tint={blurTint as any}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />
        {/* legibility wash — keeps text/icons readable; kept light so the glass reads translucent, not white */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "#15120D" : "#FFFFFF", opacity: dark ? 0.24 : 0.14, borderRadius: RADIUS }]} />
        {/* top specular highlight (edge sheen) */}
        <LinearGradient
          colors={dark
            ? ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0.05)"]
            : ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0.10)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: RADIUS }]}
        />
        {/* crisp glass rim */}
        <View style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: RADIUS, borderColor: dark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.7)" }]} />

        {/* sliding refractive "lens" behind the active tab */}
        <Animated.View style={[styles.lens, { width: lensW, height: LENS_H, borderRadius: LENS_H / 2 }, lensStyle]}>
          <BlurView
            intensity={Platform.OS === "ios" ? 30 : 24}
            tint={blurTint as any}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
            style={[StyleSheet.absoluteFill, { borderRadius: LENS_H / 2 }]}
          />
          <View style={[StyleSheet.absoluteFill, { borderRadius: LENS_H / 2, backgroundColor: dark ? "rgba(148,167,220,0.28)" : "rgba(255,255,255,0.55)" }]} />
          <LinearGradient
            colors={dark
              ? ["rgba(255,255,255,0.28)", "rgba(255,255,255,0.04)"]
              : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.15)"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: LENS_H / 2 }]}
          />
          <View style={[StyleSheet.absoluteFill, { borderRadius: LENS_H / 2, borderWidth: 1, borderColor: dark ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)" }]} />
        </Animated.View>

        <View style={styles.row} {...panResponder.panHandlers}>
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
                <TabIcon name={ICONS[route.name] || "circle"} focused={focused} color={color} />
                <AppText style={[styles.label, { color }, focused && styles.labelActive]} numberOfLines={1}>
                  {labels[route.name] ?? route.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    // soft floating shadow (not clipped — sits on the non-overflow outer view)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  glass: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "center",
  },
  rim: { borderWidth: 1 },
  lens: {
    position: "absolute",
    left: 0,
    top: (BAR_H - LENS_H) / 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  row: { flexDirection: "row", alignItems: "center", height: BAR_H },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontFamily: font.body, fontSize: 10.5, fontWeight: "500" },
  labelActive: { fontWeight: "700" },
});
