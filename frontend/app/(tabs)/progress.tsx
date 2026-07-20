import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { GROUP_COLOR } from "@/src/moods";
import { Screen, Display, AppText, Card, SectionTitle, Loading, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";
import { useTabBarPadding } from "@/src/GlassTabBar";

const STATUS_KEY: Record<string, string> = { above: "status_above", below: "status_below", around: "status_around", not_enough: "status_mixed" };
const STATUS_ICON: Record<string, any> = { above: "arrow-up-right", below: "arrow-down-right", around: "minus", not_enough: "help-circle" };

export default function Progress() {
  const { t } = useApp();
  const bottomPad = useTabBarPadding();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [prog, setProg] = useState<any>(null);
  const [pulse, setPulse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTrend, setShowTrend] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, pl] = await Promise.all([api.get("/progress"), api.get("/pulse")]);
      setProg(p); setPulse(pl);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <Display style={styles.h}>{t("tab_progress")}</Display>

        {/* Wellbeing Pulse */}
        <SectionTitle style={styles.section}>{t("pulse_title")}</SectionTitle>
        <Card>
          <View style={styles.pulseMoodRow} testID="pulse-mood">
            <Feather name={STATUS_ICON[pulse?.mood] || "minus"} size={16} color={colors.indigo} />
            <AppText style={styles.pulseMoodText}>{t("pulse_mood")}: {t(STATUS_KEY[pulse?.mood] || "status_mixed")}</AppText>
          </View>
          <AppText style={styles.pulseSummary}>{pulse?.summary}</AppText>
          <AppText style={styles.disclaimer}>{pulse?.disclaimer}</AppText>
        </Card>

        {/* Month count (non-punitive) */}
        <Card tint={colors.surfaceTertiary} style={{ marginTop: spacing.lg, flexDirection: "row", alignItems: "center" }}>
          <Display style={styles.bigNum}>{prog?.month_checkin_count ?? 0}</Display>
          <AppText style={styles.bigNumLabel}>{t("progress_month")}</AppText>
        </Card>

        {/* Feel map */}
        <SectionTitle style={styles.section}>{t("feel_map")}</SectionTitle>
        <AppText style={styles.caption}>{t("feel_map_caption")}</AppText>
        <Card>
          <View style={styles.feelMap}>
            {(prog?.feel_map || []).map((d: any, i: number) => {
              const isToday = i === (prog?.feel_map?.length || 0) - 1;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: d.group ? GROUP_COLOR[d.group] : "transparent", borderColor: d.group ? "transparent" : colors.border },
                    isToday && { borderColor: colors.indigo, borderWidth: 2 },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.mapEnds}>
            <AppText style={styles.mapEndText}>{t("weeks6_ago")}</AppText>
            <AppText style={styles.mapEndText}>{t("today_label")}</AppText>
          </View>
          <View style={styles.legend}>
            {(["low", "neutral", "bright"] as const).map((g) => (
              <View key={g} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: GROUP_COLOR[g] }]} />
                <AppText style={styles.legendText}>{g === "low" ? "Low" : g === "neutral" ? "Steady" : "Bright"}</AppText>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border }]} />
              <AppText style={styles.legendText}>{t("no_checkin")}</AppText>
            </View>
          </View>
        </Card>

        {/* Mood trend — hidden behind a "More" toggle so Feel Map stays the primary view */}
        <Pressable
          testID="mood-trend-toggle"
          onPress={() => setShowTrend((s) => !s)}
          style={styles.moreToggle}
        >
          <Feather name={showTrend ? "chevron-up" : "chevron-down"} size={18} color={colors.indigo} />
          <AppText style={styles.moreToggleText}>{showTrend ? t("hide_detail") : t("show_more_detail")}</AppText>
        </Pressable>
        {showTrend ? (
          <>
            <SectionTitle style={styles.section}>{t("mood_trend")}</SectionTitle>
            <AppText style={styles.caption}>{t("mood_trend_caption")}</AppText>
            <BarChart series={prog?.mood_series} max={6} color={colors.indigo} />
          </>
        ) : null}

        {/* Story CTA */}
        <Pressable testID="read-story-button" onPress={() => router.push("/story")} style={styles.storyBtn}>
          <Feather name="book-open" size={20} color={colors.onSurfaceInverse} />
          <AppText style={styles.storyBtnText}>{t("read_story")}</AppText>
          <Feather name="chevron-right" size={20} color={colors.onSurfaceInverse} />
        </Pressable>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function BarChart({ series, max, color }: { series?: any[]; max: number; color: string }) {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const data = series || [];
  return (
    <Card>
      <View style={styles.chartRow}>
        <View style={styles.axisCol}>
          <AppText style={styles.axisText}>{t("brighter")}</AppText>
          <AppText style={styles.axisText}>{t("heavier")}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.chart}>
            {data.map((d, i) => {
              const v = d.value;
              const h = v != null ? Math.max(4, (v / max) * 90) : 3;
              return <View key={i} style={{ flex: 1, height: h, backgroundColor: v != null ? color : colors.border, borderRadius: 3, opacity: v != null ? 1 : 0.5 }} />;
            })}
          </View>
          <View style={styles.chartLabels}>
            <AppText style={styles.axisTime}>{t("days30_ago")}</AppText>
            <AppText style={styles.axisTime}>{t("today_label")}</AppText>
          </View>
        </View>
      </View>
    </Card>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 100 },
  h: { fontSize: 28 },
  section: { marginTop: spacing.xl, fontSize: T.xl },
  caption: { color: colors.onSurfaceSecondary, fontSize: T.sm, lineHeight: 19, marginBottom: spacing.md, marginTop: -spacing.sm },
  pulseGrid: { flexDirection: "row", flexWrap: "wrap" },
  pulseMoodRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  pulseMoodText: { fontSize: T.lg, color: colors.onSurface, fontWeight: "500" },
  pulseItem: { width: "50%", marginBottom: spacing.lg },
  pulseLabel: { color: colors.onSurfaceSecondary, fontSize: T.sm },
  pulseStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  pulseStatus: { fontSize: T.base, color: colors.onSurface, fontWeight: "500", flexShrink: 1 },
  pulseSummary: { marginTop: spacing.sm, fontSize: T.base, lineHeight: 22, color: colors.onSurface },
  disclaimer: { marginTop: spacing.md, fontSize: T.sm, color: colors.onSurfaceSecondary, fontStyle: "italic", lineHeight: 18 },
  bigNum: { fontSize: 44, color: colors.indigo, marginRight: spacing.md },
  bigNumLabel: { flex: 1, fontSize: T.lg, color: colors.onSurface },
  feelMap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  mapEnds: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md },
  mapEndText: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  chartRow: { flexDirection: "row", alignItems: "stretch" },
  axisCol: { width: 54, height: 96, justifyContent: "space-between", paddingRight: 8 },
  axisText: { fontSize: T.sm, color: colors.onSurfaceSecondary, textAlign: "right" },
  axisTime: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 96 },
  storyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.indigo, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  moreToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.xl, height: 44 },
  moreToggleText: { color: colors.indigo, fontWeight: "600", fontSize: T.base },
  storyBtnText: { flex: 1, color: colors.onSurfaceInverse, fontSize: T.lg, fontWeight: "600" },
});
