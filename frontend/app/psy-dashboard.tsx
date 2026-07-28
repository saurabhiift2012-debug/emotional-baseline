import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { connectRealtime } from "@/src/realtime";
import { Screen, Display, AppText, Card, Loading, PrimaryButton, GhostButton, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

type Booking = {
  id: string; psychologist_name: string; slot_label: string; slot_id: string;
  session_type: string; price: number; status: string; user_id: string;
};

const STATUS_META: Record<string, { label: string; tint: keyof any; color: keyof any }> = {
  awaiting_confirmation: { label: "Awaiting your response", tint: "tintWarm", color: "amber" },
  accepted: { label: "Accepted", tint: "tintSage", color: "sage" },
  rescheduled: { label: "Rescheduled", tint: "tintWarm", color: "indigo" },
  declined: { label: "Declined", tint: "tintRose", color: "rose" },
  cancelled: { label: "Cancelled by client", tint: "tintRose", color: "rose" },
};

export default function PsyDashboard() {
  const { user, logout } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [reschedule, setReschedule] = useState<Booking | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    try { const d = await api.get("/psy/bookings"); setList(d.bookings || []); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Realtime: new bookings + status changes stream in instantly.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ws = await connectRealtime((msg) => {
        if (msg?.event === "booking_new" || msg?.event === "booking_updated" || msg?.event === "notification") {
          load();
        }
      });
      if (!mounted) { ws?.close(); return; }
      wsRef.current = ws;
      if (ws) { ws.onopen = () => setLive(true); ws.addEventListener?.("close", () => setLive(false)); }
    })();
    return () => { mounted = false; wsRef.current?.close(); };
  }, [load]);

  const act = async (b: Booking, action: "accept" | "decline") => {
    Haptics.selectionAsync();
    setBusy(b.id);
    try { await api.post(`/psy/bookings/${b.id}/${action}`); await load(); }
    catch {} finally { setBusy(null); }
  };

  const openReschedule = async (b: Booking) => {
    Haptics.selectionAsync();
    setReschedule(b);
    try {
      const d = await api.get(`/psychologists/${user?.psychologist_id}`);
      setSlots(d.availability || []);
    } catch { setSlots([]); }
  };

  const doReschedule = async (slotId: string) => {
    if (!reschedule) return;
    setBusy(reschedule.id);
    try { await api.post(`/psy/bookings/${reschedule.id}/reschedule`, { new_slot_id: slotId }); await load(); }
    catch {} finally { setBusy(null); setReschedule(null); }
  };

  if (!user || user.role !== "psychologist") {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText style={styles.empty}>This area is for psychologists only.</AppText>
          <View style={{ height: spacing.lg }} />
          <PrimaryButton label="Go to app" onPress={() => router.replace("/(tabs)")} />
        </View>
      </Screen>
    );
  }

  const pending = list.filter((b) => b.status === "awaiting_confirmation" || b.status === "rescheduled");
  const others = list.filter((b) => !(b.status === "awaiting_confirmation" || b.status === "rescheduled"));

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Display style={styles.title}>Bookings</Display>
          <View style={styles.liveRow}>
            <View style={[styles.dot, { backgroundColor: live ? colors.sage : colors.onSurfaceSecondary }]} />
            <AppText style={styles.liveText}>{live ? "Live" : "Reconnecting…"} · {user.name}</AppText>
          </View>
        </View>
        <Pressable testID="psy-logout" onPress={async () => { await logout(); router.replace("/"); }} hitSlop={10} style={styles.logout}>
          <Feather name="log-out" size={18} color={colors.onSurfaceSecondary} />
        </Pressable>
      </View>

      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
          <AppText style={styles.section}>New requests</AppText>
          {pending.length === 0 ? (
            <AppText style={styles.empty}>No new requests right now.</AppText>
          ) : pending.map((b) => (
            <Card key={b.id} style={{ marginBottom: spacing.md }} testID={`psy-booking-${b.id}`}>
              <StatusPill status={b.status} colors={colors} styles={styles} />
              <Row icon="clock" text={b.slot_label} styles={styles} colors={colors} />
              <Row icon="phone-call" text={`${b.session_type} · ₹${b.price}`} styles={styles} colors={colors} />
              <View style={styles.actions}>
                <Pressable testID={`accept-${b.id}`} disabled={busy === b.id} onPress={() => act(b, "accept")} style={[styles.actBtn, { backgroundColor: colors.sage }]}>
                  <Feather name="check" size={16} color="#fff" /><AppText style={styles.actText}>Accept</AppText>
                </Pressable>
                <Pressable testID={`reschedule-${b.id}`} disabled={busy === b.id} onPress={() => openReschedule(b)} style={[styles.actBtn, { backgroundColor: colors.indigo }]}>
                  <Feather name="calendar" size={16} color="#fff" /><AppText style={styles.actText}>Reschedule</AppText>
                </Pressable>
                <Pressable testID={`decline-${b.id}`} disabled={busy === b.id} onPress={() => act(b, "decline")} style={[styles.actBtn, { backgroundColor: colors.rose }]}>
                  <Feather name="x" size={16} color="#fff" /><AppText style={styles.actText}>Decline</AppText>
                </Pressable>
              </View>
            </Card>
          ))}

          {others.length > 0 && <AppText style={[styles.section, { marginTop: spacing.xl }]}>History</AppText>}
          {others.map((b) => (
            <Card key={b.id} style={{ marginBottom: spacing.md }} tint={colors.surfaceSecondary}>
              <StatusPill status={b.status} colors={colors} styles={styles} />
              <Row icon="clock" text={b.slot_label} styles={styles} colors={colors} />
            </Card>
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}

      <Modal visible={!!reschedule} transparent animationType="slide" onRequestClose={() => setReschedule(null)}>
        <View style={styles.modalWrap}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <AppText style={styles.sheetTitle}>Pick a new slot</AppText>
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={styles.slotWrap}>
              {slots.map((s) => (
                <Pressable key={s.id} testID={`re-slot-${s.id}`} onPress={() => doReschedule(s.id)} style={[styles.slot, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                  <AppText style={styles.slotText}>{s.label}</AppText>
                </Pressable>
              ))}
              {slots.length === 0 && <AppText style={styles.empty}>No slots available.</AppText>}
            </ScrollView>
            <GhostButton label="Cancel" onPress={() => setReschedule(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function StatusPill({ status, colors, styles }: any) {
  const meta = STATUS_META[status] || { label: status, tint: "surfaceSecondary", color: "onSurface" };
  return (
    <View style={[styles.pill, { backgroundColor: colors[meta.tint] }]}>
      <AppText style={[styles.pillText, { color: colors[meta.color] }]}>{meta.label}</AppText>
    </View>
  );
}

function Row({ icon, text, styles, colors }: any) {
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={colors.onSurfaceSecondary} />
      <AppText style={styles.rowText}>{text}</AppText>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 28 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  logout: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  section: { fontSize: T.lg, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  empty: { color: colors.onSurfaceSecondary, fontSize: T.base, textAlign: "center", marginVertical: spacing.lg },
  pill: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4, marginBottom: spacing.sm },
  pillText: { fontSize: T.sm, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 4 },
  rowText: { fontSize: T.base, color: colors.onSurface },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actBtn: { flex: 1, height: 44, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actText: { color: "#fff", fontWeight: "700", fontSize: T.sm },
  modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: spacing["2xl"] },
  sheetTitle: { fontSize: T.xl, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  slotText: { fontSize: T.base, color: colors.onSurface },
});
