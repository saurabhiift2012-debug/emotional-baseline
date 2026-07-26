import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { AppText, spacing, radius, font, T, useTheme, useThemedStyles } from "./ui";

// Indian phone input with a fixed, non-editable "+91" prefix.
// `value` holds ONLY the 10 local digits; parent sends `+91${value}`.
export function PhoneField({
  value, onChangeText, testID, placeholder = "98765 43210",
}: { value: string; onChangeText: (v: string) => void; testID?: string; placeholder?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <View style={styles.prefix}>
        <AppText style={styles.prefixText}>+91</AppText>
      </View>
      <TextInput
        testID={testID}
        style={styles.input}
        value={value}
        onChangeText={(txt) => onChangeText(txt.replace(/\D/g, "").slice(0, 10))}
        keyboardType="number-pad"
        maxLength={10}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceSecondary}
      />
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  prefix: {
    height: 52, minWidth: 56, paddingHorizontal: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  prefixText: { fontFamily: font.body, fontSize: T.lg, color: colors.onSurface, fontWeight: "600" },
  input: {
    flex: 1, height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg, fontFamily: font.body, fontSize: T.lg, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.border,
  },
});
