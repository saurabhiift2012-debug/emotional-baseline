import React, { useEffect, useState } from "react";
import { Modal, View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "./AppContext";
import { api } from "./api";
import { profileFor } from "./psychologistProfiles";
import { AppText, Display, spacing, radius, T, useTheme, useThemedStyles } from "./ui";

// A warm, prominent pop-up shown right after a LOW-mood check-in
// (Heavy / Anxious / Frustrated). Surfaces the psychologist's NEXT available
// slot and offers a one-tap path to book a 15-minute call.
// Navigation is delegated to the parent via `onBook` — pushing a route from
// inside a react-native Modal is unreliable, so the parent schedules it after
// the modal has closed.
export function LowMoodPrompt({ visible, onClose, onBook }: { visible: boolean; onClose: () => void; onBook: (psyId: string) => void }) {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(true);
  const [psy, setPsy] = useState<any>(null);
  const [nextSlot, setNextSlot] = useState<any>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const list = await api.get("/psychologists");
        const first = (list.psychologists || [])[0];
        if (first) {
          const detail = await api.get(`/psychologists/${first.id}`);
          if (!alive) return;
          setPsy(detail);
          setNextSlot((detail.availability || [])[0] || null);
        }
      } catch {}
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [visible]);

  const book = () => {
    if (!psy) return;
    const pid = psy.id;
    onClose();
    onBook(pid);
  };

  const prof = psy ? profileFor(psy.slug) : {};

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="low-mood-prompt">
          <View style={styles.heartWrap}>
            <Feather name="heart" size={26} color={colors.rose} />
          </View>
          <Display style={styles.title}>{t("low_prompt_title")}</Display>
          <AppText style={styles.body}>{t("low_prompt_body")}</AppText>

          <View style={styles.card}>
            {loading ? (
              <ActivityIndicator color={colors.indigo} style={{ paddingVertical: spacing.lg }} />
            ) : psy ? (
              <>
                <AppText style={styles.psyName}>{psy.name}</AppText>
                {prof.credential ? <AppText style={styles.psyCred}>{prof.credential}</AppText> : null}
                {nextSlot ? (
                  <View style={styles.slotRow}>
                    <Feather name="clock" size={15} color={colors.indigo} />
                    <AppText style={styles.slotText}>
                      {t("low_prompt_next_slot")}: <AppText style={styles.slotStrong}>{nextSlot.label}</AppText>
                    </AppText>
                  </View>
                ) : null}
                <AppText style={styles.price}>₹{psy.short_call_price ?? psy.price} · {t("min_call")}</AppText>
              </>
            ) : (
              <AppText style={styles.psyCred}>{t("low_prompt_want_talk")}</AppText>
            )}
          </View>

          <Pressable
            testID="low-prompt-book"
            onPress={book}
            disabled={loading || !psy}
            style={[styles.primaryBtn, (loading || !psy) && { opacity: 0.5 }]}
          >
            <Feather name="phone-call" size={17} color={colors.onSurfaceInverse} />
            <AppText style={styles.primaryBtnText}>
              {nextSlot ? t("low_prompt_book_slot") : t("low_prompt_see_slots")}
            </AppText>
          </Pressable>

          <Pressable testID="low-prompt-dismiss" onPress={onClose} style={styles.dismiss} hitSlop={8}>
            <AppText style={styles.dismissText}>{t("low_prompt_not_now")}</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center" },
  heartWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.tintRose, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { fontSize: 24, textAlign: "center", lineHeight: 32 },
  body: { fontSize: T.base, color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 22, marginTop: spacing.sm },
  card: { width: "100%", backgroundColor: colors.tintWarm, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg, alignItems: "center" },
  psyName: { fontSize: T.xl, fontWeight: "700", color: colors.onSurface },
  psyCred: { fontSize: T.sm, color: colors.indigo, fontWeight: "600", marginTop: 2 },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 7 },
  slotText: { fontSize: T.base, color: colors.onSurface },
  slotStrong: { fontWeight: "700", color: colors.onSurface },
  price: { fontSize: T.base, color: colors.onSurfaceSecondary, fontWeight: "600", marginTop: spacing.md },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.indigo, borderRadius: radius.pill, height: 54, width: "100%", marginTop: spacing.lg },
  primaryBtnText: { color: colors.onSurfaceInverse, fontWeight: "700", fontSize: T.lg },
  dismiss: { height: 46, alignItems: "center", justifyContent: "center", marginTop: spacing.xs },
  dismissText: { color: colors.onSurfaceSecondary, fontWeight: "500", fontSize: T.base },
});
