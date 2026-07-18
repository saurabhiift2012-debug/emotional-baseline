import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { Logo } from "@/src/Logo";
import { Screen, Display, AppText, PrimaryButton, GhostButton, spacing, radius, font, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Onboarding() {
  const { t, lang, setLang } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Screen>
      <View style={[styles.wrap, { paddingBottom: spacing.lg + insets.bottom }]}>
        <View style={styles.langRow}>
          {(["en", "hi"] as const).map((l) => (
            <Pressable
              key={l}
              testID={`lang-${l}`}
              onPress={() => { Haptics.selectionAsync(); setLang(l); }}
              style={[styles.langPill, lang === l && styles.langPillActive]}
            >
              <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                {l === "en" ? "EN" : "हिं"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.hero}>
          <Logo size={84} />
          <Display style={styles.title}>{t("app_name")}</Display>
          <AppText style={styles.tagline}>{t("tagline")}</AppText>
        </View>

        <View style={{ flex: 1 }} />

        <Display style={styles.welcomeTitle}>{t("welcome_title")}</Display>
        <AppText style={styles.body}>{t("welcome_body")}</AppText>

        <Pressable
          testID="age-confirm"
          onPress={() => { Haptics.selectionAsync(); setConfirmed((c) => !c); }}
          style={styles.checkRow}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxOn]}>
            {confirmed && <Feather name="check" size={16} color={colors.surface} />}
          </View>
          <AppText style={styles.checkLabel}>{t("age_confirm")}</AppText>
        </Pressable>

        <PrimaryButton
          testID="get-started-button"
          label={t("get_started")}
          disabled={!confirmed}
          onPress={() => router.push("/register")}
        />
        <GhostButton testID="have-account-button" label={t("i_have_account")} onPress={() => router.push("/login")} />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  langRow: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  langPill: { width: 46, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  langPillActive: { backgroundColor: colors.indigo },
  langText: { fontFamily: font.body, fontWeight: "600", color: colors.onSurfaceSecondary },
  langTextActive: { color: colors.onSurfaceInverse },
  hero: { alignItems: "center", marginTop: spacing["2xl"] },
  logoDot: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.indigo, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { fontSize: T.display },
  tagline: { color: colors.onSurfaceSecondary, marginTop: spacing.xs },
  welcomeTitle: { fontSize: 28, lineHeight: 36, marginBottom: spacing.md },
  body: { fontSize: T.lg, lineHeight: 24, color: colors.onSurfaceSecondary, marginBottom: spacing.xl },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  checkbox: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  checkboxOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  checkLabel: { flex: 1, color: colors.onSurface },
});
