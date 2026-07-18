import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { GROUP_COLOR } from "@/src/moods";
import { Screen, Display, AppText, Card, SectionTitle, Loading, colors, spacing, radius, T } from "@/src/ui";

const STATUS_KEY: Record<string, string> = { above: "status_above", below: "status_below", around: "status_around", not_enough: "status_mixed" };
const STATUS_ICON: Record<string, any> = { above: "arrow-up-right", below: "arrow-down-right", around: "minus", not_enough: "help-circle" };

export default function Progress() {
  const { t } = useApp();
  const router = useRouter();
  const [prog, setProg] = useState<any>(null);
  const [pulse, setPulse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
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
        <Card>
          <View style={styles.feelMap}>
            {(prog?.feel_map || []).map((d: any, i: number) => (
              <View key={i} style={[styles.dot, { backgroundColor: d.group ? GROUP_COLOR[d.group] : "transparent", borderColor: d.group ? "transparent" : colors.border }]} />
            ))}
          </View>
          <View style={styles.legend}>
            {(["low", "neutral", "bright"] as const).map((g) => (
              <View key={g} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: GROUP_COLOR[g] }]} />
                <AppText style={styles.legendText}>{g === "low" ? "Low" : g === "neutral" ? "Steady" : "Bright"}</AppText>
              </View>
            ))}
          </View>
        </Card>

        {/* Mood trend */}
        <SectionTitle style={styles.section}>{t("mood_trend")}</SectionTitle>
        <BarChart series={prog?.mood_series} max={6} color={colors.indigo} />

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
  const data = series || [];
  return (
    <Card>
      <View style={styles.chart}>
        {data.map((d, i) => {
          const v = d.value;
          const h = v != null ? Math.max(4, (v / max) * 90) : 3;
          return <View key={i} style={{ flex: 1, height: h, backgroundColor: v != null ? color : colors.border, borderRadius: 3, opacity: v != null ? 1 : 0.5 }} />;
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  h: { fontSize: 28 },
  section: { marginTop: spacing.xl, fontSize: T.xl },
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
  legend: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 96 },
  storyBtn: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.indigo, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  storyBtnText: { flex: 1, color: colors.onSurfaceInverse, fontSize: T.lg, fontWeight: "600" },
});
