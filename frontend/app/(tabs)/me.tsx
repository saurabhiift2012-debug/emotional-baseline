import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { Screen, Display, AppText, Card, SectionTitle, colors, spacing, radius, T } from "@/src/ui";

const CONSENTS = [
  "mood_history", "health_data", "sleep_data", "activity_data", "heart_data",
  "personal_insights", "ai_summaries", "psychologist_sharing", "analytics", "marketing",
];

export default function Me() {
  const { t, lang, user, setLang, logout, updateConsents } = useApp();
  const router = useRouter();
  const [consents, setConsents] = useState<Record<string, boolean>>(user?.consents || {});
  const [savedMsg, setSavedMsg] = useState(false);

  const toggle = async (key: string) => {
    const next = { ...consents, [key]: !consents[key] };
    setConsents(next);
    Haptics.selectionAsync();
    try {
      await updateConsents({ [key]: next[key] });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 1200);
    } catch {}
  };

  const doLogout = async () => { await logout(); router.replace("/onboarding"); };
  const deleteMood = async () => { try { await api.del("/me/data?scope=mood"); } catch {} };
  const deleteAccount = async () => { try { await api.del("/me/data?scope=account"); } catch {}; await logout(); router.replace("/onboarding"); };
  const exportData = async () => { try { await api.get("/me/export"); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 1200); } catch {} };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Display style={styles.h}>{user?.name}</Display>
        <AppText style={styles.email}>{user?.phone}{user?.email ? ` · ${user.email}` : ""}</AppText>

        {/* Privacy center */}
        <Card tint="#F5E9D8" style={{ marginTop: spacing.lg }}>
          <View style={styles.privacyHead}>
            <Feather name="shield" size={20} color={colors.indigo} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <AppText style={styles.privacyTitle}>{t("privacy_center")}</AppText>
              <AppText style={styles.privacySub}>{t("privacy_sub")}</AppText>
            </View>
          </View>
        </Card>

        {/* Language */}
        <SectionTitle style={styles.section}>{t("language")}</SectionTitle>
        <View style={styles.langRow}>
          {(["en", "hi"] as const).map((l) => (
            <Pressable key={l} testID={`me-lang-${l}`} onPress={() => setLang(l)} style={[styles.langPill, lang === l && styles.langActive]}>
              <AppText style={[styles.langText, lang === l && styles.langTextActive]}>{l === "en" ? "English" : "हिन्दी"}</AppText>
            </Pressable>
          ))}
        </View>

        {/* Consents */}
        <SectionTitle style={styles.section}>{t("privacy_center")}</SectionTitle>
        {savedMsg && <AppText style={styles.saved}>✓ {t("save")}</AppText>}
        <Card style={{ paddingVertical: spacing.xs }}>
          {CONSENTS.map((c, i) => (
            <View key={c} style={[styles.consentRow, i < CONSENTS.length - 1 && styles.divider]}>
              <AppText style={styles.consentLabel}>{t(`c_${c}`)}</AppText>
              <Switch
                testID={`consent-${c}`}
                value={!!consents[c]}
                onValueChange={() => toggle(c)}
                trackColor={{ true: colors.sage, false: colors.border }}
                thumbColor={colors.surface}
              />
            </View>
          ))}
        </Card>
        <AppText style={styles.note}>{t("consent_note")}</AppText>

        {/* Data controls */}
        <SectionTitle style={styles.section}>{t("export_data")}</SectionTitle>
        <ActionRow icon="download" label={t("export_data")} onPress={exportData} testID="export-data" />
        <ActionRow icon="trash-2" label={t("delete_mood")} onPress={deleteMood} testID="delete-mood" />
        <ActionRow icon="user-x" label={t("delete_account")} onPress={deleteAccount} danger testID="delete-account" />
        <ActionRow icon="log-out" label={t("log_out")} onPress={doLogout} testID="logout" />

        <AppText style={styles.note}>{t("not_medical")}</AppText>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function ActionRow({ icon, label, onPress, danger, testID }: { icon: any; label: string; onPress: () => void; danger?: boolean; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.8 : 1 }]}>
      <Feather name={icon} size={18} color={danger ? colors.rose : colors.onSurface} />
      <AppText style={[styles.actionLabel, danger && { color: colors.rose }]}>{label}</AppText>
      <Feather name="chevron-right" size={18} color={colors.onSurfaceSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  h: { fontSize: 28 },
  email: { color: colors.onSurfaceSecondary, marginTop: 2 },
  privacyHead: { flexDirection: "row", alignItems: "center" },
  privacyTitle: { fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  privacySub: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  section: { marginTop: spacing.xl, fontSize: T.xl },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langPill: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  langActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  langText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
  langTextActive: { color: colors.onSurfaceInverse },
  saved: { color: colors.sage, marginBottom: spacing.sm, fontWeight: "600" },
  consentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  consentLabel: { flex: 1, fontSize: T.base, color: colors.onSurface },
  note: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: spacing.md, lineHeight: 18, fontStyle: "italic" },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  actionLabel: { flex: 1, fontSize: T.lg, color: colors.onSurface },
});
