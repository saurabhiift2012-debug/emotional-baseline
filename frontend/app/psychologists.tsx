import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { Screen, Display, AppText, Card, Loading, IconChip, colors, spacing, radius, T } from "@/src/ui";

const LANGS = ["", "English", "Hindi"];

export default function Psychologists() {
  const { t } = useApp();
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
      </View>

      <View style={styles.filterRow}>
        {LANGS.map((l) => (
          <IconChip key={l || "all"} testID={`filter-lang-${l || "all"}`} label={l || t("filter_all")} active={lang === l} onPress={() => setLang(l)} />
        ))}
      </View>

      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
          {list.map((p) => (
            <Pressable key={p.id} testID={`psy-card-${p.id}`} onPress={() => router.push(`/psychologist/${p.id}`)}>
              <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}><Feather name="user" size={22} color={colors.indigo} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <AppText style={styles.name}>{p.name}</AppText>
                      {p.verified ? (
                        <View style={styles.verified}><Feather name="check" size={11} color={colors.surface} /><AppText style={styles.verifiedText}>{t("verified")}</AppText></View>
                      ) : null}
                    </View>
                    <AppText style={styles.qual}>{p.qualifications} · {p.experience_years} {t("years_exp")}</AppText>
                  </View>
                </View>
                <AppText style={styles.specs}>{p.specializations.join(" · ")}</AppText>
                <View style={styles.cardBottom}>
                  <AppText style={styles.langs}>{p.languages.join(", ")}</AppText>
                  <AppText style={styles.price}>₹{p.price} <AppText style={styles.priceSub}>{t("per_session")}</AppText></AppText>
                </View>
              </Card>
            </Pressable>
          ))}
          <AppText style={styles.note}>{t("test_data_note")}</AppText>
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm },
  title: { fontSize: 26 },
  filterRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  verified: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.sage, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: colors.surface, fontWeight: "600" },
  qual: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  specs: { fontSize: T.base, color: colors.indigo, marginTop: spacing.md },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  langs: { fontSize: T.sm, color: colors.onSurfaceSecondary },
  price: { fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  priceSub: { fontSize: T.sm, fontWeight: "400", color: colors.onSurfaceSecondary },
  note: { fontSize: T.sm, color: colors.onSurfaceSecondary, fontStyle: "italic", marginTop: spacing.md },
});
