import React, { useEffect, useRef, useState } from "react";
import { Modal, View, StyleSheet, AppState, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useSegments } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "./AppContext";
import { api } from "./api";
import { MoodSelector } from "./MoodSelector";
import { LowMoodPrompt } from "./LowMoodPrompt";
import { Display, AppText, spacing, T, useTheme, useThemedStyles } from "./ui";

// Forces a mood selection every time the user comes to the app:
//  • on cold start / right after signing in, and
//  • every time the app returns to the foreground.
// The gate can only be dismissed by picking a mood (or opening the full
// check-in for more detail).
export function MoodGate() {
  const { user, moods, lang, t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const [visible, setVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const appState = useRef(AppState.currentState);
  const hadUser = useRef(false);

  const seg = segments.join("/");
  // Never gate the auth flow or a crisis moment.
  const suppressed =
    seg.includes("crisis") || seg.includes("login") || seg.includes("register") ||
    seg.includes("onboarding") || seg === "";

  // Show on cold start / immediately after authentication.
  useEffect(() => {
    if (user && !hadUser.current) {
      hadUser.current = true;
      setVisible(true);
    }
    if (!user) hadUser.current = false;
  }, [user]);

  // Show every time the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (next === "active" && (prev === "background" || prev === "inactive") && user) {
        setVisible(true);
      }
    });
    return () => sub.remove();
  }, [user]);

  const pick = async (mood: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVisible(false);
    const isLow = moods.find((m) => m.key === mood)?.group === "low";
    try {
      await api.post("/checkins", { mood, context: [], note: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
    } catch {}
    if (isLow) setPromptVisible(true);
  };

  if (!user || suppressed) return null;

  return (
    <>
      <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
          <Display style={styles.q}>{t("how_feeling")}</Display>
          <AppText style={styles.sub}>{t("tap_mood_hint")}</AppText>
          <View style={{ height: spacing.xl }} />
          <MoodSelector moods={moods} value={null} onChange={pick} lang={lang} />
          <Pressable testID="gate-add-detail" onPress={() => { setVisible(false); router.push("/checkin"); }} style={styles.detail}>
            <Feather name="edit-3" size={16} color={colors.indigo} />
            <AppText style={styles.detailText}>{t("add_detail")}</AppText>
          </Pressable>
        </View>
      </Modal>
      <LowMoodPrompt
        visible={promptVisible}
        onClose={() => setPromptVisible(false)}
        onBook={(pid) => requestAnimationFrame(() => setTimeout(() => router.push({ pathname: "/psychologist/[id]", params: { id: pid, next: "1" } }), 350))}
      />
    </>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, justifyContent: "center" },
  q: { fontSize: 28, marginTop: spacing.xl },
  sub: { fontSize: T.lg, color: colors.onSurfaceSecondary, marginTop: spacing.sm },
  detail: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.lg, height: 44 },
  detailText: { color: colors.indigo, fontWeight: "600", fontSize: T.base },
});
