import React from "react";
import { Text } from "react-native";
import { Image } from "expo-image";
import { Mood, moodGif } from "./moods";

// Renders the animated Noto emoji GIF for a mood, with a static glyph fallback.
export function MoodEmoji({ mood, size }: { mood?: Mood | null; size: number }) {
  const uri = moodGif(mood?.cp);
  if (!uri) {
    return <Text style={{ fontSize: size * 0.9 }}>{mood?.emoji || ""}</Text>;
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={150}
      // expo-image autoplays animated GIFs
      accessibilityLabel={mood?.en}
    />
  );
}
