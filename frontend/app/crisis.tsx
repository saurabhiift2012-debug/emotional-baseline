import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { CRISIS_REGIONS, DEFAULT_REGION } from "@/src/crisisConfig";
import { Screen, Display, AppText, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Crisis() {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const region = CRISIS_REGIONS[DEFAULT_REGION];

  const dial = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  return (
    <Screen>
      <Pressable testID="crisis-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={styles.back}>
        <Feather name="x" size={24} color={colors.onSurface} />
      </Pressable>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Display style={styles.title}>{t("crisis_screen_title")}</Display>
        <AppText style={styles.body}>{t("crisis_screen_body")}</AppText>

        <AppText style={styles.regionLabel}>{region.label}</AppText>
        {region.resources.map((r) => (
          <View key={r.number} style={styles.line}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.lineName}>{r.name}{r.note ? ` (${r.note})` : ""}</AppText>
              <AppText style={styles.lineNum}>{r.number}</AppText>
            </View>
            <Pressable testID={`crisis-call-${r.number}`} onPress={() => dial(r.number)} style={styles.callBtn}>
              <Feather name="phone" size={16} color={"#FFFFFF"} />
              <AppText style={styles.callText}>{t("call_now")}</AppText>
            </Pressable>
          </View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 44, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  title: { fontSize: 28, marginBottom: spacing.md },
  body: { color: colors.onSurface, lineHeight: 24, fontSize: T.lg, marginBottom: spacing.xl },
  regionLabel: { color: colors.onSurfaceSecondary, fontSize: T.sm, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.md },
  line: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  lineName: { color: colors.onSurface, fontSize: T.lg, fontWeight: "600" },
  lineNum: { color: colors.onSurfaceSecondary, fontSize: T.base, marginTop: 2 },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.rose, borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 44 },
  callText: { color: "#FFFFFF", fontWeight: "700", fontSize: T.base },
});
