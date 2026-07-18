import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { Screen, Display, AppText, PrimaryButton, GhostButton, colors, spacing, radius, font, T } from "@/src/ui";

export default function Login() {
  const { t, login } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}>
        <Feather name="arrow-left" size={22} color={colors.onSurface} />
      </Pressable>
      <KeyboardAwareScrollView contentContainerStyle={styles.wrap} bottomOffset={20} keyboardShouldPersistTaps="handled">
        <Display style={styles.title}>{t("log_in")}</Display>

        <AppText style={styles.label}>{t("email")}</AppText>
        <TextInput
          testID="login-email-input"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.onSurfaceSecondary}
        />
        <AppText style={styles.label}>{t("password")}</AppText>
        <TextInput
          testID="login-password-input"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.onSurfaceSecondary}
        />
        {err ? <AppText testID="login-error" style={styles.err}>{err}</AppText> : null}

        <View style={{ height: spacing.lg }} />
        <PrimaryButton testID="login-submit-button" label={t("log_in")} disabled={busy || !email || !password} onPress={submit} />
        <GhostButton testID="to-register-button" label={t("no_account")} onPress={() => router.replace("/register")} />
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 40, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing["2xl"] },
  title: { fontSize: 30, marginBottom: spacing.xl },
  label: { color: colors.onSurfaceSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg, fontFamily: font.body, fontSize: T.lg, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.border,
  },
  err: { color: colors.rose, marginTop: spacing.md },
});
