export type ThemeColors = {
  surface: string;
  onSurface: string;
  surfaceSecondary: string;
  onSurfaceSecondary: string;
  surfaceTertiary: string;
  surfaceInverse: string;
  onSurfaceInverse: string;
  indigo: string;
  amber: string;
  sage: string;
  rose: string;
  border: string;
  borderStrong: string;
  divider: string;
  // soft tint used for highlighted cards (privacy / info)
  tintWarm: string;
  tintInfo: string;
  tintSage: string;
  tintLav: string;
  tintRose: string;
};

export const lightColors: ThemeColors = {
  surface: "#FAF7F2",
  onSurface: "#2C2416",
  surfaceSecondary: "#F2EBE1",
  onSurfaceSecondary: "#6B5C47",
  surfaceTertiary: "#E8DFC9",
  surfaceInverse: "#2C2416",
  onSurfaceInverse: "#FAF7F2",
  indigo: "#3D4F7C",
  amber: "#D4A574",
  sage: "#8BAF8C",
  rose: "#C9897A",
  border: "#E8DFC9",
  borderStrong: "#D4A574",
  divider: "#E8DFC9",
  tintWarm: "#F5E9D8",
  tintInfo: "#EAEFF6",
  tintSage: "#EAF0E6",
  tintLav: "#EDE7F0",
  tintRose: "#F3E6E2",
};

export const darkColors: ThemeColors = {
  surface: "#15120D",
  onSurface: "#F3EDE3",
  surfaceSecondary: "#221E17",
  onSurfaceSecondary: "#A99B84",
  surfaceTertiary: "#2E281F",
  surfaceInverse: "#F3EDE3",
  onSurfaceInverse: "#15120D",
  indigo: "#94A7DC",
  amber: "#E0B784",
  sage: "#A0C6A1",
  rose: "#E0A091",
  border: "#2E281F",
  borderStrong: "#4A4030",
  divider: "#2E281F",
  tintWarm: "#2B2418",
  tintInfo: "#1E2436",
  tintSage: "#1C2A1E",
  tintLav: "#241E33",
  tintRose: "#2E1E1A",
};

// Default (light) — kept for the few non-reactive module-scope usages.
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const font = {
  display: "Fraunces",
  body: "DMSans",
};

export const type = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  display: 34,
};

// Confidence badge palette (Sage -> Amber -> Indigo), themed.
export function confidenceFor(c: ThemeColors) {
  return {
    early_signal: { bg: c.sage, fg: c.onSurfaceInverse, en: "Early Signal", hi: "शुरुआती संकेत" },
    emerging: { bg: c.amber, fg: "#2C2416", en: "Emerging Pattern", hi: "उभरता पैटर्न" },
    consistent: { bg: c.indigo, fg: c.onSurfaceInverse, en: "Consistent Pattern", hi: "सुसंगत पैटर्न" },
  };
}

export type ConfidenceLevel = "early_signal" | "emerging" | "consistent";
