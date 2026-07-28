import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "@/src/api";
import { connectRealtime } from "@/src/realtime";
import { Screen, Display, AppText, Card, Loading, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

const ICON: Record<string, any> = {
  new_booking: "calendar", payment_received: "credit-card",
  booking_accepted: "check-circle", booking_declined: "x-circle",
  booking_rescheduled: "clock", booking_cancelled: "slash",
};

export default function Notifications() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    try { const d = await api.get("/notifications"); setList(d.notifications || []); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    // Mark everything read shortly after viewing.
    const t = setTimeout(() => { api.post("/notifications/read-all").catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [load]));

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ws = await connectRealtime((msg) => { if (msg?.event === "notification") load(); });
      if (!mounted) { ws?.close(); return; }
      wsRef.current = ws;
    })();
    return () => { mounted = false; wsRef.current?.close(); };
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="notif-back" onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Display style={styles.title}>Notifications</Display>
      </View>
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <AppText style={styles.empty}>You're all caught up.</AppText>
          ) : list.map((n) => (
            <Pressable key={n.id} testID={`notif-${n.id}`} onPress={() => { if (n.action_url) router.push(n.action_url); }}>
              <Card style={{ marginBottom: spacing.md }} tint={n.read ? colors.surfaceSecondary : colors.tintWarm}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.indigo + "22" }]}>
                    <Feather name={ICON[n.type] || "bell"} size={16} color={colors.indigo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.nTitle}>{n.title}</AppText>
                    <AppText style={styles.nBody}>{n.body}</AppText>
                  </View>
                  {!n.read && <View style={[styles.unread, { backgroundColor: colors.amber }]} />}
                </View>
              </Card>
            </Pressable>
          ))}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 26 },
  wrap: { paddingHorizontal: spacing.xl },
  empty: { textAlign: "center", color: colors.onSurfaceSecondary, marginTop: spacing["3xl"], fontSize: T.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  nTitle: { fontSize: T.base, fontWeight: "700", color: colors.onSurface },
  nBody: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 2, lineHeight: 18 },
  unread: { width: 8, height: 8, borderRadius: 4 },
});
