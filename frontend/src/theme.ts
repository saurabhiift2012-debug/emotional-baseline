export const colors = {
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
};

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

// Confidence badge palette (Sage -> Amber -> Indigo)
export const confidence = {
  early_signal: { bg: colors.sage, fg: "#2C2416", en: "Early Signal", hi: "शुरुआती संकेत" },
  emerging: { bg: colors.amber, fg: "#2C2416", en: "Emerging Pattern", hi: "उभरता पैटर्न" },
  consistent: { bg: colors.indigo, fg: "#FAF7F2", en: "Consistent Pattern", hi: "सुसंगत पैटर्न" },
};
