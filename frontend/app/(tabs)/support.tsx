import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, useReducedMotion } from "react-native-reanimated";
import { useApp } from "@/src/AppContext";
import { Screen, Display, AppText, Card, SectionTitle, colors, spacing, radius, T } from "@/src/ui";

export default function Support() {
  const { t } = useApp();
  const scale = useSharedValue(0.7);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { scale.value = 0.85; return; }
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [reduced, scale]);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const rows = [
    { icon: "search", label: t("find_psych"), sub: t("coming_soon") },
    { icon: "calendar", label: t("my_appointments"), sub: t("coming_soon") },
    { icon: "book", label: t("resources"), sub: "" },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Display style={styles.h}>{t("support_title")}</Display>

        {/* Breathing */}
        <View style={styles.breatheBox}>
          <Animated.View style={[styles.breatheCircle, circle]} />
          <AppText style={styles.breatheText}>{t("breathe")}</AppText>
        </View>

        {rows.map((r) => (
          <Pressable key={r.label} testID={`support-${r.icon}`} style={styles.row}>
            <View style={styles.rowIcon}><Feather name={r.icon as any} size={18} color={colors.indigo} /></View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.rowLabel}>{r.label}</AppText>
              {r.sub ? <AppText style={styles.rowSub}>{r.sub}</AppText> : null}
            </View>
            <Feather name="chevron-right" size={20} color={colors.onSurfaceSecondary} />
          </Pressable>
        ))}

        {/* Emergency */}
        <SectionTitle style={styles.section}>{t("emergency")}</SectionTitle>
        <Card tint="#F3E6E2">
          <AppText style={{ color: colors.onSurface, lineHeight: 22 }}>{t("emergency_note")}</AppText>
          <View style={styles.emRow}>
            <Pressable testID="emergency-112" onPress={() => Linking.openURL("tel:112")} style={styles.emBtn}>
              <Feather name="phone" size={16} color={colors.surface} />
              <AppText style={styles.emBtnText}>112</AppText>
            </Pressable>
            <Pressable testID="emergency-tele" onPress={() => Linking.openURL("tel:14416")} style={[styles.emBtn, { backgroundColor: colors.indigo }]}>
              <Feather name="phone" size={16} color={colors.surface} />
              <AppText style={styles.emBtnText}>Tele-MANAS 14416</AppText>
            </Pressable>
          </View>
        </Card>

        <AppText style={styles.disclaimer}>{t("not_medical")}</AppText>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  h: { fontSize: 26, lineHeight: 34 },
  breatheBox: { alignItems: "center", justifyContent: "center", height: 220, marginVertical: spacing.lg },
  breatheCircle: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: colors.sage, opacity: 0.35 },
  breatheText: { fontSize: T.lg, color: colors.onSurface, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  rowLabel: { fontSize: T.lg, color: colors.onSurface },
  rowSub: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  section: { marginTop: spacing.xl, fontSize: T.xl },
  emRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, flexWrap: "wrap" },
  emBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.rose, borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 44 },
  emBtnText: { color: colors.surface, fontWeight: "600" },
  disclaimer: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: spacing.xl, fontStyle: "italic", lineHeight: 18 },
});
