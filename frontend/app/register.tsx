import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { Logo } from "@/src/Logo";
import { Screen, Display, AppText, PrimaryButton, GhostButton, spacing, radius, font, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Register() {
  const { t, lang, requestOtp, verifyOtp } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setErr(null); setBusy(true);
    try {
      const res = await requestOtp({ phone: phone.trim(), mode: "register", name: name.trim(), date_of_birth: dob.trim(), email: email.trim() || null, language: lang });
      setDevCode(res.dev_code || null);
      setStep("otp");
    } catch (e: any) { setErr(e.message || "Could not send code"); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setErr(null); setBusy(true);
    try {
      await verifyOtp(phone.trim(), code.trim());
      router.replace("/(tabs)");
    } catch (e: any) { setErr(e.message || "Verification failed"); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <Pressable testID="back-button" onPress={() => (step === "otp" ? setStep("details") : router.back())} style={styles.back}>
        <Feather name="arrow-left" size={22} color={colors.onSurface} />
      </Pressable>
      <KeyboardAwareScrollView contentContainerStyle={styles.wrap} bottomOffset={20} keyboardShouldPersistTaps="handled">
        {step === "details" ? (
          <>
            <View style={{ alignItems: "center", marginBottom: spacing.lg }}><Logo size={60} /></View>
            <Display style={styles.title}>{t("create_account")}</Display>

            <AppText style={styles.label}>{t("name")}</AppText>
            <TextInput testID="register-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="Riya" placeholderTextColor={colors.onSurfaceSecondary} />

            <AppText style={styles.label}>{t("mobile_number")}</AppText>
            <TextInput testID="register-phone-input" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" placeholderTextColor={colors.onSurfaceSecondary} />

            <AppText style={styles.label}>{t("dob")}</AppText>
            <TextInput testID="register-dob-input" style={styles.input} value={dob} onChangeText={setDob} placeholder="1995-05-20" placeholderTextColor={colors.onSurfaceSecondary} autoCapitalize="none" />

            <AppText style={styles.label}>{t("email_optional")}</AppText>
            <TextInput testID="register-email-input" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.onSurfaceSecondary} />

            {err ? <AppText testID="register-error" style={styles.err}>{err}</AppText> : null}
            <AppText style={styles.note}>{t("not_medical")}</AppText>
            <PrimaryButton testID="register-send-otp-button" label={t("send_code")} disabled={busy || !name || !phone || !dob} onPress={sendCode} />
            <GhostButton testID="to-login-button" label={t("i_have_account")} onPress={() => router.replace("/login")} />
          </>
        ) : (
          <OtpStep t={t} phone={phone} code={code} setCode={setCode} devCode={devCode} err={err} busy={busy}
                   onVerify={verify} onResend={sendCode} onChangeNumber={() => setStep("details")} />
        )}
      </KeyboardAwareScrollView>
    </Screen>
  );
}

export function OtpStep({ t, phone, code, setCode, devCode, err, busy, onVerify, onResend, onChangeNumber }: any) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Display style={styles.title}>{t("enter_code")}</Display>
      <AppText style={styles.subtle}>{t("code_sent_to")} {phone}</AppText>
      {devCode ? (
        <View style={styles.devBox} testID="dev-code-box">
          <Feather name="info" size={14} color={colors.indigo} />
          <AppText style={styles.devText}>{t("dev_code_note")}: {devCode}</AppText>
        </View>
      ) : null}
      <TextInput
        testID="otp-input"
        style={styles.otpInput}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="••••••"
        placeholderTextColor={colors.onSurfaceSecondary}
      />
      {err ? <AppText testID="otp-error" style={styles.err}>{err}</AppText> : null}
      <View style={{ height: spacing.md }} />
      <PrimaryButton testID="verify-otp-button" label={t("verify_continue")} disabled={busy || code.length < 4} onPress={onVerify} />
      <View style={styles.otpActions}>
        <Pressable testID="resend-code" onPress={onResend}><AppText style={styles.linkText}>{t("resend_code")}</AppText></Pressable>
        <Pressable testID="change-number" onPress={onChangeNumber}><AppText style={styles.linkText}>{t("change_number")}</AppText></Pressable>
      </View>
    </>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 40, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing["2xl"] },
  title: { fontSize: 30, marginBottom: spacing.lg },
  subtle: { color: colors.onSurfaceSecondary, marginBottom: spacing.lg, fontSize: T.lg },
  label: { color: colors.onSurfaceSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg, fontFamily: font.body, fontSize: T.lg, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.border,
  },
  otpInput: {
    height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg, fontFamily: font.body, fontSize: 28, letterSpacing: 8,
    color: colors.onSurface, borderWidth: 1, borderColor: colors.border, textAlign: "center",
  },
  err: { color: colors.rose, marginTop: spacing.md },
  note: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginVertical: spacing.lg, lineHeight: 18 },
  devBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.tintInfo, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  devText: { color: colors.indigo, fontSize: T.sm, fontWeight: "600" },
  otpActions: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
  linkText: { color: colors.indigo, fontWeight: "600", fontSize: T.base, padding: spacing.sm },
});
