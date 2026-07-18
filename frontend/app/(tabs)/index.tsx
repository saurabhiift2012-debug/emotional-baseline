import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { moodByKey } from "@/src/moods";
import { Screen, Display, AppText, Card, SectionTitle, Loading, PrimaryButton, colors, spacing, radius, font, T } from "@/src/ui";

export default function Today() {
  const { t, lang, moods, user } = useApp();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get("/today");
      setData(d);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Screen><Loading /></Screen>;

  const greetKey = data?.greeting === "morning" ? "good_morning" : data?.greeting === "afternoon" ? "good_afternoon" : "good_evening";
  const todaysMood = moodByKey(data?.todays_mood, moods);
  const s = data?.signals || {};
  const step = data?.small_step;

  const sendFeedback = async (resp: string) => {
    setFeedback(resp);
    Haptics.selectionAsync();
    try { await api.post("/feedback", { response: resp, insight_key: "today_observation" }); } catch {}
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.amber} />}
      >
        <AppText style={styles.greet}>{t(greetKey)},</AppText>
        <Display style={styles.name}>{data?.name || user?.name} 🌿</Display>

        {/* Check-in banner */}
        <Pressable testID="checkin-banner" onPress={() => router.push("/checkin")} style={styles.banner}>
          {data?.checked_in_today && todaysMood ? (
            <View style={styles.bannerRow}>
              <Text style={styles.bannerEmoji}>{todaysMood.emoji}</Text>
              <View style={{ flex: 1 }}>
                <AppText style={styles.bannerSmall}>{t("checked_in")}</AppText>
                <Display style={styles.bannerMood}>{lang === "hi" ? todaysMood.hi : todaysMood.en}</Display>
              </View>
              <Feather name="edit-2" size={18} color={colors.onSurfaceSecondary} />
            </View>
          ) : (
            <View style={styles.bannerRow}>
              <View style={{ flex: 1 }}>
                <Display style={styles.bannerQ}>{t("how_feeling")}</Display>
              </View>
              <View style={styles.bannerCta}>
                <Feather name="plus" size={22} color={colors.onSurface} />
              </View>
            </View>
          )}
        </Pressable>

        {/* Repeated low mood gentle banner */}
        {data?.low_mood_journey?.repeated_low && (
          <Card tint={colors.surfaceTertiary} style={{ marginTop: spacing.lg }}>
            <SectionTitle style={{ fontSize: T.lg }}>{t("repeated_low_title")}</SectionTitle>
            <AppText style={{ color: colors.onSurfaceSecondary, marginBottom: spacing.md }}>{t("repeated_low_body")}</AppText>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable testID="repeated-explore" onPress={() => router.push("/(tabs)/insights")} style={styles.miniBtn}>
                <AppText style={styles.miniBtnText}>{t("explore_patterns")}</AppText>
              </Pressable>
              <Pressable testID="repeated-connect" onPress={() => router.push("/(tabs)/support")} style={[styles.miniBtn, { backgroundColor: colors.indigo }]}>
                <AppText style={[styles.miniBtnText, { color: colors.onSurfaceInverse }]}>{t("connect_psych")}</AppText>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Health signals */}
        <SectionTitle style={styles.section}>{t("todays_signals")}</SectionTitle>
        <View style={styles.signalGrid}>
          <Signal icon="moon" label={t("signal_sleep")} value={fmtSleep(s.sleep?.minutes)} on={s.sleep?.connected} />
          <Signal icon="activity" label={t("signal_steps")} value={s.steps?.value?.toLocaleString?.() || "—"} on={s.steps?.connected} />
          <Signal icon="zap" label={t("signal_activity")} value={s.activity?.minutes != null ? `${s.activity.minutes} min` : "—"} on={s.activity?.connected} />
          <Signal icon="heart" label={t("signal_rhr")} value={s.resting_hr?.bpm != null ? `${s.resting_hr.bpm} bpm` : "—"} on={s.resting_hr?.connected} />
        </View>
        <AppText style={styles.simNote}>{t("simulated_note")}</AppText>

        {/* Observation */}
        {data?.observation ? (
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.obsHead}>
              <Feather name="feather" size={16} color={colors.indigo} />
              <AppText style={styles.obsHeadText}>{t("notice_title")}</AppText>
            </View>
            <Display style={styles.obsText}>{data.observation}</Display>
            <AppText style={styles.feelQ}>{t("feel_true")}</AppText>
            <View style={styles.feelRow}>
              {(["yes", "maybe", "not_really"] as const).map((k) => (
                <Pressable key={k} testID={`feel-${k}`} onPress={() => sendFeedback(k)} style={[styles.feelBtn, feedback === k && styles.feelBtnActive]}>
                  <AppText style={[styles.feelBtnText, feedback === k && styles.feelBtnTextActive]}>{t(k)}</AppText>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        {/* One small step */}
        {step && (
          <Card tint="#EAF0E6" style={{ marginTop: spacing.lg }}>
            <View style={styles.obsHead}>
              <Feather name={step.icon} size={16} color={colors.sage} />
              <AppText style={[styles.obsHeadText, { color: colors.onSurfaceSecondary }]}>{t("one_small_step")}</AppText>
            </View>
            <Display style={{ fontSize: T.xl, marginBottom: 4 }}>{lang === "hi" ? step.hi : step.en}</Display>
            <AppText style={{ color: colors.onSurfaceSecondary }}>{lang === "hi" ? step.hi_desc : step.en_desc}</AppText>
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function Signal({ icon, label, value, on }: { icon: any; label: string; value: string; on?: boolean }) {
  return (
    <View style={styles.signal}>
      <Feather name={icon} size={18} color={on ? colors.indigo : colors.onSurfaceSecondary} />
      <AppText style={styles.signalLabel}>{label}</AppText>
      <Display style={styles.signalValue}>{on ? value : "—"}</Display>
    </View>
  );
}

function fmtSleep(min?: number) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  greet: { color: colors.onSurfaceSecondary, fontSize: T.lg },
  name: { fontSize: 28, marginTop: 2 },
  banner: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bannerQ: { fontSize: 22, lineHeight: 28 },
  bannerCta: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.amber, alignItems: "center", justifyContent: "center" },
  bannerEmoji: { fontSize: 40 },
  bannerSmall: { color: colors.onSurfaceSecondary, fontSize: T.sm },
  bannerMood: { fontSize: T.xl },
  section: { marginTop: spacing.xl, fontSize: T.xl },
  signalGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  signal: { width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg },
  signalLabel: { color: colors.onSurfaceSecondary, fontSize: T.sm, marginTop: spacing.sm },
  signalValue: { fontSize: T.xl, marginTop: 2 },
  simNote: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: spacing.sm, fontStyle: "italic" },
  obsHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  obsHeadText: { color: colors.indigo, fontWeight: "600", fontSize: T.sm },
  obsText: { fontSize: T.xl, lineHeight: 28, marginBottom: spacing.lg },
  feelQ: { color: colors.onSurfaceSecondary, marginBottom: spacing.sm },
  feelRow: { flexDirection: "row", gap: spacing.sm },
  feelBtn: { flex: 1, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  feelBtnActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  feelBtnText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
  feelBtnTextActive: { color: colors.onSurfaceInverse },
  miniBtn: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  miniBtnText: { color: colors.onSurface, fontWeight: "500", fontSize: T.sm },
});
