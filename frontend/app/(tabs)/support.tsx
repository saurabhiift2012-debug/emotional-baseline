import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, useReducedMotion } from "react-native-reanimated";
import { useApp } from "@/src/AppContext";
import { CrisisSheet } from "@/src/CrisisSheet";
import { Screen, Display, AppText, Card, SectionTitle, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Support() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [crisis, setCrisis] = useState(false);
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
    { icon: "search", label: t("find_psych"), sub: "", route: "/psychologists" },
    { icon: "calendar", label: t("my_appointments"), sub: "", route: "/appointments" },
    { icon: "book", label: t("resources"), sub: "", route: "/resources" },
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
          <Pressable key={r.label} testID={`support-${r.icon}`} onPress={() => r.route && router.push(r.route as any)} style={styles.row}>
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
        <Card tint={colors.tintRose}>
          <AppText style={{ color: colors.onSurface, lineHeight: 22 }}>{t("crisis_intro")}</AppText>
          <Pressable testID="open-crisis-sheet" onPress={() => setCrisis(true)} style={styles.crisisBtn}>
            <Feather name="phone-call" size={16} color={"#FFFFFF"} />
            <AppText style={styles.crisisBtnText}>{t("need_to_talk_now")}</AppText>
          </Pressable>
        </Card>

        <View style={styles.notSupport}>
          <AppText style={styles.nsTitle}>{t("not_supported_title")}</AppText>
          <AppText style={styles.nsList}>{t("not_supported_list")}</AppText>
          <AppText style={styles.nsUse}>{t("use_emergency_above")}</AppText>
        </View>

        <AppText style={styles.disclaimer}>{t("not_medical")}</AppText>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
      <CrisisSheet visible={crisis} onClose={() => setCrisis(false)} />
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
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
  crisisBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.rose, borderRadius: radius.pill, height: 50, marginTop: spacing.lg },
  crisisBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: T.lg },
  notSupport: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  nsTitle: { color: colors.onSurfaceSecondary, fontSize: T.sm, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700", marginBottom: spacing.sm },
  nsList: { color: colors.onSurface, lineHeight: 22 },
  nsUse: { color: colors.onSurfaceSecondary, marginTop: spacing.sm, fontStyle: "italic", fontSize: T.sm },
  emRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, flexWrap: "wrap" },
  emBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.rose, borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 44 },
  emBtnText: { color: colors.surface, fontWeight: "600" },
  disclaimer: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: spacing.xl, fontStyle: "italic", lineHeight: 18 },
});
