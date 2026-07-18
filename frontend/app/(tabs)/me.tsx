import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { moodByKey } from "@/src/moods";
import { Screen, Display, AppText, Card, SectionTitle, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";
import { ThemePref } from "@/src/ThemeContext";

const CONSENTS = [
  "health_data", "psychologist_sharing",
];

export default function Me() {
  const { t, lang, user, moods, setLang, logout, updateConsents } = useApp();
  const { colors, pref, setPref } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [consents, setConsents] = useState<Record<string, boolean>>(user?.consents || {});
  const [savedMsg, setSavedMsg] = useState(false);
  const [exporting, setExporting] = useState(false);

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
  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await api.get("/me/export");
      const html = buildExportHtml(data, moods, lang);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "TherapiShots data" });
      }
    } catch {}
    finally { setExporting(false); }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Display style={styles.h}>{user?.name}</Display>
        <AppText style={styles.email}>{user?.phone}{user?.email ? ` · ${user.email}` : ""}</AppText>

        {/* Privacy center */}
        <Card tint={colors.tintWarm} style={{ marginTop: spacing.lg }}>
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

        {/* Appearance */}
        <SectionTitle style={styles.section}>{t("appearance")}</SectionTitle>
        <View style={styles.langRow}>
          {(["system", "light", "dark"] as ThemePref[]).map((p) => (
            <Pressable key={p} testID={`me-theme-${p}`} onPress={() => { Haptics.selectionAsync(); setPref(p); }} style={[styles.langPill, pref === p && styles.langActive]}>
              <AppText style={[styles.langText, pref === p && styles.langTextActive]}>{t(`theme_${p}`)}</AppText>
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
        <ActionRow icon="download" label={exporting ? t("loading") : t("export_data")} onPress={exportData} testID="export-data" />
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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.8 : 1 }]}>
      <Feather name={icon} size={18} color={danger ? colors.rose : colors.onSurface} />
      <AppText style={[styles.actionLabel, danger && { color: colors.rose }]}>{label}</AppText>
      <Feather name="chevron-right" size={18} color={colors.onSurfaceSecondary} />
    </Pressable>
  );
}

function buildExportHtml(data: any, moods: any[], lang: "en" | "hi") {
  const u = data?.user || {};
  const checkins = (data?.checkins || []).slice().reverse();
  const rows = checkins.map((c: any) => {
    const m = moodByKey(c.mood, moods);
    const label = m ? (lang === "hi" ? m.hi : m.en) : c.mood;
    const ctx = (c.context || []).join(", ");
    return `<tr><td>${c.date}</td><td>${m?.emoji || ""} ${label}</td><td>${ctx}</td><td>${(c.note || "").replace(/</g, "&lt;")}</td></tr>`;
  }).join("");
  const total = checkins.length;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2C2416; padding: 28px; }
    h1 { color: #3D4F7C; font-size: 26px; margin-bottom: 2px; }
    .sub { color: #6B5C47; margin-top: 0; }
    .meta { background: #FAF7F2; border: 1px solid #E8DFC9; border-radius: 10px; padding: 14px 16px; margin: 18px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th { text-align: left; background: #F2EBE1; padding: 8px; }
    td { padding: 8px; border-bottom: 1px solid #Eee6d6; vertical-align: top; }
    .foot { margin-top: 24px; color: #6B5C47; font-size: 11px; font-style: italic; }
  </style></head><body>
    <h1>TherapiShots — Your Data Export</h1>
    <p class="sub">Small Steps Today, Better Tomorrow</p>
    <div class="meta">
      <strong>${u.name || ""}</strong><br/>
      ${u.phone || ""}${u.email ? " · " + u.email : ""}<br/>
      Total check-ins: ${total}
    </div>
    <h3>Mood check-in history</h3>
    <table>
      <tr><th>Date</th><th>Mood</th><th>Context</th><th>Note</th></tr>
      ${rows || '<tr><td colspan="4">No check-ins yet.</td></tr>'}
    </table>
    <p class="foot">This export contains information you chose to record in TherapiShots. It is a self-reflection tool and does not provide medical advice. Generated ${new Date().toLocaleString()}.</p>
  </body></html>`;
}


const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 100 },
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
