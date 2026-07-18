import React from "react";
import { View, Image, StyleSheet } from "react-native";

const MARK = require("../assets/images/logo-mark.png");

// The brand mark sits on a white rounded chip so it reads cleanly in both
// light and dark themes (the artwork itself has a light background).
export function Logo({ size = 64 }: { size?: number }) {
  const pad = Math.round(size * 0.12);
  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: Math.round(size * 0.28), padding: pad }]}>
      <Image source={MARK} style={{ width: size - pad * 2, height: size - pad * 2 }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
});
