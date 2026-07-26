import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Modal, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "@/src/AppContext";
import { Logo } from "@/src/Logo";
import { TERMS_OF_USE, TERMS_VERSION } from "@/src/legal";
import { Screen, Display, AppText, PrimaryButton, GhostButton, spacing, radius, font, T, useTheme, useThemedStyles } from "@/src/ui";

const RELATIONSHIPS = ["parent", "spouse", "partner", "sibling", "child", "friend", "relative", "other"];

// ---- Date-of-birth helpers (DD-MM-YYYY) --------------------------------
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

// Auto-inserts the "-" separators as the user types digits only.
function maskDOB(input: string): string {
  const d = onlyDigits(input).slice(0, 8);
  const parts: string[] = [d.slice(0, 2)];
  if (d.length > 2) parts.push(d.slice(2, 4));
  if (d.length > 4) parts.push(d.slice(4, 8));
  return parts.filter(Boolean).join("-");
}

function parseDDMMYYYY(s: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec((s || "").trim());
  if (!m) return null;
  const dd = +m[1], mm = +m[2], yyyy = +m[3];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  if (d > new Date()) return null; // no future dates
  return d;
}

const fmtDDMMYYYY = (d: Date): string =>
  `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

function dobToISO(s: string): string {
  const d = parseDDMMYYYY(s);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
}

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
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [consents, setConsents] = useState({ age18: false, terms: false, privacy: false, notMedical: false, dataProcessing: false });
  const [showRel, setShowRel] = useState(false);
  const [showDob, setShowDob] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allConsented = Object.values(consents).every(Boolean);
  const toggle = (k: keyof typeof consents) => {
    Haptics.selectionAsync();
    setConsents((c) => ({ ...c, [k]: !c[k] }));
  };

  const sendCode = async () => {
    setErr(null);
    // Validate on press so the button is never left mysteriously disabled.
    if (!(name.trim() && phone.trim() && dob.trim() && ecName.trim() && relationship && ecPhone.trim())) {
      setErr(t("fill_required")); return;
    }
    if (!parseDDMMYYYY(dob.trim())) { setErr(t("fill_required")); return; }
    if (!allConsented) { setErr(t("must_agree")); return; }
    setBusy(true);
    try {
      const res = await requestOtp({
        phone: phone.trim(), mode: "register", name: name.trim(), date_of_birth: dobToISO(dob.trim()),
        email: email.trim() || null, language: lang,
        emergency_contact_name: ecName.trim(),
        emergency_contact_relationship: relationship,
        emergency_contact_phone: ecPhone.trim(),
        agreement_accepted: allConsented,
        consents: { ...consents, terms_version: TERMS_VERSION },
      });
      setDevCode(res.dev_code || null);
      setStep("otp");
    } catch (e: any) { setErr(e.message || "Could not send code"); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setErr(null); setBusy(true);
    try {
      await verifyOtp(phone.trim(), code.trim());
      // New users see a warm welcome, then the mood check-in.
      router.replace("/welcome");
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

            <AppText style={styles.label}>{t("name")}<AppText style={styles.req}> *</AppText></AppText>
            <TextInput testID="register-name-input" style={styles.input} value={name} onChangeText={setName} placeholder="Riya" placeholderTextColor={colors.onSurfaceSecondary} />

            <AppText style={styles.label}>{t("mobile_number")}<AppText style={styles.req}> *</AppText></AppText>
            <TextInput testID="register-phone-input" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" placeholderTextColor={colors.onSurfaceSecondary} />

            <AppText style={styles.label}>{t("dob")}<AppText style={styles.req}> *</AppText></AppText>
            <View style={styles.dobRow}>
              <TextInput testID="register-dob-input" style={[styles.input, { flex: 1 }]} value={dob} onChangeText={(txt) => setDob(maskDOB(txt))} placeholder="DD-MM-YYYY" placeholderTextColor={colors.onSurfaceSecondary} autoCapitalize="none" keyboardType="number-pad" maxLength={10} />
              {Platform.OS !== "web" ? (
                <Pressable testID="register-dob-calendar" onPress={() => setShowDob(true)} style={styles.calBtn}>
                  <Feather name="calendar" size={20} color={colors.indigo} />
                </Pressable>
              ) : null}
            </View>
            {showDob && Platform.OS !== "web" ? (
              <>
                <DateTimePicker
                  testID="dob-picker"
                  value={parseDDMMYYYY(dob) || new Date(2000, 0, 1)}
                  mode="date"
                  maximumDate={new Date()}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(e: any, d?: Date) => {
                    if (Platform.OS !== "ios") setShowDob(false);
                    if (e?.type !== "dismissed" && d) setDob(fmtDDMMYYYY(d));
                  }}
                />
                {Platform.OS === "ios" ? (
                  <Pressable onPress={() => setShowDob(false)} style={styles.pickerDone}>
                    <AppText style={styles.pickerDoneText}>{t("done")}</AppText>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            <AppText style={styles.label}>{t("email_optional")}</AppText>
            <TextInput testID="register-email-input" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.onSurfaceSecondary} />

            {/* Emergency contact */}
            <AppText style={styles.sectionHead}>{t("emergency_contact")}</AppText>
            <AppText style={styles.sectionHint}>{t("ec_intro")}</AppText>

            <AppText style={styles.label}>{t("ec_name")}<AppText style={styles.req}> *</AppText></AppText>
            <TextInput testID="register-ec-name" style={styles.input} value={ecName} onChangeText={setEcName} placeholder="Riya Sharma" placeholderTextColor={colors.onSurfaceSecondary} />

            <AppText style={styles.label}>{t("ec_relationship")}<AppText style={styles.req}> *</AppText></AppText>
            <Pressable testID="register-rel-dropdown" onPress={() => setShowRel(true)} style={styles.dropdown}>
              <AppText style={[styles.dropdownText, !relationship && { color: colors.onSurfaceSecondary }]}>
                {relationship ? t(`rel_${relationship}`) : t("select_relationship")}
              </AppText>
              <Feather name="chevron-down" size={20} color={colors.onSurfaceSecondary} />
            </Pressable>

            <AppText style={styles.label}>{t("ec_phone")}<AppText style={styles.req}> *</AppText></AppText>
            <TextInput testID="register-ec-phone" style={styles.input} value={ecPhone} onChangeText={setEcPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" placeholderTextColor={colors.onSurfaceSecondary} />

            {/* Consents — all mandatory for first-time registration */}
            <AppText style={styles.sectionHead}>{t("consent_heading")}<AppText style={styles.req}> *</AppText></AppText>
            <AppText style={styles.sectionHint}>{t("consent_sub")}</AppText>

            <ConsentRow testID="consent-age18" checked={consents.age18} onPress={() => toggle("age18")} label={t("consent_age18")} styles={styles} colors={colors} />

            <ConsentRow testID="consent-terms" checked={consents.terms} onPress={() => toggle("terms")} label={t("consent_terms")} styles={styles} colors={colors}
              action={<Pressable testID="open-terms" onPress={() => setShowTerms(true)} hitSlop={8}><AppText style={styles.readLinkText}>{t("consent_read_terms")}</AppText></Pressable>} />

            <ConsentRow testID="consent-privacy" checked={consents.privacy} onPress={() => toggle("privacy")} label={t("consent_privacy")} styles={styles} colors={colors} />

            <ConsentRow testID="consent-not-medical" checked={consents.notMedical} onPress={() => toggle("notMedical")} label={t("consent_not_medical")} styles={styles} colors={colors} />

            <ConsentRow testID="consent-data" checked={consents.dataProcessing} onPress={() => toggle("dataProcessing")} label={t("consent_data")} styles={styles} colors={colors} />

            {err ? <AppText testID="register-error" style={styles.err}>{err}</AppText> : null}
            <AppText style={styles.note}>{t("not_medical")}</AppText>
            <PrimaryButton testID="register-send-otp-button" label={t("send_code")} disabled={busy} onPress={sendCode} />
            <GhostButton testID="to-login-button" label={t("i_have_account")} onPress={() => router.replace("/login")} />

            {/* Relationship picker */}
            <Modal visible={showRel} transparent animationType="fade" onRequestClose={() => setShowRel(false)}>
              <Pressable style={styles.pickerBackdrop} onPress={() => setShowRel(false)}>
                <View style={styles.pickerCard}>
                  <AppText style={styles.pickerTitle}>{t("select_relationship")}</AppText>
                  {RELATIONSHIPS.map((r) => (
                    <Pressable key={r} testID={`rel-opt-${r}`} onPress={() => { Haptics.selectionAsync(); setRelationship(r); setShowRel(false); }} style={styles.pickerRow}>
                      <AppText style={[styles.pickerRowText, relationship === r && { color: colors.indigo, fontWeight: "700" }]}>{t(`rel_${r}`)}</AppText>
                      {relationship === r ? <Feather name="check" size={18} color={colors.indigo} /> : null}
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>

            {/* Terms of Use reader — scroll to bottom, tap "I agree" to return */}
            <Modal visible={showTerms} animationType="slide" onRequestClose={() => setShowTerms(false)}>
              <TermsReader
                onAgree={() => { setConsents((c) => ({ ...c, terms: true })); setShowTerms(false); }}
                onClose={() => setShowTerms(false)}
              />
            </Modal>
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

function ConsentRow({ testID, checked, onPress, label, action, styles, colors }: any) {
  return (
    <View style={styles.consentRow}>
      <Pressable testID={testID} onPress={onPress} style={styles.consentTap} hitSlop={6}>
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
          {checked ? <Feather name="check" size={15} color={colors.onSurfaceInverse} /> : null}
        </View>
        <AppText style={styles.consentLabel}>{label}</AppText>
      </Pressable>
      {action ? <View style={styles.consentAction}>{action}</View> : null}
    </View>
  );
}

function TermsReader({ onAgree, onClose }: { onAgree: () => void; onClose: () => void }) {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [atBottom, setAtBottom] = useState(false);
  return (
    <View style={[styles.readerWrap, { paddingTop: insets.top }]}>
      <View style={styles.readerHeader}>
        <AppText style={styles.readerTitle}>{t("terms_title")}</AppText>
        <Pressable testID="terms-close" onPress={onClose} hitSlop={10}>
          <Feather name="x" size={24} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.readerBody}
        showsVerticalScrollIndicator
        scrollEventThrottle={80}
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) setAtBottom(true);
        }}
      >
        {TERMS_OF_USE.map((s, i) => (
          <View key={i} style={{ marginBottom: spacing.lg }}>
            <AppText style={styles.readerH}>{s.h}</AppText>
            <AppText style={styles.readerP}>{s.b}</AppText>
          </View>
        ))}
        <View style={styles.readerAgreeBox}>
          <PrimaryButton testID="terms-agree" label={t("consent_i_agree")} onPress={onAgree} />
        </View>
      </ScrollView>
      <View style={[styles.readerFooter, { paddingBottom: insets.bottom + spacing.md }]}>
        {atBottom ? (
          <PrimaryButton testID="terms-agree-footer" label={t("consent_i_agree")} onPress={onAgree} />
        ) : (
          <AppText style={styles.readerHint}>{t("consent_scroll_hint")}</AppText>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  back: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, height: 40, justifyContent: "center" },
  wrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing["2xl"] },
  title: { fontSize: 30, marginBottom: spacing.lg },
  subtle: { color: colors.onSurfaceSecondary, marginBottom: spacing.lg, fontSize: T.lg },
  label: { color: colors.onSurfaceSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  sectionHead: { fontFamily: font.display, fontSize: T.xl, color: colors.onSurface, marginTop: spacing.xl },
  sectionHint: { color: colors.onSurfaceSecondary, fontSize: T.sm, marginTop: 4, lineHeight: 18 },
  dropdown: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: colors.border,
  },
  dobRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  calBtn: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  pickerDone: { alignSelf: "flex-end", paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  pickerDoneText: { color: colors.indigo, fontWeight: "700", fontSize: T.base },
  dropdownText: { fontFamily: font.body, fontSize: T.lg, color: colors.onSurface },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  req: { color: colors.rose, fontWeight: "700" },
  consentRow: { marginTop: spacing.lg },
  consentTap: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  consentLabel: { flex: 1, color: colors.onSurface, fontSize: T.base, lineHeight: 21 },
  consentAction: { marginLeft: 38, marginTop: spacing.xs },
  readerWrap: { flex: 1, backgroundColor: colors.surface },
  readerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, height: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  readerTitle: { fontFamily: font.display, fontSize: T.xl, color: colors.onSurface },
  readerBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  readerH: { fontFamily: font.display, fontSize: T.lg, color: colors.indigo, marginBottom: spacing.xs },
  readerP: { color: colors.onSurface, fontSize: T.base, lineHeight: 22 },
  readerAgreeBox: { marginTop: spacing.md, marginBottom: spacing.xl },
  readerFooter: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  readerHint: { textAlign: "center", color: colors.onSurfaceSecondary, fontSize: T.sm, paddingVertical: spacing.md },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  agreeText: { flex: 1, color: colors.onSurface, fontSize: T.base, lineHeight: 20 },
  readLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, paddingVertical: spacing.sm },
  readLinkText: { color: colors.indigo, fontWeight: "600", fontSize: T.base },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  pickerCard: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  pickerTitle: { fontFamily: font.display, fontSize: T.xl, color: colors.onSurface, marginBottom: spacing.sm },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerRowText: { fontSize: T.lg, color: colors.onSurface },
  agreeBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  agreeSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl },
  agreeTitle: { fontSize: 24, marginBottom: spacing.md },
  agreeBody: { color: colors.onSurface, lineHeight: 22, fontSize: T.base },
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
