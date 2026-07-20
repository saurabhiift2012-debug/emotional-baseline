import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Platform, AccessibilityInfo, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { spacing, font, T, radius, useTheme, useThemedStyles } from "./ui";
import { Mood, MOOD_COLORS } from "./moods";
import { MoodEmoji } from "./MoodEmoji";
import { Lang } from "./i18n";

const IS_IOS = Platform.OS === "ios";
const THUMB = IS_IOS ? 56 : 60;              // >= 48dp touch target
const TRACK_H = IS_IOS ? 62 : 54;
const CHIP_H = 40;
// Damped, not bouncy.
const SPRING = { damping: 17, stiffness: 210, mass: 0.9 };

type Props = { moods: Mood[]; value: string | null; onChange: (key: string) => void; lang: Lang; pad?: number };

export function MoodSlider({ moods, value, onChange, lang, pad }: Props) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();

  // Respect iOS "Reduce Transparency": swap the glass for a solid high-contrast fill.
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

  const n = moods.length;
  const horizontalPad = pad ?? spacing.xl * 2;
  const trackW = Math.floor(Math.min(width, 460) - horizontalPad);
  const step = n > 1 ? (trackW - THUMB) / (n - 1) : 0;

  const startIdx = value ? Math.max(0, moods.findIndex((m) => m.key === value)) : Math.floor(n / 2);
  const [idx, setIdx] = useState(startIdx < 0 ? 0 : startIdx);
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const tx = useSharedValue(0);
  useEffect(() => { tx.value = withSpring(idx * step, SPRING); }, [idx, step]);

  // Keep in sync if the parent resets the selection (e.g. check-in flow).
  useEffect(() => {
    if (!value) return;
    const vi = moods.findIndex((m) => m.key === value);
    if (vi >= 0 && vi !== idxRef.current) setIdx(vi);
  }, [value]);

  const setFromX = (x: number) => {
    if (step <= 0) return;
    const raw = (x - THUMB / 2) / step;
    const clamped = Math.max(0, Math.min(n - 1, Math.round(raw)));
    if (clamped !== idxRef.current) {
      idxRef.current = clamped;
      setIdx(clamped);
      Haptics.selectionAsync(); // light tick on each value change
    }
  };
  const commit = () => { onChange(moods[idxRef.current].key); };

  const nudge = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(n - 1, idxRef.current + dir));
    if (next !== idxRef.current) {
      idxRef.current = next;
      setIdx(next);
      Haptics.selectionAsync();
    }
    commit();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-14, 14])
    .onBegin((e) => { runOnJS(setFromX)(e.x); })
    .onUpdate((e) => { runOnJS(setFromX)(e.x); })
    .onEnd(() => { runOnJS(commit)(); });

  const tap = Gesture.Tap()
    .maxDuration(400)
    .onEnd((e) => { runOnJS(setFromX)(e.x); runOnJS(commit)(); });

  const gesture = Gesture.Race(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: tx.value + THUMB / 2 }));
  const chipStyle = useAnimatedStyle(() => {
    const cw = 150;
    const raw = tx.value + THUMB / 2 - cw / 2;
    const clamped = Math.max(0, Math.min(Math.max(0, trackW - cw), raw));
    return { transform: [{ translateX: clamped }] };
  });

  const current = moods[idx] || moods[0];
  const label = lang === "hi" ? current.hi : current.en;
  const palette = MOOD_COLORS[current.key] || { from: colors.indigo, to: colors.indigo, accent: colors.indigo };
  const glass = IS_IOS && !reduceTransparency;
  const blurTint = scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight";

  return (
    <View style={[styles.wrap, { width: trackW }]} testID="mood-slider">
      {/* Value chip — ALWAYS a solid, opaque backing (never text floating on glass). */}
      <View style={[styles.chipRow, { height: CHIP_H }]} pointerEvents="none">
        <Animated.View style={[styles.chip, IS_IOS ? styles.chipIOS : styles.chipAndroid, { width: 150 }, chipStyle]}>
          <MoodEmoji mood={current} size={20} />
          <Text style={[styles.chipText, IS_IOS ? styles.chipTextIOS : styles.chipTextAndroid]} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          style={[styles.track, { height: TRACK_H, borderRadius: TRACK_H / 2 }]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Mood"
          accessibilityValue={{ text: label }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === "increment") nudge(1);
            else if (e.nativeEvent.actionName === "decrement") nudge(-1);
          }}
          testID="mood-slider-track"
        >
          {/* --- iOS Liquid Glass track --- */}
          {glass ? (
            <>
              <BlurView intensity={40} tint={blurTint as any} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.22)", borderRadius: TRACK_H / 2 }]} />
              {/* specular highlight on the edges */}
              <LinearGradient
                colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.0)", "rgba(255,255,255,0.18)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: TRACK_H / 2 }]}
              />
              <View style={[StyleSheet.absoluteFill, styles.glassBorder, { borderRadius: TRACK_H / 2 }]} />
            </>
          ) : IS_IOS ? (
            // Reduce Transparency ON → solid high-contrast fill
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSecondary, borderRadius: TRACK_H / 2, borderWidth: 2, borderColor: colors.borderStrong }]} />
          ) : (
            // --- Android Material 3 filled track ---
            <>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceTertiary, borderRadius: TRACK_H / 2 }]} />
              <Animated.View style={[styles.mdFill, { height: TRACK_H, borderRadius: TRACK_H / 2, backgroundColor: colors.indigo }, fillStyle]} />
            </>
          )}

          {/* Stop ticks */}
          <View style={[styles.ticks, { paddingHorizontal: THUMB / 2 }]} pointerEvents="none">
            {moods.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  { backgroundColor: glass ? "rgba(255,255,255,0.5)" : IS_IOS ? colors.onSurfaceSecondary : "rgba(255,255,255,0.55)" },
                  i === idx && { opacity: 0 },
                ]}
              />
            ))}
          </View>

          {/* Thumb / handle */}
          <Animated.View style={[styles.thumb, { width: THUMB, height: THUMB, borderRadius: THUMB / 2 }, thumbStyle]}>
            {glass ? (
              <>
                <BlurView intensity={70} tint={blurTint as any} style={[StyleSheet.absoluteFill, { borderRadius: THUMB / 2 }]} />
                <View style={[StyleSheet.absoluteFill, { borderRadius: THUMB / 2, backgroundColor: "rgba(255,255,255,0.18)" }]} />
                <LinearGradient
                  colors={["rgba(255,255,255,0.7)", "rgba(255,255,255,0.05)"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: THUMB / 2 }]}
                />
                <View style={[StyleSheet.absoluteFill, styles.glassBorder, { borderRadius: THUMB / 2 }]} />
              </>
            ) : IS_IOS ? (
              <View style={[StyleSheet.absoluteFill, { borderRadius: THUMB / 2, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderStrong }]} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.mdThumbFace, { borderRadius: THUMB / 2, backgroundColor: colors.surface, borderColor: colors.indigo }]} />
            )}
            <MoodEmoji mood={current} size={THUMB * 0.56} />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* End labels for orientation */}
      <View style={styles.ends} pointerEvents="none">
        <Text style={styles.endText}>{lang === "hi" ? moods[0].hi : moods[0].en}</Text>
        <Text style={styles.endText}>{lang === "hi" ? moods[n - 1].hi : moods[n - 1].en}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { alignSelf: "center", paddingTop: 4 },
  chipRow: { justifyContent: "center", marginBottom: spacing.sm },
  chip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: CHIP_H,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    // solid opaque shadow lift
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  chipIOS: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipAndroid: { backgroundColor: colors.indigo },
  chipText: { fontFamily: font.body, fontSize: T.base, fontWeight: "700" },
  chipTextIOS: { color: colors.onSurface },
  chipTextAndroid: { color: colors.onSurfaceInverse },
  track: {
    width: "100%",
    justifyContent: "center",
    overflow: "hidden",
  },
  glassBorder: { borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  mdFill: { position: "absolute", left: 0, top: 0 },
  ticks: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tick: { width: 4, height: 4, borderRadius: 2 },
  thumb: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  mdThumbFace: { borderWidth: 3 },
  ends: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, paddingHorizontal: 2 },
  endText: { fontFamily: font.body, fontSize: T.sm, color: colors.onSurfaceSecondary },
});
