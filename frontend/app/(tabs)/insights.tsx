import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { moodByKey, GROUP_TINT } from "@/src/moods";
import { Screen, Display, AppText, Card, SectionTitle, Loading, ConfidenceBadge, colors, spacing, radius, T } from "@/src/ui";

export default function Insights() {
  const { t, lang, moods } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fb, setFb] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { setData(await api.get("/insights")); } catch { setData(null); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen><Loading /></Screen>;

  const ins = data?.insights || { helps: [], harder: [], notice: [], context: [] };
  const total = (ins.helps.length + ins.harder.length + ins.notice.length + ins.context.length);

  const sendFb = async (key: string, resp: string) => {
    setFb((p) => ({ ...p, [key]: resp }));
    Haptics.selectionAsync();
    try { await api.post("/feedback", { insight_key: key, response: resp }); } catch {}
  };

  const renderGroup = (title: string, items: any[]) => {
    if (!items.length) return null;
    return (
      <View style={{ marginTop: spacing.xl }}>
        <SectionTitle style={{ fontSize: T.xl }}>{title}</SectionTitle>
        {items.map((it) => (
          <Card key={it.key} style={{ marginBottom: spacing.md }}>
            <ConfidenceBadge level={it.confidence} lang={lang} testID={`badge-${it.key}`} />
            <Display style={styles.insightText}>{it.text}</Display>
            <Pressable testID={`why-${it.key}`} onPress={() => setExpanded(expanded === it.key ? null : it.key)} style={styles.whyRow}>
              <Feather name="help-circle" size={14} color={colors.onSurfaceSecondary} />
              <AppText style={styles.why}>{t("why_seeing")}</AppText>
            </Pressable>
            {expanded === it.key && <AppText style={styles.whyBody}>{it.why}</AppText>}
            <View style={styles.fbRow}>
              {(["yes", "maybe", "not_really"] as const).map((k) => (
                <Pressable key={k} testID={`insight-fb-${it.key}-${k}`} onPress={() => sendFb(it.key, k)} style={[styles.fbBtn, fb[it.key] === k && styles.fbBtnActive]}>
                  <AppText style={[styles.fbText, fb[it.key] === k && styles.fbTextActive]}>{fbLabel(k, t)}</AppText>
                </Pressable>
              ))}
            </View>
          </Card>
        ))}
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <AppText style={styles.eyebrow}>{t("tab_insights")}</AppText>
        <Display style={styles.q}>{t("insights_q")}</Display>

        {/* Last 7 days daily mood strip */}
        {data?.daily_moods?.length ? (
          <View style={styles.stripWrap} testID="daily-mood-strip">
            <SectionTitle style={{ fontSize: T.lg, marginBottom: spacing.sm }}>{t("last7_days")}</SectionTitle>
            <View style={styles.strip}>
              {data.daily_moods.map((d: any, i: number) => {
                const m = moodByKey(d.mood, moods);
                const dt = new Date(d.date + "T00:00:00");
                const wd = dt.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-US", { weekday: "short" }).slice(0, 2);
                return (
                  <View key={i} style={styles.stripCol} testID={`daily-mood-${d.date}`}>
                    <View style={[styles.stripTile, { backgroundColor: d.group ? GROUP_TINT[d.group] : colors.surfaceSecondary, borderColor: d.mood ? "transparent" : colors.border }]}>
                      <Text style={styles.stripEmoji}>{m ? m.emoji : ""}</Text>
                    </View>
                    <AppText style={styles.stripDay}>{wd}</AppText>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {total === 0 ? (
          <View style={styles.empty}>
            <Image source={{ uri: "https://images.pexels.com/photos/8071781/pexels-photo-8071781.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" }} style={styles.emptyImg} />
            <AppText style={styles.emptyText}>{t("insights_empty")}</AppText>
            {data?.checkin_count != null && <AppText style={styles.count}>{data.checkin_count} check-ins so far</AppText>}
          </View>
        ) : (
          <>
            {renderGroup(t("what_helps"), ins.helps)}
            {renderGroup(t("what_harder"), ins.harder)}
            {renderGroup(t("patterns_notice"), ins.notice)}
            {renderGroup(t("context_patterns"), ins.context)}
            <AppText style={styles.disclaimer}>{t("not_medical")}</AppText>
          </>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function fbLabel(k: string, t: (s: string) => string) {
  return k === "yes" ? t("yes") : k === "maybe" ? t("maybe") : t("not_really");
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  eyebrow: { color: colors.onSurfaceSecondary, fontSize: T.sm, textTransform: "uppercase", letterSpacing: 1 },
  q: { fontSize: 26, lineHeight: 34, marginTop: 4 },
  stripWrap: { marginTop: spacing.xl },
  strip: { flexDirection: "row", justifyContent: "space-between" },
  stripCol: { alignItems: "center", flex: 1 },
  stripTile: { width: 40, height: 46, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stripEmoji: { fontSize: 22 },
  stripDay: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 6 },
  insightText: { fontSize: T.xl, lineHeight: 28, marginTop: spacing.md },
  whyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  why: { color: colors.onSurfaceSecondary, fontSize: T.sm, fontWeight: "500" },
  whyBody: { color: colors.onSurfaceSecondary, marginTop: spacing.sm, fontSize: T.sm, lineHeight: 20 },
  fbRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  fbBtn: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  fbBtnActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  fbText: { color: colors.onSurfaceSecondary, fontSize: T.sm, fontWeight: "500" },
  fbTextActive: { color: colors.onSurface },
  empty: { alignItems: "center", marginTop: spacing["3xl"] },
  emptyImg: { width: 200, height: 140, borderRadius: radius.lg, marginBottom: spacing.xl },
  emptyText: { textAlign: "center", color: colors.onSurfaceSecondary, fontSize: T.lg, lineHeight: 24 },
  count: { marginTop: spacing.md, color: colors.onSurfaceSecondary, fontSize: T.sm },
  disclaimer: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: spacing.xl, fontStyle: "italic", lineHeight: 18 },
});
