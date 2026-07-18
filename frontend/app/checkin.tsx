import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { MoodSelector } from "@/src/MoodSelector";
import { CONTEXT_TAGS } from "@/src/moods";
import { Screen, Display, AppText, PrimaryButton, GhostButton, IconChip, colors, spacing, radius, font, T } from "@/src/ui";

type Step = "mood" | "context" | "done";

export default function CheckIn() {
  const { t, lang, moods } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>("mood");
  const [mood, setMood] = useState<string | null>(null);
  const [ctx, setCtx] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [lowMood, setLowMood] = useState(false);

  const toggleCtx = (tag: string) =>
    setCtx((prev) => (prev.includes(tag) ? prev.filter((c) => c !== tag) : [...prev, tag]));

  const save = async () => {
    if (!mood) return;
    setBusy(true);
    try {
      const res = await api.post("/checkins", { mood, context: ctx, note: note || null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
      setLowMood(!!res.low_mood);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } catch (e) {
      setStep("done");
    } finally {
      setBusy(false);
    }
  };

  const close = () => router.back();

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="checkin-close" onPress={close} hitSlop={12}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
      </View>

      {step === "mood" && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Display style={styles.q}>{t("pick_mood")}</Display>
          <AppText style={styles.sub}>{t("thanks_checkin")}</AppText>
          <View style={{ height: spacing.xl }} />
          <MoodSelector moods={moods} value={mood} onChange={setMood} lang={lang} />
        </ScrollView>
      )}

      {step === "context" && (
        <KeyboardAwareScrollView contentContainerStyle={styles.body} bottomOffset={90} keyboardShouldPersistTaps="handled">
          <Display style={styles.q}>{t("context_q")}</Display>
          <View style={styles.chipsWrap}>
            {CONTEXT_TAGS.map((tag) => (
              <IconChip
                key={tag}
                testID={`context-chip-${tag}`}
                label={t(`ctx_${tag}`)}
                active={ctx.includes(tag)}
                onPress={() => toggleCtx(tag)}
              />
            ))}
          </View>
          <AppText style={[styles.sub, { marginTop: spacing.xl }]}>{t("add_note")}</AppText>
          <TextInput
            testID="checkin-note-input"
            style={styles.note}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="…"
            placeholderTextColor={colors.onSurfaceSecondary}
          />
        </KeyboardAwareScrollView>
      )}

      {step === "done" && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.doneIcon}>
            <Feather name="check" size={30} color={colors.surface} />
          </View>
          <Display style={[styles.q, { textAlign: "center" }]}>{t("thanks_checkin")}</Display>

          {lowMood ? (
            <View style={{ marginTop: spacing.xl }}>
              <AppText style={[styles.sub, { textAlign: "center", marginBottom: spacing.lg }]}>{t("helpful_now")}</AppText>
              <OptionRow icon="compass" label={t("see_affecting")} onPress={() => { close(); router.push("/(tabs)/insights"); }} testID="low-see-affecting" />
              <OptionRow icon="wind" label={t("take_step")} onPress={() => { close(); router.push("/(tabs)/support"); }} testID="low-take-step" />
              <OptionRow icon="user-plus" label={t("connect_psych")} onPress={() => { close(); router.push("/(tabs)/support"); }} testID="low-connect" />
              <OptionRow icon="check-circle" label={t("im_okay")} onPress={close} testID="low-okay" />
            </View>
          ) : (
            <View style={{ marginTop: spacing.xl, width: "100%" }}>
              <PrimaryButton testID="checkin-done-button" label={t("done")} onPress={close} />
            </View>
          )}
        </ScrollView>
      )}

      {step !== "done" && (
        <View style={styles.footer}>
          {step === "mood" && (
            <PrimaryButton testID="mood-continue-button" label={t("continue")} disabled={!mood} onPress={() => setStep("context")} />
          )}
          {step === "context" && (
            <>
              <PrimaryButton testID="save-checkin-button" label={t("save_checkin")} disabled={busy} onPress={save} />
              <GhostButton testID="skip-context-button" label={t("skip")} onPress={save} />
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

function OptionRow({ icon, label, onPress, testID }: { icon: any; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.optRow, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.optIcon}>
        <Feather name={icon} size={18} color={colors.indigo} />
      </View>
      <AppText style={styles.optLabel}>{label}</AppText>
      <Feather name="chevron-right" size={20} color={colors.onSurfaceSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 44, justifyContent: "center" },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 120 },
  q: { fontSize: 26, lineHeight: 34 },
  sub: { color: colors.onSurfaceSecondary, fontSize: T.lg, marginTop: spacing.sm },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl },
  note: {
    minHeight: 90, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg, fontFamily: font.body, fontSize: T.lg, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, textAlignVertical: "top",
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm, gap: spacing.xs },
  doneIcon: { alignSelf: "center", width: 66, height: 66, borderRadius: 33, backgroundColor: colors.sage, alignItems: "center", justifyContent: "center", marginTop: spacing["2xl"], marginBottom: spacing.lg },
  optRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  optIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  optLabel: { flex: 1, fontSize: T.lg, color: colors.onSurface },
});
