import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius, font, T } from "./ui";
import { Mood, GROUP_TINT } from "./moods";
import { Lang } from "./i18n";

function MoodTile({ mood, selected, onPress, lang, size }: { mood: Mood; selected: boolean; onPress: () => void; lang: Lang; size: number }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
          { width: size - 8, height: size - 8, backgroundColor: GROUP_TINT[mood.group] || colors.surfaceSecondary },
          selected && styles.tileSelected,
          anim,
        ]}
      >
        <Text style={{ fontSize: size * 0.42 }}>{mood.emoji}</Text>
      </Animated.View>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {lang === "hi" ? mood.hi : mood.en}
      </Text>
    </Pressable>
  );
}

export function MoodSelector({ moods, value, onChange, lang }: { moods: Mood[]; value: string | null; onChange: (key: string) => void; lang: Lang }) {
  const { width } = useWindowDimensions();
  const cols = 3;
  const gap = spacing.md;
  const tile = Math.floor((Math.min(width, 460) - spacing.xl * 2 - gap * (cols - 1)) / cols);

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
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  tileSelected: { borderColor: colors.amber },
  label: { marginTop: spacing.sm, fontFamily: font.body, fontSize: T.base, color: colors.onSurfaceSecondary },
  labelSelected: { color: colors.onSurface, fontWeight: "600" },
});
