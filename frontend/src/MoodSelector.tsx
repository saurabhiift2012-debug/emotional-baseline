import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { colors, spacing, font, T } from "./ui";
import { Mood, MOOD_COLORS } from "./moods";
import { MoodEmoji } from "./MoodEmoji";
import { Lang } from "./i18n";

function MoodTile({ mood, selected, onPress, lang, size }: { mood: Mood; selected: boolean; onPress: () => void; lang: Lang; size: number }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const palette = MOOD_COLORS[mood.key] || { from: colors.surfaceSecondary, to: colors.surfaceSecondary, accent: colors.amber };

  const handle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(1.12, { damping: 6, stiffness: 180 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <Pressable
      testID={`mood-tile-${mood.key}`}
      onPress={handle}
      accessibilityLabel={lang === "hi" ? mood.hi : mood.en}
      accessibilityRole="button"
      style={{ width: size, alignItems: "center", marginBottom: spacing.lg }}
    >
      <Animated.View
        style={[
          styles.tile,
          { width: size - 8, height: (size - 8) * 1.18, shadowColor: palette.accent },
          selected && [styles.tileSelected, { shadowOpacity: 0.55 }],
          anim,
        ]}
      >
        <LinearGradient
          colors={[palette.from, palette.to]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.pill, selected && { borderColor: "rgba(255,255,255,0.9)" }]}
        >
          <View style={[styles.halo, { width: size * 0.64, height: size * 0.64, borderRadius: size * 0.32 }]}>
            <MoodEmoji mood={mood} size={size * 0.46} />
          </View>
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {lang === "hi" ? mood.hi : mood.en}
      </Text>
    </Pressable>
  );
}

export function MoodSelector({ moods, value, onChange, lang, pad }: { moods: Mood[]; value: string | null; onChange: (key: string) => void; lang: Lang; pad?: number }) {
  const { width } = useWindowDimensions();
  const cols = 3;
  const gap = spacing.md;
  const horizontalPad = pad ?? spacing.xl * 2;
  const tile = Math.floor((Math.min(width, 460) - horizontalPad - gap * (cols - 1)) / cols);

  return (
    <View style={styles.grid} testID="mood-selector">
      {moods.map((m) => (
        <MoodTile
          key={m.key}
          mood={m}
          size={tile}
          lang={lang}
          selected={value === m.key}
          onPress={() => onChange(m.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  pill: {
    flex: 1,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  halo: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(250,247,242,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  tileSelected: {},
  label: { marginTop: spacing.sm, fontFamily: font.body, fontSize: T.base, color: colors.onSurfaceSecondary },
  labelSelected: { color: colors.onSurface, fontWeight: "600" },
});
