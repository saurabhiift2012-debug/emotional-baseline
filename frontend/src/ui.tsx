import React from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  TextStyle, ViewStyle, StyleProp,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius, font, type as T, confidence } from "./theme";

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

export function AppText({ children, style, weight, mono }: { children: React.ReactNode; style?: StyleProp<TextStyle>; weight?: "reg" | "med" | "semi"; mono?: boolean }) {
  return <Text style={[{ fontFamily: font.body, color: colors.onSurface }, weight === "med" && { fontWeight: "500" }, weight === "semi" && { fontWeight: "600" }, style]}>{children}</Text>;
}

export function Display({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: font.display, color: colors.onSurface, fontSize: T["2xl"] }, style]}>{children}</Text>;
}

export function Card({ children, style, tint, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tint?: string; testID?: string }) {
  return <View testID={testID} style={[styles.card, tint ? { backgroundColor: tint } : null, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled, testID, color, icon }: { label: string; onPress: () => void; disabled?: boolean; testID?: string; color?: string; icon?: any }) {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [styles.primaryBtn, { backgroundColor: color || colors.amber, opacity: disabled ? 0.45 : pressed ? 0.9 : 1 }]}
    >
      {icon ? <Feather name={icon} size={18} color={colors.onSurface} style={{ marginRight: 8 }} /> : null}
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function ConfidenceBadge({ level, lang, testID }: { level: keyof typeof confidence; lang: "en" | "hi"; testID?: string }) {
  const c = confidence[level];
  if (!c) return null;
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{lang === "hi" ? c.hi : c.en}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.amber} size="large" />
    </View>
  );
}

export function IconChip({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  primaryBtn: {
    height: 54, borderRadius: radius.pill, flexDirection: "row",
    alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl,
  },
  primaryBtnText: { fontFamily: font.body, fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  ghostBtn: { height: 48, alignItems: "center", justifyContent: "center" },
  ghostBtnText: { fontFamily: font.body, fontSize: T.base, color: colors.onSurfaceSecondary, fontWeight: "500" },
  sectionTitle: { fontFamily: font.display, fontSize: T.xl, color: colors.onSurface, marginBottom: spacing.md },
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  badgeText: { fontFamily: font.body, fontSize: T.sm, fontWeight: "600" },
  chip: {
    height: 40, borderRadius: radius.pill, paddingHorizontal: spacing.lg,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border, flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  chipText: { fontFamily: font.body, fontSize: T.base, color: colors.onSurfaceSecondary, fontWeight: "500" },
  chipTextActive: { color: colors.onSurfaceInverse },
});

export { colors, spacing, radius, font, T };
