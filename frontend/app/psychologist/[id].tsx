import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { profileFor, availabilitySignal } from "@/src/psychologistProfiles";
import { PsychologistAvatar } from "@/src/PsychologistAvatar";
import { Logo } from "@/src/Logo";
import { Screen, Display, AppText, Card, Loading, PrimaryButton, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";
import { RazorpayCheckout, RzpOrder, RzpSuccess } from "@/src/RazorpayCheckout";

export default function PsychologistDetail() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<any>(null);
  const [order, setOrder] = useState<RzpOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const startPayment = async () => {
    if (!slot || !sessionType) return;
    setErr(null); setBooking(true);
    try {
      const res = await api.post("/bookings/order", { psychologist_id: id, slot_id: slot, session_type: sessionType });
      setOrder(res);
    } catch (e: any) { setErr(e.message || t("payment_failed")); }
    finally { setBooking(false); }
  };

  const onPaid = async (data: RzpSuccess, bookingId: string) => {
    setOrder(null); setBooking(true);
    try {
      const res = await api.post("/bookings/verify", { booking_id: bookingId, ...data });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmed(res.booking);
    } catch (e: any) { setErr(e.message || t("payment_failed")); }
    finally { setBooking(false); }
  };

  const priceFor = (type: string | null) =>
    type === "15-min Call" ? (p?.short_call_price ?? p?.price) : p?.price;

  if (loading) return <Screen><Loading /></Screen>;
  if (!p) return <Screen><View style={styles.header}><Pressable onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.onSurface} /></Pressable></View></Screen>;

  const selectedPrice = priceFor(sessionType);
  const prof = profileFor(p.slug);
  const bio = prof.bio || p.bio;
  const avail = availabilitySignal(p.availability, t);
  const sessionTypes = (p.session_types || []).filter((s: string) => s !== "Chat");
  const firstName = (p.name || "").replace(/^(Dr\.?|Ms\.?|Mr\.?|Mrs\.?)\s+/i, "").split(/\s+/)[0];

  if (confirmed) {
    const prof = profileFor(confirmed.slug || p?.slug);
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.confirmWrap}>
          <Logo size={40} />
          <View style={{ height: spacing.lg }} />
          <PsychologistAvatar photo={prof.photo} size={88} />
          <Display style={styles.confirmTitle}>
            {confirmed.psychologist_name} {t("will_call_you_at")} {confirmed.slot_label}
          </Display>
          <AppText style={styles.confirmSub}>{t("call_confirm_sub")}</AppText>
          <Card tint={colors.tintWarm} style={{ marginTop: spacing.xl, width: "100%" }}>
            {prof.credential ? <AppText style={styles.confCredential}>{prof.credential}</AppText> : null}
            <Row icon="phone-call" text={confirmed.session_type} />
            <Row icon="clock" text={confirmed.slot_label} />
            <Row icon="credit-card" text={`₹${confirmed.price} · ${t("paid_via")}`} />
          </Card>
          <View style={{ height: spacing.lg }} />
          <PrimaryButton testID="view-appointments-button" label={t("view_appointments")} onPress={() => { if (router.canGoBack()) router.back(); requestAnimationFrame(() => setTimeout(() => router.push("/appointments"), 300)); }} />
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
        {/* Warm, personal hero — a real person, not an automated screen */}
        <View style={styles.hero}>
          <PsychologistAvatar photo={prof.photo} size={96} />
          <View style={styles.nameRow}>
            <Display style={styles.name}>{p.name}</Display>
            {p.verified ? <View style={styles.verified}><Feather name="check" size={11} color={colors.surface} /><AppText style={styles.verifiedText}>{t("verified")}</AppText></View> : null}
          </View>
          {prof.credential ? <AppText style={styles.credential}>{prof.credential}</AppText> : null}
          {bio ? <AppText style={styles.bio}>{bio}</AppText> : null}
          {prof.licence ? <AppText style={styles.licence}>{prof.licence}</AppText> : null}
          <View style={styles.availPill}>
            <Feather name="clock" size={13} color={colors.indigo} />
            <AppText style={styles.availPillText}>{avail.text}</AppText>
          </View>
        </View>

        <Display style={styles.speakWith}>{t("speak_with")} {firstName}</Display>
        <AppText style={styles.talkThrough}>{t("talk_it_through")}</AppText>

        <AppText style={styles.sectionLabel}>{t("specializes_in")}</AppText>
        <AppText style={styles.value}>{p.specializations.join(" · ")}</AppText>
        <AppText style={styles.sectionLabel}>{t("languages_label")}</AppText>
        <AppText style={styles.value}>{p.languages.join(", ")}</AppText>

        {/* Session type */}
        <AppText style={styles.sectionLabel}>{t("session_type_label")}</AppText>
        <View style={styles.chipRow}>
          {sessionTypes.map((s: string) => (
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

        <AppText style={styles.mockNote}>{t("payment_secure_note")}</AppText>
        {err ? <AppText testID="booking-error" style={styles.err}>{err}</AppText> : null}
        <View style={{ height: spacing.md }} />
        <PrimaryButton
          testID="confirm-pay-button"
          icon="phone-call"
          label={`${t("book_15_min_call")} · ₹${selectedPrice}`}
          disabled={!slot || !sessionType || booking}
          onPress={startPayment}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
      <RazorpayCheckout
        order={order}
        onSuccess={onPaid}
        onDismiss={() => { setOrder(null); }}
        onError={(msg) => { setOrder(null); setErr(msg || t("payment_failed")); }}
      />
    </Screen>
  );
}

function Row({ icon, text }: { icon: any; text: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.confRow}>
      <Feather name={icon} size={16} color={colors.onSurfaceSecondary} />
      <AppText style={styles.confRowText}>{text}</AppText>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 40, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  hero: { alignItems: "center", backgroundColor: colors.tintWarm, borderRadius: radius.lg, padding: spacing.xl, paddingTop: spacing.lg },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  name: { fontSize: 24 },
  verified: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.sage, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 10, color: colors.surface, fontWeight: "600" },
  credential: { fontSize: T.base, color: colors.indigo, fontWeight: "700", marginTop: 4 },
  bio: { fontSize: T.lg, lineHeight: 24, color: colors.onSurface, marginTop: spacing.sm, textAlign: "center" },
  licence: { fontSize: 12, color: colors.onSurfaceSecondary, fontStyle: "italic", marginTop: spacing.sm, textAlign: "center" },
  availPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 7, marginTop: spacing.lg },
  availPillText: { fontSize: T.sm, color: colors.onSurface, fontWeight: "600" },
  speakWith: { fontSize: 22, marginTop: spacing.xl },
  talkThrough: { fontSize: T.base, color: colors.onSurfaceSecondary, marginTop: 4 },
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
  err: { color: colors.rose, marginTop: spacing.md },
  confirmWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing["3xl"], alignItems: "center" },
  confirmTitle: { fontSize: 24, textAlign: "center", marginTop: spacing.lg, lineHeight: 32 },
  confirmSub: { fontSize: T.base, color: colors.onSurfaceSecondary, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
  confCredential: { fontSize: T.sm, color: colors.indigo, fontWeight: "700", marginBottom: spacing.sm },
  confRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 6 },
  confRowText: { fontSize: T.base, color: colors.onSurface },
  closeBtn: { height: 48, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  closeText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
});
