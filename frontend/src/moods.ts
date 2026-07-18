import { colors } from "./theme";

export type Mood = {
  key: string;
  emoji: string;
  cp?: string;
  group: "low" | "neutral" | "bright";
  value: number;
  en: string;
  hi: string;
};

// Fallback catalogue mirrored from backend /api/config (used before config loads).
export const MOODS: Mood[] = [
  { key: "heavy", emoji: "😔", cp: "1f614", group: "low", value: 1, en: "Heavy", hi: "भारी" },
  { key: "anxious", emoji: "😰", cp: "1f630", group: "low", value: 2, en: "Anxious", hi: "घबराहट" },
  { key: "frustrated", emoji: "😤", cp: "1f624", group: "low", value: 2, en: "Frustrated", hi: "खीझ" },
  { key: "numb", emoji: "😶", cp: "1f636", group: "neutral", value: 3, en: "Numb", hi: "सुन्न" },
  { key: "foggy", emoji: "😑", cp: "1f611", group: "neutral", value: 3, en: "Foggy", hi: "धुंधला" },
  { key: "okay", emoji: "😐", cp: "1f610", group: "neutral", value: 4, en: "Okay", hi: "ठीक-ठाक" },
  { key: "hopeful", emoji: "🌱", cp: "1f331", group: "bright", value: 5, en: "Hopeful", hi: "उम्मीद" },
  { key: "calm", emoji: "😌", cp: "1f60c", group: "bright", value: 5, en: "Calm", hi: "शांत" },
  { key: "energised", emoji: "⚡", cp: "26a1", group: "bright", value: 6, en: "Energised", hi: "ऊर्जा" },
];

// Google Noto Animated Emoji (GIF) per codepoint.
export function moodGif(cp?: string | null): string | null {
  if (!cp) return null;
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;
}

// Subtle warm tints per group — NOT good/bad semantics. All warm, gentle.
export const GROUP_TINT: Record<string, string> = {
  low: "#EFE3DC",
  neutral: "#F1EBDD",
  bright: "#E7EEE3",
};

// Stronger, clearly-visible tones for the Feel Map (uses the core brand palette:
// rose / amber / sage). Tonal, not a good/bad scale.
export const GROUP_COLOR: Record<string, string> = {
  low: "#C9897A",
  neutral: "#D4A574",
  bright: "#8BAF8C",
};

// Per-mood expressive palette arranged by ENERGY (not good/bad): a cohesive
// "dusk spectrum". Each mood gets a soft gradient pill (from -> to) + accent.
export const MOOD_COLORS: Record<string, { from: string; to: string; accent: string }> = {
  heavy:      { from: "#6B7BB0", to: "#4E5C8C", accent: "#5C6B9E" },
  anxious:    { from: "#8B80D0", to: "#6A5FB0", accent: "#7A6FC0" },
  frustrated: { from: "#D9987C", to: "#BE7A5F", accent: "#CE8A6E" },
  numb:       { from: "#9AA3B4", to: "#7C8598", accent: "#8B94A6" },
  foggy:      { from: "#A9B7BF", to: "#8B9AA2", accent: "#9BAAB2" },
  okay:       { from: "#E3D29A", to: "#CBB679", accent: "#D8C588" },
  hopeful:    { from: "#9ECDA8", to: "#7EAF8A", accent: "#8FBF9A" },
  calm:       { from: "#8FC4D1", to: "#6FA6B4", accent: "#7FB6C4" },
  energised:  { from: "#EFC45E", to: "#D9A63C", accent: "#E6B54A" },
};

export const CONTEXT_TAGS = [
  "work", "family", "relationships", "health", "sleep",
  "money", "exercise", "social", "travel", "weather", "other",
];

export function moodByKey(key: string | null | undefined, list: Mood[] = MOODS) {
  return list.find((m) => m.key === key);
}

export { colors };
