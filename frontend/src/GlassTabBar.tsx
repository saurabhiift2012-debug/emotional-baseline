import React, { useEffect, useRef, useMemo, useState } from "react";
import { View, Pressable, StyleSheet, Platform, PanResponder, AccessibilityInfo, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useApp } from "./AppContext";
import { AppText, font, spacing, useTheme } from "./ui";

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
const PILL_INSET = 6;     // gap between the handle and item edges
const LENS_H = BAR_H - 12;
const BAR_GAP = 8;        // gap between the pill and the top of the system-nav inset
const FADE_H = 30;        // soft fade above the opaque band
// damped, not bouncy
const SPRING = { damping: 18, stiffness: 200, mass: 0.9 };

// Total vertical space the floating nav occupies. Screens use this for their
// bottom scroll padding so the last row always clears the bar + system inset.
export function useTabBarPadding() {
  const insets = useSafeAreaInsets();
  return insets.bottom + BAR_GAP + BAR_H + spacing.xl;
}

// Opaque, grounded palette (no page show-through).
const PLATE_IOS = "#EDEEF4";      // opaque backing plate (iOS glass sits on this)
const TRACK_ANDROID = "#E7E9F5";  // solid Material 3 track
const ACTIVE = "#414F86";         // active handle + fill
const ACTIVE_TEXT = "#FFFFFF";    // on #414F86 -> ~7:1 (AA)
const INACTIVE_TEXT = "#565A73";  // on the light plate -> ~5.4:1 (AA); grounded from #C4C8DA which fails AA as text

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // iOS "Reduce Transparency" / "Increase Contrast" -> drop the glass sheen for a flat solid plate.
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let mounted = true;
    (AccessibilityInfo as any).isReduceTransparencyEnabled?.()
      .then((v: boolean) => { if (mounted) setReduceTransparency(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.(
      "reduceTransparencyChanged" as any,
      (v: boolean) => setReduceTransparency(!!v)
    );
    return () => { mounted = false; (sub as any)?.remove?.(); };
  }, []);

  const isIOS = Platform.OS === "ios";
  const groundedGlass = isIOS && !reduceTransparency; // frosted sheen ON the opaque plate
  const plateColor = isIOS ? PLATE_IOS : TRACK_ANDROID;

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

  // --- Drag the handle across pages (in addition to tapping) ---
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
  // only a horizontal drag (>6px) claims the gesture and slides the handle.
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

  const cream = colors.surface;
  const bandH = insets.bottom + BAR_GAP + BAR_H + FADE_H;
  const fadeRatio = FADE_H / bandH;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {/* Opaque background band + soft fade: fills below/beside the pill down to the
          bottom so no page content shows through. On Android the system nav icons/gesture
          bar are drawn by the OS on top and remain visible/tappable; the app pill sits
          above the bottom inset. */}
      <View pointerEvents="none" style={[styles.band, { height: bandH }]}>
        <LinearGradient
          colors={[cream + "00", cream, cream]}
          locations={[0, fadeRatio, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[styles.outer, { left: SIDE, right: SIDE, bottom: insets.bottom + BAR_GAP }]} testID="glass-tabbar" pointerEvents="box-none">
      <View style={[styles.plate, { height: BAR_H, borderRadius: RADIUS, backgroundColor: plateColor }]}>
        {/* iOS: frosted-glass sheen painted ON the opaque plate (never on the page). */}
        {groundedGlass ? (
          <>
            <LinearGradient
              colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.06)", "rgba(65,79,134,0.05)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: RADIUS }]}
            />
            <View style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: RADIUS }]} />
          </>
        ) : null}

        {/* sliding solid handle */}
        <Animated.View style={[styles.lens, { width: lensW, height: LENS_H, borderRadius: LENS_H / 2, backgroundColor: ACTIVE }, lensStyle]}>
          {groundedGlass ? (
            <LinearGradient
              colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.02)"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: LENS_H / 2 }]}
            />
          ) : null}
        </Animated.View>

        <View style={styles.row} {...panResponder.panHandlers}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const color = focused ? ACTIVE_TEXT : INACTIVE_TEXT;
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
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  outer: {
    position: "absolute",
    // soft floating shadow (sits on the non-overflow outer view so it isn't clipped)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  plate: {
    width: "100%",
    overflow: "hidden",       // page content clips at the slider edge
    justifyContent: "center",
  },
  rim: { borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  lens: {
    position: "absolute",
    left: 0,
    top: (BAR_H - LENS_H) / 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  row: { flexDirection: "row", alignItems: "center", height: BAR_H },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontFamily: font.body, fontSize: 10.5, fontWeight: "500" },
  labelActive: { fontWeight: "700" },
});
