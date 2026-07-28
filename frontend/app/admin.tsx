import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { adminAuth, adminApi } from "@/src/api";
import { Logo } from "@/src/Logo";
import { AdminPsychologists } from "@/src/AdminPsychologists";
import { Screen, Display, AppText, Card, PrimaryButton, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

type Metrics = {
  totals: { users: number; checkins: number; bookings: number; confirmed_bookings: number; pending_bookings: number };
  activity: { active_users_7d: number; active_users_30d: number; checkins_7d: number; checkins_30d: number };
  revenue: { amount: number; currency: string };
  trend: { date: string; checkins: number; active_users: number }[];
};
type ResourceDef = { key: string; en: string };
type AdminUser = { id: string; phone_masked: string; created_at: string; checkins: number; assigned_resources: string[] };

export default function Admin() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [resourceDefs, setResourceDefs] = useState<ResourceDef[]>([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const [savedUser, setSavedUser] = useState<string | null>(null);

  const loadAll = useCallback(async (tok: string, q = "") => {
    const apiA = adminApi(tok);
    const m = await apiA.get("/admin/metrics");
    const u = await apiA.get(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setMetrics(m);
    setUsers(u.users);
    setResourceDefs(u.resources);
  }, []);

  const unlock = async () => {
    if (!passcode.trim() || authLoading) return;
    setAuthLoading(true);
    setAuthErr("");
    try {
      const res = await adminAuth(passcode.trim());
      setToken(res.admin_token);
      await loadAll(res.admin_token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setAuthErr(e?.message || t("admin_wrong_passcode"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAuthLoading(false);
    }
  };

  const runSearch = async () => {
    if (!token) return;
    try { await loadAll(token, query.trim()); } catch {}
  };

  const toggleResource = async (u: AdminUser, key: string) => {
    if (!token) return;
    Haptics.selectionAsync();
    const has = u.assigned_resources.includes(key);
    const next = has ? u.assigned_resources.filter((k) => k !== key) : [...u.assigned_resources, key];
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, assigned_resources: next } : x)));
    setSavingUser(u.id);
    try {
      const res = await adminApi(token).put(`/admin/users/${u.id}/resources`, { assigned_resources: next });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, assigned_resources: res.assigned_resources } : x)));
      setSavedUser(u.id);
      setTimeout(() => setSavedUser((cur) => (cur === u.id ? null : cur)), 1200);
    } catch {
      // revert on failure
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, assigned_resources: u.assigned_resources } : x)));
    } finally {
      setSavingUser(null);
    }
  };

  // ---------- Passcode gate ----------
  if (!token) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable testID="admin-back" onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        <View style={styles.gate}>
          <Logo size={64} />
          <Display style={styles.gateTitle}>{t("admin_enter_passcode")}</Display>
          <TextInput
            testID="admin-passcode-input"
            value={passcode}
            onChangeText={(v) => { setPasscode(v); setAuthErr(""); }}
            placeholder={t("admin_passcode")}
            placeholderTextColor={colors.onSurfaceSecondary}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            onSubmitEditing={unlock}
            returnKeyType="go"
          />
          {!!authErr && <AppText style={styles.err}>{authErr}</AppText>}
          <View style={{ height: spacing.md }} />
          <PrimaryButton label={authLoading ? t("loading") : t("admin_unlock")} onPress={unlock} disabled={authLoading} testID="admin-unlock-btn" />
        </View>
      </Screen>
    );
  }

  // ---------- Dashboard ----------
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="admin-back" onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Display style={styles.title}>{t("admin_title")}</Display>
      </View>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        {!metrics ? (
          <ActivityIndicator color={colors.indigo} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            {/* Overview */}
            <AppText style={styles.section}>{t("admin_overview")}</AppText>
            <View style={styles.grid}>
              <Stat label={t("admin_total_users")} value={String(metrics.totals.users)} icon="users" color={colors.indigo} />
              <Stat label={t("admin_total_checkins")} value={String(metrics.totals.checkins)} icon="check-circle" color={colors.sage} />
              <Stat label={t("admin_total_bookings")} value={`${metrics.totals.confirmed_bookings}/${metrics.totals.bookings}`} icon="calendar" color={colors.amber} />
              <Stat label={t("admin_revenue")} value={`₹${metrics.revenue.amount.toLocaleString("en-IN")}`} icon="credit-card" color={colors.rose} />
            </View>

            {/* Activity */}
            <View style={styles.grid}>
              <Stat label={t("admin_active_7d")} value={String(metrics.activity.active_users_7d)} icon="activity" color={colors.indigo} />
              <Stat label={t("admin_active_30d")} value={String(metrics.activity.active_users_30d)} icon="trending-up" color={colors.sage} />
              <Stat label={t("admin_checkins_7d")} value={String(metrics.activity.checkins_7d)} icon="edit-3" color={colors.amber} />
            </View>

            {/* Trend */}
            <Card style={{ marginTop: spacing.md }}>
              <AppText style={styles.cardHead}>{t("admin_last7")}</AppText>
              <TrendBars trend={metrics.trend} colors={colors} />
            </Card>

            {/* Users & resources */}
            <AppText style={[styles.section, { marginTop: spacing.xl }]}>{t("admin_users")}</AppText>
            <AppText style={styles.hint}>{t("admin_users_hint")}</AppText>
            <View style={styles.searchRow}>
              <TextInput
                testID="admin-search"
                value={query}
                onChangeText={setQuery}
                placeholder={t("admin_search_phone")}
                placeholderTextColor={colors.onSurfaceSecondary}
                keyboardType="number-pad"
                style={[styles.input, { flex: 1, marginTop: 0 }]}
                onSubmitEditing={runSearch}
                returnKeyType="search"
              />
              <Pressable testID="admin-search-btn" onPress={runSearch} style={styles.searchBtn}>
                <Feather name="search" size={18} color={colors.onSurfaceInverse} />
              </Pressable>
            </View>

            {users.map((u) => {
              const isOpen = expanded === u.id;
              return (
                <Card key={u.id} style={{ marginTop: spacing.md }} testID={`admin-user-${u.id}`}>
                  <Pressable style={styles.userHead} onPress={() => { Haptics.selectionAsync(); setExpanded(isOpen ? null : u.id); }}>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.userPhone}>{u.phone_masked}</AppText>
                      <AppText style={styles.userMeta}>{u.checkins} {t("admin_checkins_short")} · {u.assigned_resources.length} unlocked</AppText>
                    </View>
                    {savedUser === u.id && <AppText style={styles.saved}>✓ {t("admin_resources_saved")}</AppText>}
                    {savingUser === u.id && <ActivityIndicator size="small" color={colors.indigo} style={{ marginRight: spacing.sm }} />}
                    <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.onSurfaceSecondary} />
                  </Pressable>
                  {isOpen && (
                    <View style={styles.resList}>
                      {resourceDefs.map((r) => {
                        const on = u.assigned_resources.includes(r.key);
                        return (
                          <Pressable
                            key={r.key}
                            testID={`admin-res-${u.id}-${r.key}`}
                            onPress={() => toggleResource(u, r.key)}
                            style={[styles.resRow, on && styles.resRowOn]}
                          >
                            <Feather name={on ? "check-circle" : "circle"} size={18} color={on ? colors.sage : colors.onSurfaceSecondary} />
                            <AppText style={[styles.resLabel, on && { color: colors.onSurface }]}>{r.en}</AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })}

            {/* Manage psychologists */}
            {token && <AdminPsychologists token={token} />}
          </>
        )}
        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </Card>
  );
}

function TrendBars({ trend, colors }: { trend: { date: string; checkins: number }[]; colors: any }) {
  const max = Math.max(1, ...trend.map((d) => d.checkins));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 90, marginTop: spacing.md }}>
      {trend.map((d) => {
        const h = Math.max(4, Math.round((d.checkins / max) * 70));
        const label = d.date.slice(5);
        return (
          <View key={d.date} style={{ alignItems: "center", flex: 1 }}>
            <AppText style={{ fontSize: 10, color: colors.onSurfaceSecondary, marginBottom: 2 }}>{d.checkins}</AppText>
            <View style={{ width: 14, height: h, borderRadius: 4, backgroundColor: colors.indigo }} />
            <AppText style={{ fontSize: 9, color: colors.onSurfaceSecondary, marginTop: 4 }}>{label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm, marginBottom: spacing.md, flexDirection: "row", alignItems: "center" },
  title: { fontSize: 26 },
  wrap: { paddingHorizontal: spacing.xl },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md, marginTop: -40 },
  gateTitle: { fontSize: 22, textAlign: "center", marginTop: spacing.md },
  input: { width: "100%", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: T.lg, color: colors.onSurface, marginTop: spacing.sm },
  err: { color: colors.rose, marginTop: spacing.sm, fontWeight: "600" },
  section: { fontSize: T.xl, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  stat: { flexBasis: "47%", flexGrow: 1, gap: spacing.xs },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.onSurface },
  statLabel: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  cardHead: { fontSize: T.base, fontWeight: "600", color: colors.onSurface },
  hint: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginBottom: spacing.md, marginTop: -spacing.xs },
  searchRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  searchBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.indigo, alignItems: "center", justifyContent: "center" },
  userHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  userPhone: { fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  userMeta: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  saved: { color: colors.sage, fontWeight: "600", marginRight: spacing.sm, fontSize: T.sm },
  resList: { marginTop: spacing.md, gap: spacing.sm },
  resRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceSecondary },
  resRowOn: { backgroundColor: colors.sage + "1A" },
  resLabel: { flex: 1, fontSize: T.base, color: colors.onSurfaceSecondary },
});
