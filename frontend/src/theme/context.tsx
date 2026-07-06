// Theme provider — dark / light with persistence.
// Screens use `useThemeColors()` for dynamic colors; static tokens (spacing, radius, fonts, type)
// remain shared. Legacy `colors` import still works and points to dark palette.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";

export type ThemeMode = "dark" | "light";

export const darkPalette = {
  bg: "#090A0C",
  bgElevated: "#121418",
  surface: "#1A1D22",
  surfaceHigh: "#22262D",
  border: "#2A2E36",
  borderStrong: "#3A3F4A",
  primary: "#1ED760",
  primaryHover: "#17B94D",
  primaryMuted: "rgba(30, 215, 96, 0.14)",
  primaryDim: "rgba(30, 215, 96, 0.35)",
  accent: "#FFB020",
  danger: "#FF5A5F",
  info: "#4EA8FF",
  text: "#F5F7FA",
  textSecondary: "#9BA4B0",
  textMuted: "#6B7280",
  textOnPrimary: "#0A0F0C",
  scrim: "rgba(0,0,0,0.55)",
  overlay: "rgba(9,10,12,0.72)",
  levelRookie: "#4EA8FF",
  levelIntermediate: "#1ED760",
  levelAdvanced: "#FFB020",
  levelElite: "#FF5A5F",
  levelMixed: "#B37DFF",
} as const;

export const lightPalette = {
  bg: "#F7F8FA",
  bgElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceHigh: "#F0F2F5",
  border: "#E4E7EC",
  borderStrong: "#CBD0D8",
  primary: "#00A344",
  primaryHover: "#008E3B",
  primaryMuted: "rgba(0, 163, 68, 0.10)",
  primaryDim: "rgba(0, 163, 68, 0.3)",
  accent: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textOnPrimary: "#FFFFFF",
  scrim: "rgba(15,23,42,0.45)",
  overlay: "rgba(247,248,250,0.85)",
  levelRookie: "#2563EB",
  levelIntermediate: "#00A344",
  levelAdvanced: "#D97706",
  levelElite: "#DC2626",
  levelMixed: "#7C3AED",
} as const;

export type ThemePalette = typeof darkPalette;

type Ctx = {
  mode: ThemeMode;
  colors: ThemePalette;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);
const KEY = "matchup_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<ThemeMode>(KEY, "dark");
      if (stored === "light" || stored === "dark") setModeState(stored);
    })();
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    await storage.setItem(KEY, m);
  }, []);

  const toggle = useCallback(() => setMode(mode === "dark" ? "light" : "dark"), [mode, setMode]);
  const palette = mode === "dark" ? darkPalette : lightPalette;

  return <ThemeCtx.Provider value={{ mode, colors: palette, toggle, setMode }}>{children}</ThemeCtx.Provider>;
}

export function useThemeColors(): ThemePalette {
  const v = useContext(ThemeCtx);
  return v?.colors ?? darkPalette;
}

export function useTheme(): Ctx {
  const v = useContext(ThemeCtx);
  if (!v) {
    return {
      mode: "dark",
      colors: darkPalette,
      toggle: () => {},
      setMode: () => {},
    };
  }
  return v;
}
