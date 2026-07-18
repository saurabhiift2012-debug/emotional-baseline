import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/src/AppContext";
import { Screen, Display, AppText, Card, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

type Res = {
  key: string;
  icon: any;
  en: string; hi: string;
  en_body: string[]; hi_body: string[];
};

const RESOURCES: Res[] = [
  {
    key: "breathing", icon: "wind",
    en: "A 2-minute breathing reset", hi: "2-मिनट की साँस रीसेट",
    en_body: ["Breathe in gently through your nose for 4 counts.", "Hold for 4 counts.", "Breathe out slowly for 6 counts.", "Repeat 5–6 times, letting your shoulders soften."],
    hi_body: ["नाक से धीरे-धीरे 4 गिनती तक साँस लें।", "4 गिनती तक रोकें।", "6 गिनती तक धीरे-धीरे साँस छोड़ें।", "5–6 बार दोहराएँ, कंधों को ढीला होने दें।"],
  },
  {
    key: "sleep", icon: "moon",
    en: "Winding down for better sleep", hi: "बेहतर नींद के लिए आराम",
    en_body: ["Dim the lights an hour before bed.", "Put screens away 30 minutes before sleep.", "Keep a consistent sleep and wake time.", "If your mind races, jot the thought down for tomorrow."],
    hi_body: ["सोने से एक घंटा पहले रोशनी कम करें।", "सोने से 30 मिनट पहले स्क्रीन दूर रखें।", "सोने और जागने का समय एक जैसा रखें।", "अगर मन बेचैन हो, तो विचार कल के लिए लिख लें।"],
  },
  {
    key: "grounding", icon: "anchor",
    en: "Grounding when things feel heavy", hi: "जब सब भारी लगे तब स्थिर होना",
    en_body: ["Notice 5 things you can see.", "4 things you can touch.", "3 things you can hear.", "2 things you can smell, and 1 you can taste.", "This gently brings you back to the present."],
    hi_body: ["5 चीज़ें देखें जो आप देख सकते हैं।", "4 चीज़ें जिन्हें छू सकते हैं।", "3 चीज़ें जो सुन सकते हैं।", "2 चीज़ें जिन्हें सूँघ सकते हैं, और 1 जिसे चख सकते हैं।", "यह आपको धीरे से वर्तमान में लाता है।"],
  },
  {
    key: "lowday", icon: "cloud-drizzle",
    en: "Moving through a low day", hi: "कठिन दिन से गुज़रना",
    en_body: ["Lower the bar — one small thing is enough.", "Step outside for a few minutes of daylight.", "Message one person you trust.", "Be as kind to yourself as you would to a friend."],
    hi_body: ["अपेक्षाएँ कम करें — एक छोटी चीज़ काफ़ी है।", "कुछ मिनट धूप के लिए बाहर जाएँ।", "किसी भरोसेमंद व्यक्ति को संदेश भेजें।", "जैसे किसी दोस्त के साथ, वैसे ही खुद के साथ नरम रहें।"],
  },
  {
    key: "seekhelp", icon: "life-buoy",
    en: "When to reach out for support", hi: "कब सहारा लेना चाहिए",
    en_body: ["If low feelings last most of the day for two weeks or more.", "If daily tasks, sleep or appetite are affected.", "If you feel hopeless or unsafe.", "Talking to a professional is a sign of strength — you can book a call from the Support tab."],
    hi_body: ["अगर उदासी दो हफ़्ते या उससे अधिक अधिकांश समय बनी रहे।", "अगर रोज़मर्रा के काम, नींद या भूख प्रभावित हों।", "अगर आप निराश या असुरक्षित महसूस करें।", "पेशेवर से बात करना ताक़त की निशानी है — सपोर्ट टैब से कॉल बुक करें।"],
  },
];

export default function Resources() {
  const { t, lang } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [open, setOpen] = useState<string | null>("breathing");

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable testID="resources-back" onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Display style={styles.title}>{t("resources")}</Display>
      </View>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <AppText style={styles.intro}>{t("resources_intro")}</AppText>
        {RESOURCES.map((r) => {
          const isOpen = open === r.key;
          const body = lang === "hi" ? r.hi_body : r.en_body;
          return (
            <Card key={r.key} style={{ marginBottom: spacing.md }} testID={`resource-${r.key}`}>
              <Pressable onPress={() => { Haptics.selectionAsync(); setOpen(isOpen ? null : r.key); }} style={styles.rowHead}>
                <View style={styles.icon}><Feather name={r.icon} size={18} color={colors.sage} /></View>
                <AppText style={styles.rowTitle}>{lang === "hi" ? r.hi : r.en}</AppText>
                <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.onSurfaceSecondary} />
              </Pressable>
              {isOpen && (
                <View style={styles.body}>
                  {body.map((line, i) => (
                    <View key={i} style={styles.bullet}>
                      <View style={styles.dot} />
                      <AppText style={styles.bulletText}>{line}</AppText>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
        <AppText style={styles.note}>{t("not_medical")}</AppText>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 26 },
  wrap: { paddingHorizontal: spacing.xl },
  intro: { color: colors.onSurfaceSecondary, fontSize: T.base, lineHeight: 22, marginBottom: spacing.lg },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  rowTitle: { flex: 1, fontSize: T.lg, color: colors.onSurface, fontWeight: "500" },
  body: { marginTop: spacing.md, paddingLeft: spacing.xs },
  bullet: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber, marginTop: 8 },
  bulletText: { flex: 1, fontSize: T.base, color: colors.onSurface, lineHeight: 22 },
  note: { fontSize: T.sm, color: colors.onSurfaceSecondary, fontStyle: "italic", marginTop: spacing.md, lineHeight: 18 },
});
