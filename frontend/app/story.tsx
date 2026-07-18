import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { Screen, Display, AppText, Card, Loading, spacing, radius, font, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Story() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: "week" | "month") => {
    setLoading(true);
    try { setData(await api.get(`/story?period=${p}`)); } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const text = data?.ai_text || data?.template;
  const facts = data?.facts;
  const totalDays = facts ? (facts.bright_days + facts.steady_days + facts.low_days) : 0;
  const TREND_ICON: Record<string, any> = { improving: "trending-up", declining: "trending-down", steady: "minus", volatile: "activity" };
  const TREND_KEY: Record<string, string> = { improving: "trend_improving", declining: "trend_declining", steady: "trend_steady", volatile: "trend_volatile" };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="story-close" onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Display style={styles.h}>{t("your_story")}</Display>

        <View style={styles.toggle}>
          {(["week", "month"] as const).map((p) => (
            <Pressable key={p} testID={`story-${p}`} onPress={() => setPeriod(p)} style={[styles.toggleBtn, period === p && styles.toggleActive]}>
              <AppText style={[styles.toggleText, period === p && styles.toggleTextActive]}>{t(p === "week" ? "weekly" : "monthly")}</AppText>
            </Pressable>
          ))}
        </View>

        {loading ? <Loading /> : (
          <Card style={{ marginTop: spacing.lg }}>
            {data?.used_ai && (
              <View style={styles.aiTag}>
                <Feather name="star" size={12} color={colors.indigo} />
                <AppText style={styles.aiTagText}>AI-assisted summary</AppText>
              </View>
            )}
            <Display style={styles.story}>{text}</Display>
            {totalDays > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.statRow}>
                  <View style={styles.stat}>
                    <View style={[styles.statDot, { backgroundColor: colors.sage }]} />
                    <AppText style={styles.statNum}>{facts.bright_days}</AppText>
                    <AppText style={styles.statLbl}>{t("brighter")}</AppText>
                  </View>
                  <View style={styles.stat}>
                    <View style={[styles.statDot, { backgroundColor: colors.amber }]} />
                    <AppText style={styles.statNum}>{facts.steady_days}</AppText>
                    <AppText style={styles.statLbl}>{t("steady_word")}</AppText>
                  </View>
                  <View style={styles.stat}>
                    <View style={[styles.statDot, { backgroundColor: colors.rose }]} />
                    <AppText style={styles.statNum}>{facts.low_days}</AppText>
                    <AppText style={styles.statLbl}>{t("heavier")}</AppText>
                  </View>
                </View>
                {facts.trend && (
                  <View style={styles.trendPill} testID="story-trend">
                    <Feather name={TREND_ICON[facts.trend]} size={14} color={colors.indigo} />
                    <AppText style={styles.trendText}>{t("trend_label")}: {t(TREND_KEY[facts.trend])}</AppText>
                  </View>
                )}
              </>
            )}
          </Card>
        )}
        <AppText style={styles.note}>{t("not_medical")}</AppText>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 44, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing["2xl"] },
  h: { fontSize: 28, marginBottom: spacing.lg },
  toggle: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, padding: 4 },
  toggleBtn: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: colors.indigo },
  toggleText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
  toggleTextActive: { color: colors.onSurfaceInverse },
  aiTag: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  aiTagText: { color: colors.indigo, fontSize: T.sm, fontWeight: "600" },
  story: { fontSize: 22, lineHeight: 34 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  statRow: { flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center", gap: 4 },
  statDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 2 },
  statNum: { fontFamily: font.display, fontSize: 26, color: colors.onSurface },
  statLbl: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  trendPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: spacing.lg, backgroundColor: colors.tintLav, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  trendText: { color: colors.onSurface, fontWeight: "600", fontSize: T.sm },
  note: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: spacing.xl, fontStyle: "italic", lineHeight: 18 },
});
