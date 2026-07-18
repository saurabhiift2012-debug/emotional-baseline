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
import { CrisisSheet } from "@/src/CrisisSheet";
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
  const [lowPrompt, setLowPrompt] = useState(false);
  const [crisis, setCrisis] = useState(false);

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
      if (LOW_MOODS.includes(mood)) {
        setLowPrompt(true);
        setJustSaved(false);
      } else {
        setLowPrompt(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2200);
      }
      await load();
    } catch {}
  };

  if (loading) return <Screen><Loading /></Screen>;

  const greetKey = data?.greeting === "morning" ? "good_morning" : data?.greeting === "afternoon" ? "good_afternoon" : "good_evening";
  const step = data?.small_step;
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
          <Pressable testID="need-talk-now" onPress={() => setCrisis(true)} style={styles.talkNow}>
            <Feather name="phone-call" size={14} color={colors.rose} />
            <AppText style={styles.talkNowText}>{t("need_to_talk_now")}</AppText>
          </Pressable>
        </View>
        <AppText style={styles.greet}>{t(greetKey)},</AppText>
        <Display style={styles.name}>{firstName(data?.name || user?.name)} 🌿</Display>

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
          {lowPrompt ? (
            <View style={styles.lowPrompt} testID="low-mood-prompt">
              <AppText style={styles.lowPromptThanks}>{t("thanks_checkin")}</AppText>
              <AppText style={styles.lowPromptText}>{t("talk_title")}</AppText>
              <View style={styles.lowPromptRow}>
                <Pressable testID="low-prompt-book" onPress={() => { setLowPrompt(false); router.push("/psychologists"); }} style={styles.lowPromptBook}>
                  <Feather name="phone-call" size={15} color={colors.onSurfaceInverse} />
                  <AppText style={styles.lowPromptBookText}>{t("book_15_call")}</AppText>
                </Pressable>
                <Pressable testID="low-prompt-dismiss" onPress={() => setLowPrompt(false)} style={styles.lowPromptDismiss}>
                  <AppText style={styles.lowPromptDismissText}>{t("im_okay")}</AppText>
                </Pressable>
              </View>
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

        {/* Talk to someone — 15-min paid call, suggested when feeling low */}
        {data?.call_recommended && (
          <Card tint={colors.tintLav} style={{ marginTop: spacing.lg }} testID="talk-card">
            <View style={styles.talkTag}>
              <Feather name="phone-call" size={12} color={colors.indigo} />
              <AppText style={styles.talkTagText}>{t("recommended_for_you")}</AppText>
            </View>
            <Display style={styles.talkTitle}>{t("talk_title")}</Display>
            <AppText style={styles.talkBody}>{t("talk_body")}</AppText>
            <Pressable testID="book-call-button" onPress={() => router.push("/psychologists")} style={styles.talkBtn}>
              <Feather name="phone-call" size={16} color={colors.onSurfaceInverse} />
              <AppText style={styles.talkBtnText}>{t("book_15_call")}</AppText>
            </Pressable>
          </Card>
        )}

        {/* Observation */}
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

        {/* One small step */}
        {step && (
          <Card tint={colors.tintSage} style={{ marginTop: spacing.lg }}>
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
      <CrisisSheet visible={crisis} onClose={() => setCrisis(false)} />
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
