import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useColorScheme, StyleSheet } from "react-native";
import { storage } from "@/src/utils/storage";
import { lightColors, darkColors, ThemeColors } from "./theme";

export type ThemePref = "system" | "light" | "dark";
const PREF_KEY = "therapishots_theme_pref";

type ThemeCtx = {
  colors: ThemeColors;
  scheme: "light" | "dark";
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  colors: lightColors,
  scheme: "light",
  pref: "system",
  setPref: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<ThemePref>(PREF_KEY, "system");
      if (saved === "light" || saved === "dark" || saved === "system") setPrefState(saved);
    })();
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    storage.setItem(PREF_KEY, p);
  }, []);

  const scheme: "light" | "dark" = pref === "system" ? (systemScheme === "dark" ? "dark" : "light") : pref;
  const colors = scheme === "dark" ? darkColors : lightColors;

  const value = useMemo(() => ({ colors, scheme, pref, setPref }), [colors, scheme, pref, setPref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Helper: build themed styles memoised on the current palette.
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ThemeColors) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
