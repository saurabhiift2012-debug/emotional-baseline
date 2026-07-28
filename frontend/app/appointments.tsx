import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { Screen, Display, AppText, Card, Loading, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Appointments() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const d = await api.get("/bookings"); setList(d.bookings || []); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cancel = async (id: string) => {
    Haptics.selectionAsync();
    try { await api.post(`/bookings/${id}/cancel`); await load(); } catch {}
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="appt-back" onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerRow}>
          <Display style={styles.title}>{t("appointments_title")}</Display>
          <Pressable testID="appt-bell" onPress={() => router.push("/notifications")} hitSlop={10} style={styles.bell}>
            <Feather name="bell" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <AppText style={styles.empty}>{t("no_appointments")}</AppText>
          ) : list.map((b) => (
            <Card key={b.id} style={{ marginBottom: spacing.md }} testID={`appt-${b.id}`}>
              <View style={styles.topRow}>
                <AppText style={styles.name}>{b.psychologist_name}</AppText>
                <ApptStatus status={b.status} colors={colors} styles={styles} />
              </View>
              <Row icon="clock" text={b.slot_label} />
              <Row icon="video" text={b.session_type} />
              <Row icon="credit-card" text={`₹${b.price} · ${t("paid")}`} />
              {b.status !== "cancelled" && b.status !== "declined" ? (
                <Pressable testID={`cancel-${b.id}`} onPress={() => cancel(b.id)} style={styles.cancelBtn}>
                  <AppText style={styles.cancelText}>{t("cancel_booking")}</AppText>
                </Pressable>
              ) : null}
            </Card>
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </Screen>
  );
}

function ApptStatus({ status, colors, styles }: any) {
  const META: Record<string, { label: string; bg: string; fg: string }> = {
    awaiting_confirmation: { label: "Awaiting confirmation", bg: colors.tintWarm, fg: colors.amber },
    accepted: { label: "Confirmed", bg: colors.tintSage, fg: colors.onSurface },
    rescheduled: { label: "Rescheduled — review", bg: colors.tintWarm, fg: colors.indigo },
    declined: { label: "Declined", bg: colors.tintRose, fg: colors.rose },
    cancelled: { label: "Cancelled", bg: colors.tintRose, fg: colors.rose },
  };
  const m = META[status] || { label: status, bg: colors.surfaceSecondary, fg: colors.onSurface };
  return (
    <View style={[styles.status, { backgroundColor: m.bg }]}>
      <AppText style={[styles.statusText, { color: m.fg }]}>{m.label}</AppText>
    </View>
  );
}

function Row({ icon, text }: { icon: any; text: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={colors.onSurfaceSecondary} />
      <AppText style={styles.rowText}>{text}</AppText>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm, marginBottom: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26 },
  wrap: { paddingHorizontal: spacing.xl },
  empty: { textAlign: "center", color: colors.onSurfaceSecondary, marginTop: spacing["3xl"], fontSize: T.lg },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  name: { fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  status: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  statusOk: { backgroundColor: colors.tintSage },
  statusCancel: { backgroundColor: colors.tintRose },
  statusText: { fontSize: T.sm, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 5 },
  rowText: { fontSize: T.base, color: colors.onSurface },
  cancelBtn: { marginTop: spacing.md, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.rose, fontWeight: "500" },
});
