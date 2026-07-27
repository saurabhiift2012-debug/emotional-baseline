import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  TextStyle, ViewStyle, StyleProp,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius, font, type as T, confidenceFor, ThemeColors, ConfidenceLevel } from "./theme";
import { useTheme, useThemedStyles } from "./ThemeContext";

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.surface }, style]} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

export function AppText({ children, style, weight, mono, testID }: { children: React.ReactNode; style?: StyleProp<TextStyle>; weight?: "reg" | "med" | "semi"; mono?: boolean; testID?: string }) {
  const { colors } = useTheme();
  return <Text testID={testID} style={[{ fontFamily: font.body, color: colors.onSurface }, weight === "med" && { fontWeight: "500" }, weight === "semi" && { fontWeight: "600" }, style]}>{children}</Text>;
}

export function Display({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[{ fontFamily: font.display, color: colors.onSurface, fontSize: T["2xl"] }, style]}>{children}</Text>;
}

export function Card({ children, style, tint, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tint?: string; testID?: string }) {
  const { colors } = useTheme();
  return <View testID={testID} style={[{ backgroundColor: tint || colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg }, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled, testID, color, icon }: { label: string; onPress: () => void; disabled?: boolean; testID?: string; color?: string; icon?: any }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [styles.primaryBtn, { backgroundColor: color || colors.amber, opacity: disabled ? 0.45 : pressed ? 0.9 : 1 }]}
    >
      {icon ? <Feather name={icon} size={18} color={"#2C2416"} style={{ marginRight: 8 }} /> : null}
      <Text style={[styles.primaryBtnText, { color: "#2C2416" }]}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.ghostBtnText, { color: colors.onSurfaceSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.onSurface }, style]}>{children}</Text>;
}

export function ConfidenceBadge({ level, lang, testID }: { level: ConfidenceLevel; lang: "en" | "hi"; testID?: string }) {
  const { colors } = useTheme();
  const c = confidenceFor(colors)[level];
  if (!c) return null;
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{lang === "hi" ? c.hi : c.en}</Text>
    </View>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.amber} size="large" />
    </View>
  );
}

export function IconChip({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={[styles.chip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, active && { backgroundColor: colors.indigo, borderColor: colors.indigo }]}
    >
      <Text style={[styles.chipText, { color: colors.onSurfaceSecondary }, active && { color: colors.onSurfaceInverse }]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  primaryBtn: {
    height: 54, borderRadius: radius.pill, flexDirection: "row",
    alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl,
  },
  primaryBtnText: { fontFamily: font.body, fontSize: T.lg, fontWeight: "600" },
  ghostBtn: { height: 48, alignItems: "center", justifyContent: "center" },
  ghostBtnText: { fontFamily: font.body, fontSize: T.base, fontWeight: "500" },
  sectionTitle: { fontFamily: font.display, fontSize: T.xl, marginBottom: spacing.md },
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  badgeText: { fontFamily: font.body, fontSize: T.sm, fontWeight: "600" },
  chip: {
    height: 40, borderRadius: radius.pill, paddingHorizontal: spacing.lg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, flexShrink: 0,
  },
  chipText: { fontFamily: font.body, fontSize: T.base, fontWeight: "500" },
});

export { colors, spacing, radius, font, T, useTheme, useThemedStyles };
export type { ThemeColors };
