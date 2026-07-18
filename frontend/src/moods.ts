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

export const CONTEXT_TAGS = [
  "work", "family", "relationships", "health", "sleep",
  "money", "exercise", "social", "travel", "weather", "other",
];

export function moodByKey(key: string | null | undefined, list: Mood[] = MOODS) {
  return list.find((m) => m.key === key);
}

export { colors };
