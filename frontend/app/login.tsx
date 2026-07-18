import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/src/AppContext";
import { OtpStep } from "./register";
import { Logo } from "@/src/Logo";
import { Screen, Display, AppText, PrimaryButton, GhostButton, spacing, radius, font, T, useTheme, useThemedStyles } from "@/src/ui";

export default function Login() {
  const { t, requestOtp, verifyOtp } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setErr(null); setBusy(true);
    try {
      const res = await requestOtp({ phone: phone.trim(), mode: "login" });
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
      <Pressable testID="back-button" onPress={() => (step === "otp" ? setStep("phone") : router.back())} style={styles.back}>
        <Feather name="arrow-left" size={22} color={colors.onSurface} />
      </Pressable>
      <KeyboardAwareScrollView contentContainerStyle={styles.wrap} bottomOffset={20} keyboardShouldPersistTaps="handled">
        {step === "phone" ? (
          <>
            <View style={{ alignItems: "center", marginBottom: spacing.xl }}><Logo size={64} /></View>
            <Display style={styles.title}>{t("log_in")}</Display>
            <AppText style={styles.label}>{t("mobile_number")}</AppText>
            <TextInput
              testID="login-phone-input"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.onSurfaceSecondary}
            />
            {err ? <AppText testID="login-error" style={styles.err}>{err}</AppText> : null}
            <View style={{ height: spacing.lg }} />
            <PrimaryButton testID="login-send-otp-button" label={t("send_code")} disabled={busy || !phone} onPress={sendCode} />
            <GhostButton testID="to-register-button" label={t("no_account")} onPress={() => router.replace("/register")} />
          </>
        ) : (
          <OtpStep t={t} phone={phone} code={code} setCode={setCode} devCode={devCode} err={err} busy={busy}
                   onVerify={verify} onResend={sendCode} onChangeNumber={() => setStep("phone")} />
        )}
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
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
