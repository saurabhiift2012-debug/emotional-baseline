import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { LOGO_DATA_URI } from "@/src/logoDataUri";
import { Screen, Display, AppText, Card, Loading, spacing, radius, font, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Story() {
  const { t, lang } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

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

  const shareStory = async () => {
    if (sharing || !text) return;
    setSharing(true);
    try {
      Haptics.selectionAsync();
      const html = buildStoryHtml({ text, facts, period, t, lang });
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: t("your_story") });
      }
    } catch {}
    finally { setSharing(false); }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="story-close" onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
        <Pressable testID="story-share" onPress={shareStory} hitSlop={12} disabled={loading || !text} style={{ opacity: loading || !text ? 0.4 : 1 }}>
          <Feather name={sharing ? "loader" : "share"} size={22} color={colors.indigo} />
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

function buildStoryHtml({ text, facts, period, t }: { text: string; facts: any; period: "week" | "month"; t: (k: string) => string; lang: "en" | "hi" }) {
  const total = facts ? (facts.bright_days + facts.steady_days + facts.low_days) : 0;
  const safe = (s: string) => (s || "").replace(/</g, "&lt;");
  const stats = total > 0 ? `
    <div class="stats">
      <div class="stat"><div class="dot" style="background:#8BAF8C"></div><div class="num">${facts.bright_days}</div><div class="lbl">${t("brighter")}</div></div>
      <div class="stat"><div class="dot" style="background:#D4A574"></div><div class="num">${facts.steady_days}</div><div class="lbl">${t("steady_word")}</div></div>
      <div class="stat"><div class="dot" style="background:#C9897A"></div><div class="num">${facts.low_days}</div><div class="lbl">${t("heavier")}</div></div>
    </div>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2C2416; padding: 40px 34px; background: #FAF7F2; }
    .kicker { color: #6B5C47; font-size: 13px; letter-spacing: 0.4px; text-transform: uppercase; margin: 0 0 4px; }
    h1 { color: #3D4F7C; font-size: 26px; margin: 0 0 22px; }
    .story { font-size: 22px; line-height: 34px; color: #2C2416; }
    .stats { display: flex; justify-content: space-around; margin-top: 28px; padding-top: 22px; border-top: 1px solid #E8DFC9; }
    .stat { text-align: center; }
    .dot { width: 10px; height: 10px; border-radius: 5px; margin: 0 auto 6px; }
    .num { font-size: 26px; font-weight: 700; color: #2C2416; }
    .lbl { font-size: 12px; color: #6B5C47; margin-top: 2px; }
    .foot { margin-top: 30px; color: #6B5C47; font-size: 11px; font-style: italic; }
    .watermark { position: fixed; bottom: 18px; right: 18px; display: flex; align-items: center; gap: 6px; opacity: 0.55; }
    .watermark img { width: 22px; height: 22px; border-radius: 6px; }
    .watermark span { color: #3D4F7C; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
  </style></head><body>
    <div class="watermark"><img src="${LOGO_DATA_URI}" alt="TherapiShots"/><span>TherapiShots</span></div>
    <p class="kicker">${period === "week" ? t("weekly") : t("monthly")} · ${t("your_story")}</p>
    <h1>${t("your_story")}</h1>
    <div class="story">${safe(text)}</div>
    ${stats}
    <p class="foot">${t("not_medical")}</p>
  </body></html>`;
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
