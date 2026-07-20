import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { moodByKey } from "@/src/moods";
import { MoodSelector } from "@/src/MoodSelector";
import { MoodEmoji } from "@/src/MoodEmoji";
import { Logo } from "@/src/Logo";
import { Screen, Display, AppText, Card, SectionTitle, Loading, spacing, radius, font, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Today() {
  const { t, lang, moods, user } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [screenAnswer, setScreenAnswer] = useState<boolean | null>(null);

  const LOW_MOODS = ["heavy", "anxious", "frustrated"];

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

  const quickLog = async (mood: string) => {
    try {
      await api.post("/checkins", { mood, context: [], note: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!LOW_MOODS.includes(mood)) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2200);
      } else {
        setJustSaved(false);
      }
      await load();
    } catch {}
  };

  if (loading) return <Screen><Loading /></Screen>;

  const greetKey = data?.greeting === "morning" ? "good_morning" : data?.greeting === "afternoon" ? "good_afternoon" : "good_evening";
  const noticeText = data?.day_notice?.text || data?.observation;

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
        <View style={styles.topBar}>
          <Logo size={40} />
        </View>
        <AppText style={styles.greet}>{t(greetKey)},</AppText>
        <Display style={styles.name}>{firstName(data?.name || user?.name)} 🌿</Display>

        {/* TIERED SUPPORT (moved up) — sits directly under the name so talking to a
            psychologist is the first thing offered. escalate = repeated-low +
            self-harm screening; gentle = single low today. */}
        {data?.support_tier === "escalate" && (
          <Card tint={colors.tintLav} style={{ marginTop: spacing.lg }} testID="escalate-card">
            <View style={styles.talkTag}>
              <Feather name="phone-call" size={12} color={colors.indigo} />
              <AppText style={styles.talkTagText}>{t("recommended_for_you")}</AppText>
            </View>
            <AppText style={styles.talkBody}>{t("escalate_copy")}</AppText>
            {screenAnswer === null ? (
              <>
                <AppText style={styles.screenQ}>{t("screening_q")}</AppText>
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                  <Pressable testID="screen-yes" onPress={() => { setScreenAnswer(true); router.push("/crisis"); }} style={styles.screenBtn}>
                    <AppText style={styles.screenBtnText}>{t("yes")}</AppText>
                  </Pressable>
                  <Pressable testID="screen-no" onPress={() => setScreenAnswer(false)} style={styles.screenBtn}>
                    <AppText style={styles.screenBtnText}>{t("no")}</AppText>
                  </Pressable>
                </View>
              </>
            ) : screenAnswer === false ? (
              <Pressable testID="escalate-book" onPress={() => router.push("/psychologists")} style={styles.talkBtn}>
                <Feather name="phone-call" size={16} color={colors.onSurfaceInverse} />
                <AppText style={styles.talkBtnText}>{t("book_15_min_call")}</AppText>
              </Pressable>
            ) : null}
          </Card>
        )}

        {data?.support_tier === "gentle" && (
          <Card style={{ marginTop: spacing.lg }} testID="gentle-card">
            <AppText style={styles.talkBody}>{t("support_gentle")}</AppText>
            <Pressable testID="gentle-talk" onPress={() => router.push("/psychologists")} style={styles.gentleLink}>
              <Feather name="phone-call" size={14} color={colors.indigo} />
              <AppText style={styles.gentleLinkText}>{t("talk_15_min")}</AppText>
            </Pressable>
          </Card>
        )}

        {/* Neutral state — keep a calm, always-available way to talk to a psychologist at the top */}
        {(!data?.support_tier || data?.support_tier === "none") && (
          <Card style={{ marginTop: spacing.lg }} testID="support-link-card">
            <Pressable testID="talk-link" onPress={() => router.push("/psychologists")} style={styles.gentleLink}>
              <Feather name="phone-call" size={14} color={colors.indigo} />
              <AppText style={styles.gentleLinkText}>{t("talk_15_min")}</AppText>
            </Pressable>
          </Card>
        )}

        {/* Observation (moved up) — "something you may want to notice", below the name */}
        {noticeText ? (
          <Card style={{ marginTop: spacing.lg }} testID="notice-card">
            <View style={styles.obsHead}>
              <Feather name="feather" size={16} color={colors.indigo} />
              <AppText style={styles.obsHeadText}>{t("notice_title")}</AppText>
            </View>
            <Display style={styles.obsText}>{noticeText}</Display>
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

        {/* Prominent inline mood check-in — shown every time the app opens */}
        <View style={styles.hero} testID="today-mood-hero">
          <Display style={styles.bannerQ}>{t("how_feeling")}</Display>
          <AppText style={styles.heroHint}>
            {data?.todays_count ? t("checkin_again") : t("tap_mood_hint")}
          </AppText>
          {justSaved ? (
            <View style={styles.savedPill} testID="quicklog-saved">
              <Feather name="check" size={14} color={colors.onSurface} />
              <AppText style={styles.savedPillText}>{t("thanks_checkin")}</AppText>
            </View>
          ) : null}
          <View style={{ height: spacing.md }} />
          <MoodSelector moods={moods} value={null} onChange={quickLog} lang={lang} pad={spacing.xl * 2 + spacing.lg * 2} />
          <Pressable testID="add-detail-button" onPress={() => router.push("/checkin")} style={styles.addDetail}>
            <Feather name="edit-3" size={16} color={colors.indigo} />
            <AppText style={styles.addDetailText}>{t("add_detail")}</AppText>
          </Pressable>
        </View>

        {/* Today's check-in entries (multiple per day allowed) */}
        {data?.todays_entries?.length ? (
          <Card style={{ marginTop: spacing.lg }} testID="todays-entries">
            <View style={styles.entriesHead}>
              <SectionTitle style={{ fontSize: T.lg, marginBottom: 0 }}>{t("todays_checkins_title")}</SectionTitle>
              <View style={styles.countPill}>
                <AppText style={styles.countPillText}>{data.todays_count} {t("entries_count")}</AppText>
              </View>
            </View>
            {data.todays_entries.map((e: any, i: number) => {
              const m = moodByKey(e.mood, moods);
              return (
                <View key={i} style={[styles.entryRow, i < data.todays_entries.length - 1 && styles.entryDivider]}>
                  <MoodEmoji mood={m} size={30} />
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.entryMood}>{m ? (lang === "hi" ? m.hi : m.en) : e.mood}</AppText>
                    {e.note ? <AppText style={styles.entryNote}>{e.note}</AppText> : null}
                    {e.context?.length ? <AppText style={styles.entryCtx}>{e.context.map((c: string) => t(`ctx_${c}`)).join(" · ")}</AppText> : null}
                  </View>
                  <AppText style={styles.entryTime}>{fmtTime(e.created_at)}</AppText>
                </View>
              );
            })}
            <AppText style={styles.multiNote}>{t("multi_note")}</AppText>
          </Card>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function firstName(full?: string) {
  if (!full) return "there";
  return full.trim().split(/\s+/)[0];
}

function fmtTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 100 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  talkNow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.tintRose, borderRadius: radius.pill, paddingHorizontal: spacing.md, height: 38 },
  talkNowText: { color: colors.rose, fontWeight: "700", fontSize: T.sm },
  greet: { color: colors.onSurfaceSecondary, fontSize: T.lg },
  name: { fontSize: 28, marginTop: 2 },
  banner: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  hero: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  heroHint: { color: colors.onSurfaceSecondary, fontSize: T.base, marginTop: 4 },
  savedPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: colors.tintSage, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: spacing.sm },
  savedPillText: { color: colors.onSurface, fontSize: T.sm, fontWeight: "600" },
  lowPrompt: { backgroundColor: colors.tintLav, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md },
  lowPromptThanks: { color: colors.onSurfaceSecondary, fontSize: T.sm, marginBottom: 2 },
  lowPromptText: { color: colors.onSurface, fontSize: T.lg, fontWeight: "500", marginBottom: spacing.md },
  lowPromptRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lowPromptBook: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.indigo, borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 44 },
  lowPromptBookText: { color: colors.onSurfaceInverse, fontWeight: "600", fontSize: T.base },
  lowPromptDismiss: { height: 44, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center" },
  lowPromptDismissText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
  addDetail: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.sm, height: 44 },
  addDetailText: { color: colors.indigo, fontWeight: "600", fontSize: T.base },
  entriesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  countPill: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  countPillText: { color: colors.onSurfaceSecondary, fontSize: T.sm, fontWeight: "500" },
  entryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  entryDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  entryEmoji: { fontSize: 28 },
  entryMood: { fontSize: T.lg, color: colors.onSurface, fontWeight: "500" },
  entryNote: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  entryCtx: { fontSize: T.sm, color: colors.indigo, marginTop: 2 },
  entryTime: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  multiNote: { fontSize: T.sm, color: colors.onSurfaceSecondary, fontStyle: "italic", marginTop: spacing.md },
  talkTag: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  talkTagText: { color: colors.indigo, fontSize: T.sm, fontWeight: "600" },
  talkTitle: { fontSize: T.xl, lineHeight: 28, marginBottom: 4 },
  talkBody: { color: colors.onSurfaceSecondary, fontSize: T.base, lineHeight: 22, marginBottom: spacing.lg },
  talkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.indigo, borderRadius: radius.pill, height: 50 },
  talkBtnText: { color: colors.onSurfaceInverse, fontWeight: "600", fontSize: T.lg },
  screenQ: { color: colors.onSurface, fontSize: T.base, fontWeight: "500", lineHeight: 22 },
  screenBtn: { flex: 1, height: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  screenBtnText: { color: colors.onSurface, fontWeight: "600", fontSize: T.base },
  gentleLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  gentleLinkText: { color: colors.indigo, fontWeight: "600", fontSize: T.base },
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
