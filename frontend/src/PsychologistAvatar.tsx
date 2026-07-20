import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "./ui";

// Shows a real admin-supplied photo when present; otherwise falls back to a
// neutral icon (never a fake stock person).
export function PsychologistAvatar({ photo, size }: { photo?: string; size: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const show = !!photo && !failed;
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
      ]}
    >
      {show ? (
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : (
        <Feather name="user" size={size * 0.44} color={colors.indigo} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1 },
});
