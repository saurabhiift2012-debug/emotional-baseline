import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { profileFor } from "@/src/psychologistProfiles";
import { PsychologistAvatar } from "@/src/PsychologistAvatar";
import { Screen, Display, AppText, Card, Loading, IconChip, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

const LANGS = ["", "English", "Hindi"];

export default function Psychologists() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("");

  const load = useCallback(async (language: string) => {
    setLoading(true);
    try {
      const q = language ? `?language=${encodeURIComponent(language)}` : "";
      const d = await api.get(`/psychologists${q}`);
      setList(d.psychologists || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(lang); }, [lang, load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="psy-back" onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Display style={styles.title}>{t("psychologists_title")}</Display>
        <AppText style={styles.intro}>{t("matched_intro")}</AppText>
      </View>

      <View style={styles.filterRow}>
        {LANGS.map((l) => (
          <IconChip key={l || "all"} testID={`filter-lang-${l || "all"}`} label={l || t("filter_all")} active={lang === l} onPress={() => setLang(l)} />
        ))}
      </View>

      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
          {list.map((p) => {
            const prof = profileFor(p.slug);
            const bio = prof.bio || p.bio;
            return (
              <Pressable key={p.id} testID={`psy-card-${p.id}`} onPress={() => router.push(`/psychologist/${p.id}`)}>
                <Card tint={colors.tintWarm} style={{ marginBottom: spacing.md }}>
                  <View style={styles.cardTop}>
                    <PsychologistAvatar photo={p.photo || prof.photo} size={56} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <AppText style={styles.name}>{p.name}</AppText>
                        {p.verified ? (
                          <View style={styles.verified}><Feather name="check" size={11} color={colors.surface} /><AppText style={styles.verifiedText}>{t("verified")}</AppText></View>
                        ) : null}
                      </View>
                      {prof.credential ? <AppText style={styles.credential}>{prof.credential}</AppText> : null}
                      {bio ? <AppText style={styles.bioLine} numberOfLines={2}>{bio}</AppText> : null}
                    </View>
                  </View>
                  {prof.licence ? <AppText style={styles.licence}>{prof.licence}</AppText> : null}
                  <AppText style={styles.specs}>{p.specializations.join(" · ")}</AppText>
                  <View style={styles.cardBottom}>
                    <View style={styles.availRow}>
                      <Feather name="clock" size={13} color={colors.sage} />
                      <AppText style={styles.availText}>{t("usually_within_hours")}</AppText>
                    </View>
                    <AppText style={styles.price}>₹{p.short_call_price ?? p.price} <AppText style={styles.priceSub}>{t("per_session")}</AppText></AppText>
                  </View>
                  <View style={styles.ctaRow}>
                    <Feather name="phone-call" size={14} color={colors.indigo} />
                    <AppText style={styles.ctaText}>{t("book_15_min_call")}</AppText>
                    <Feather name="chevron-right" size={16} color={colors.indigo} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm },
  title: { fontSize: 26 },
  intro: { fontSize: T.base, color: colors.onSurfaceSecondary, lineHeight: 21 },
  filterRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: T.lg, fontWeight: "700", color: colors.onSurface },
  verified: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.sage, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: colors.surface, fontWeight: "600" },
  credential: { fontSize: T.sm, color: colors.indigo, fontWeight: "600", marginTop: 2 },
  bioLine: { fontSize: T.sm, color: colors.onSurface, lineHeight: 19, marginTop: 3 },
  licence: { fontSize: 11, color: colors.onSurfaceSecondary, fontStyle: "italic", marginTop: spacing.sm },
  specs: { fontSize: T.base, color: colors.onSurfaceSecondary, marginTop: spacing.sm },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  availRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  availText: { fontSize: T.sm, color: colors.sage, fontWeight: "600" },
  price: { fontSize: T.lg, fontWeight: "700", color: colors.onSurface },
  priceSub: { fontSize: T.sm, fontWeight: "400", color: colors.onSurfaceSecondary },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  ctaText: { flex: 1, fontSize: T.base, color: colors.indigo, fontWeight: "600" },
});
