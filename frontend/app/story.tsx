import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";
import { Screen, Display, AppText, Card, Loading, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Story() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: "week" | "month") => {
    setLoading(true);
    try { setData(await api.get(`/story?period=${p}`)); } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const text = data?.ai_text || data?.template;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="story-close" onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Display style={styles.h}>{t("your_story")}</Display>

        <View style={styles.toggle}>
          {(["week", "month"] as const).map((p) => (
            <Pressable key={p} testID={`story-${p}`} onPress={() => setPeriod(p)} style={[styles.toggleBtn, period === p && styles.toggleActive]}>
              <AppText style={[styles.toggleText, period === p && styles.toggleTextActive]}>{t(p === "week" ? "weekly" : "monthly")}</AppText>
            </Pressable>
          ))}
        </View>

        {loading ? <Loading /> : (
          <Card style={{ marginTop: spacing.lg }}>
            {data?.used_ai && (
              <View style={styles.aiTag}>
                <Feather name="star" size={12} color={colors.indigo} />
                <AppText style={styles.aiTagText}>AI-assisted summary</AppText>
              </View>
            )}
            <Display style={styles.story}>{text}</Display>
          </Card>
        )}
        <AppText style={styles.note}>{t("not_medical")}</AppText>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 44, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing["2xl"] },
  h: { fontSize: 28, marginBottom: spacing.lg },
  toggle: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill, padding: 4 },
  toggleBtn: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: colors.indigo },
  toggleText: { color: colors.onSurfaceSecondary, fontWeight: "500" },
  toggleTextActive: { color: colors.onSurfaceInverse },
  aiTag: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  aiTagText: { color: colors.indigo, fontSize: T.sm, fontWeight: "600" },
  story: { fontSize: 22, lineHeight: 34 },
  note: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: spacing.xl, fontStyle: "italic", lineHeight: 18 },
});
