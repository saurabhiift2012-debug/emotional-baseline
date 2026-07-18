import { colors } from "./theme";

export type Mood = {
  key: string;
  emoji: string;
  group: "low" | "neutral" | "bright";
  value: number;
  en: string;
  hi: string;
};

// Fallback catalogue mirrored from backend /api/config (used before config loads).
export const MOODS: Mood[] = [
  { key: "heavy", emoji: "😔", group: "low", value: 1, en: "Heavy", hi: "भारी" },
  { key: "anxious", emoji: "😰", group: "low", value: 2, en: "Anxious", hi: "घबराहट" },
  { key: "frustrated", emoji: "😤", group: "low", value: 2, en: "Frustrated", hi: "खीझ" },
  { key: "numb", emoji: "😶", group: "neutral", value: 3, en: "Numb", hi: "सुन्न" },
  { key: "foggy", emoji: "😑", group: "neutral", value: 3, en: "Foggy", hi: "धुंधला" },
  { key: "okay", emoji: "😐", group: "neutral", value: 4, en: "Okay", hi: "ठीक-ठाक" },
  { key: "hopeful", emoji: "🌱", group: "bright", value: 5, en: "Hopeful", hi: "उम्मीद" },
  { key: "calm", emoji: "😌", group: "bright", value: 5, en: "Calm", hi: "शांत" },
  { key: "energised", emoji: "⚡", group: "bright", value: 6, en: "Energised", hi: "ऊर्जा" },
];

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
