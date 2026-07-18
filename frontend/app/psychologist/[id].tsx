import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { Screen, Display, AppText, Card, Loading, PrimaryButton, colors, spacing, radius, T } from "@/src/ui";

export default function PsychologistDetail() {
  const { t } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get(`/psychologists/${id}`);
        setP(d);
        setSessionType(d.session_types?.[0] || null);
      } catch { setP(null); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const book = async () => {
    if (!slot || !sessionType) return;
    setBooking(true);
    try {
      const res = await api.post("/bookings", { psychologist_id: id, slot_id: slot, session_type: sessionType, payment_token: "mock" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmed(res.booking);
    } catch {}
    finally { setBooking(false); }
  };

  const priceFor = (type: string | null) =>
    type === "15-min Call" ? (p?.short_call_price ?? p?.price) : p?.price;

  if (loading) return <Screen><Loading /></Screen>;
  if (!p) return <Screen><View style={styles.header}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.onSurface} /></Pressable></View></Screen>;

  const selectedPrice = priceFor(sessionType);

  if (confirmed) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.confirmWrap}>
          <View style={styles.confirmIcon}><Feather name="check" size={34} color={colors.surface} /></View>
          <Display style={styles.confirmTitle}>{t("booking_confirmed")}</Display>
          <Card style={{ marginTop: spacing.xl, width: "100%" }}>
            <AppText style={styles.cName}>{confirmed.psychologist_name}</AppText>
            <Row icon="clock" text={confirmed.slot_label} />
            <Row icon="video" text={confirmed.session_type} />
            <Row icon="credit-card" text={`₹${confirmed.price} · ${t("paid")} (${confirmed.payment.provider})`} />
          </Card>
          <AppText style={styles.mockNote}>{t("payment_mock_note")}</AppText>
          <View style={{ height: spacing.lg }} />
          <PrimaryButton testID="view-appointments-button" label={t("view_appointments")} onPress={() => { router.back(); router.push("/appointments"); }} />
          <Pressable testID="confirm-close" onPress={() => router.back()} style={styles.closeBtn}><AppText style={styles.closeText}>{t("done")}</AppText></Pressable>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="detail-back" onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.avatar}><Feather name="user" size={28} color={colors.indigo} /></View>
          <View style={styles.nameRow}>
            <Display style={styles.name}>{p.name}</Display>
            {p.verified ? <View style={styles.verified}><Feather name="check" size={11} color={colors.surface} /><AppText style={styles.verifiedText}>{t("verified")}</AppText></View> : null}
          </View>
          <AppText style={styles.qual}>{p.qualifications} · {p.experience_years} {t("years_exp")}</AppText>
        </View>

        <AppText style={styles.bio}>{p.bio}</AppText>

        <AppText style={styles.sectionLabel}>{t("specializes_in")}</AppText>
        <AppText style={styles.value}>{p.specializations.join(" · ")}</AppText>
        <AppText style={styles.sectionLabel}>{t("languages_label")}</AppText>
        <AppText style={styles.value}>{p.languages.join(", ")}</AppText>

        {/* Session type */}
        <AppText style={styles.sectionLabel}>{t("session_type_label")}</AppText>
        <View style={styles.chipRow}>
          {p.session_types.map((s: string) => (
            <Pressable key={s} testID={`session-type-${s}`} onPress={() => { Haptics.selectionAsync(); setSessionType(s); }} style={[styles.chip, sessionType === s && styles.chipActive]}>
              <AppText style={[styles.chipText, sessionType === s && styles.chipTextActive]}>{s} · ₹{priceFor(s)}</AppText>
            </Pressable>
          ))}
        </View>

        {/* Slots */}
        <AppText style={styles.sectionLabel}>{t("choose_slot")}</AppText>
        <View style={styles.slotWrap}>
          {p.availability.map((s: any) => (
            <Pressable key={s.id} testID={`slot-${s.id}`} onPress={() => { Haptics.selectionAsync(); setSlot(s.id); }} style={[styles.slot, slot === s.id && styles.slotActive]}>
              <AppText style={[styles.slotText, slot === s.id && styles.slotTextActive]}>{s.label}</AppText>
            </Pressable>
          ))}
        </View>

        <AppText style={styles.mockNote}>{t("payment_mock_note")}</AppText>
        <View style={{ height: spacing.md }} />
        <PrimaryButton
          testID="confirm-pay-button"
          label={`${t("confirm_pay")} · ₹${selectedPrice}`}
          disabled={!slot || !sessionType || booking}
          onPress={book}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function Row({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.confRow}>
      <Feather name={icon} size={16} color={colors.onSurfaceSecondary} />
      <AppText style={styles.confRowText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 40, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  top: { alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: 24 },
  verified: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.sage, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 10, color: colors.surface, fontWeight: "600" },
  qual: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 4 },
  bio: { fontSize: T.lg, lineHeight: 24, color: colors.onSurface, marginTop: spacing.xl, textAlign: "center" },
  sectionLabel: { fontSize: T.sm, color: colors.onSurfaceSecondary, textTransform: "uppercase", letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.xs },
  value: { fontSize: T.lg, color: colors.onSurface },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: { height: 44, borderRadius: radius.pill, paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  chipText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
  chipTextActive: { color: colors.onSurfaceInverse },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  slotActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  slotText: { fontSize: T.base, color: colors.onSurface },
  slotTextActive: { color: colors.onSurface, fontWeight: "600" },
  mockNote: { fontSize: T.sm, color: colors.onSurfaceSecondary, fontStyle: "italic", marginTop: spacing.lg },
  confirmWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing["3xl"], alignItems: "center" },
  confirmIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.sage, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  confirmTitle: { fontSize: 26, textAlign: "center" },
  cName: { fontSize: T.xl, fontWeight: "600", color: colors.onSurface, marginBottom: spacing.md },
  confRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 6 },
  confRowText: { fontSize: T.base, color: colors.onSurface },
  closeBtn: { height: 48, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  closeText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
});
