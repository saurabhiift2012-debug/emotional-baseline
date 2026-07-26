import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { Logo } from "@/src/Logo";
import { Screen, Display, AppText, PrimaryButton, spacing, T, useThemedStyles } from "@/src/ui";

export default function Welcome() {
  const { t } = useApp();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <Screen>
      <View style={styles.wrap} testID="welcome-screen">
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], alignItems: "center" }}>
          <Logo size={128} />
          <Display style={styles.title}>{t("welcome_congrats_title")}</Display>
          <AppText style={styles.body}>{t("welcome_congrats_body")}</AppText>
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton testID="welcome-continue" label={t("welcome_continue")} onPress={() => router.replace("/(tabs)")} />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  title: { fontSize: 34, marginTop: spacing.xl, textAlign: "center", color: colors.indigo },
  body: { fontSize: T.lg, color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 26, marginTop: spacing.md },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
});
