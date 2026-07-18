import React from "react";
import { Modal, View, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useApp } from "./AppContext";
import { AppText, Display, spacing, radius, T, useTheme, useThemedStyles } from "./ui";

// Verified Indian mental-health & emergency helplines.
export const HELPLINES = [
  { name: "Tele MANAS (Govt of India)", number: "14416" },
  { name: "KIRAN Mental Health", number: "18005990019" },
  { name: "iCall (TISS)", number: "9152987821" },
  { name: "Vandrevala Foundation", number: "18602662345" },
  { name: "National Emergency", number: "112" },
  { name: "Ambulance", number: "102" },
];

export function CrisisSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  const dial = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  const bookPsych = () => {
    onClose();
    requestAnimationFrame(() => setTimeout(() => router.push("/psychologists"), 300));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Display style={styles.title}>{t("you_not_alone")}</Display>
            <AppText style={styles.intro}>{t("crisis_intro")}</AppText>

            <Pressable testID="crisis-book-psych" onPress={bookPsych} style={styles.bookBtn}>
              <Feather name="message-circle" size={18} color={colors.onSurfaceInverse} />
              <AppText style={styles.bookText}>{t("book_a_psychologist")}</AppText>
            </Pressable>

            <AppText style={styles.orReach}>{t("or_reach_emergency")}</AppText>
            {HELPLINES.map((h) => (
              <View key={h.number} style={styles.line}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.lineName}>{h.name}</AppText>
                  <AppText style={styles.lineNum}>{h.number}</AppText>
                </View>
                <Pressable testID={`crisis-call-${h.number}`} onPress={() => dial(h.number)} style={styles.callBtn}>
                  <Feather name="phone" size={15} color={"#FFFFFF"} />
                  <AppText style={styles.callText}>{t("call_now")}</AppText>
                </Pressable>
              </View>
            ))}

            <View style={styles.notSupport}>
              <AppText style={styles.nsTitle}>{t("not_supported_title")}</AppText>
              <AppText style={styles.nsList}>{t("not_supported_list")}</AppText>
              <AppText style={styles.nsUse}>{t("use_emergency_above")}</AppText>
            </View>
          </ScrollView>
          <Pressable testID="crisis-dismiss" onPress={onClose} style={styles.dismiss}>
            <AppText style={styles.dismissText}>{t("dismiss")}</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  backdropTap: { flex: 1 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88%", paddingTop: spacing.xl },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: 28, marginBottom: spacing.sm },
  intro: { color: colors.onSurfaceSecondary, lineHeight: 22, marginBottom: spacing.lg },
  bookBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.indigo, borderRadius: radius.pill, height: 54, marginBottom: spacing.lg },
  bookText: { color: colors.onSurfaceInverse, fontWeight: "600", fontSize: T.lg },
  orReach: { color: colors.onSurfaceSecondary, textAlign: "center", marginBottom: spacing.md, fontSize: T.sm },
  line: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  lineName: { color: colors.onSurface, fontSize: T.lg, fontWeight: "600" },
  lineNum: { color: colors.onSurfaceSecondary, fontSize: T.base, marginTop: 2 },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.rose, borderRadius: radius.pill, paddingHorizontal: spacing.lg, height: 42 },
  callText: { color: "#FFFFFF", fontWeight: "700", fontSize: T.base },
  notSupport: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  nsTitle: { color: colors.onSurfaceSecondary, fontSize: T.sm, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700", marginBottom: spacing.sm },
  nsList: { color: colors.onSurface, lineHeight: 22 },
  nsUse: { color: colors.onSurfaceSecondary, marginTop: spacing.sm, fontStyle: "italic", fontSize: T.sm },
  dismiss: { height: 56, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.border },
  dismissText: { color: colors.onSurface, fontWeight: "600", fontSize: T.lg },
});
