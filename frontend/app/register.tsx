import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { Screen, Display, AppText, PrimaryButton, GhostButton, colors, spacing, radius, font, T } from "@/src/ui";

export default function Register() {
  const { t, lang, register } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, date_of_birth: dob.trim(), language: lang });
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Registration failed");
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
        <Display style={styles.title}>{t("create_account")}</Display>

        <AppText style={styles.label}>{t("name")}</AppText>
        <TextInput testID="register-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="Alex" placeholderTextColor={colors.onSurfaceSecondary} />

        <AppText style={styles.label}>{t("email")}</AppText>
        <TextInput testID="register-email-input" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.onSurfaceSecondary} />

        <AppText style={styles.label}>{t("password")}</AppText>
        <TextInput testID="register-password-input" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" placeholderTextColor={colors.onSurfaceSecondary} />

        <AppText style={styles.label}>{t("dob")}</AppText>
        <TextInput testID="register-dob-input" style={styles.input} value={dob} onChangeText={setDob} placeholder="1995-05-20" placeholderTextColor={colors.onSurfaceSecondary} autoCapitalize="none" />

        {err ? <AppText testID="register-error" style={styles.err}>{err}</AppText> : null}
        <AppText style={styles.note}>{t("not_medical")}</AppText>

        <PrimaryButton testID="register-submit-button" label={t("continue")} disabled={busy || !name || !email || !password || !dob} onPress={submit} />
        <GhostButton testID="to-login-button" label={t("i_have_account")} onPress={() => router.replace("/login")} />
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 40, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing["2xl"] },
  title: { fontSize: 30, marginBottom: spacing.lg },
  label: { color: colors.onSurfaceSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg, fontFamily: font.body, fontSize: T.lg, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.border,
  },
  err: { color: colors.rose, marginTop: spacing.md },
  note: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginVertical: spacing.lg, lineHeight: 18 },
});
