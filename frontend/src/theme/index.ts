// MatchUp Design System — dark-first premium tokens
// Inspired by Spotify / Strava / Discord aesthetic

export const colors = {
  // Backgrounds — deep obsidian
  bg: "#090A0C",
  bgElevated: "#121418",
  surface: "#1A1D22",
  surfaceHigh: "#22262D",
  border: "#2A2E36",
  borderStrong: "#3A3F4A",

  // Terrain Green (Spotify-esque signature)
  primary: "#1ED760",
  primaryHover: "#17B94D",
  primaryMuted: "rgba(30, 215, 96, 0.14)",
  primaryDim: "rgba(30, 215, 96, 0.35)",

  // Semantic
  accent: "#FFB020",
  danger: "#FF5A5F",
  info: "#4EA8FF",

  // Text
  text: "#F5F7FA",
  textSecondary: "#9BA4B0",
  textMuted: "#6B7280",
  textOnPrimary: "#0A0F0C",

  // Overlays
  scrim: "rgba(0,0,0,0.55)",
  overlay: "rgba(9,10,12,0.72)",

  // Level chips
  levelRookie: "#4EA8FF",
  levelIntermediate: "#1ED760",
  levelAdvanced: "#FFB020",
  levelElite: "#FF5A5F",
  levelMixed: "#B37DFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  // Barlow Condensed — tactical/display for headings + stats
  displayBold: "BarlowCondensed-Bold",
  displaySemi: "BarlowCondensed-SemiBold",
  displayMedium: "BarlowCondensed-Medium",
  // DM Sans — body
  body: "DMSans-Regular",
  bodyMedium: "DMSans-Medium",
  bodyBold: "DMSans-Bold",
  // Mono
  mono: "SpaceMono-Regular",
} as const;

export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 42, letterSpacing: -0.5, lineHeight: 46 },
  h1: { fontFamily: fonts.displayBold, fontSize: 32, letterSpacing: -0.4, lineHeight: 36 },
  h2: { fontFamily: fonts.displaySemi, fontSize: 24, letterSpacing: -0.2, lineHeight: 28 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 20, letterSpacing: -0.1, lineHeight: 24 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, letterSpacing: 0 },
  body: { fontFamily: fonts.body, fontSize: 15, letterSpacing: 0, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  small: { fontFamily: fonts.body, fontSize: 13, letterSpacing: 0 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 0.2 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" as const },
  stat: { fontFamily: fonts.displayBold, fontSize: 28, letterSpacing: -0.2 },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const levelMeta = (lvl?: string | null) => {
  switch (lvl) {
    case "rookie":
      return { label: "Débutant", color: colors.levelRookie };
    case "intermediate":
      return { label: "Intermédiaire", color: colors.levelIntermediate };
    case "advanced":
      return { label: "Avancé", color: colors.levelAdvanced };
    case "elite":
      return { label: "Élite", color: colors.levelElite };
    case "mixed":
      return { label: "Tous niveaux", color: colors.levelMixed };
    default:
      return { label: "—", color: colors.textMuted };
  }
};

export const positionMeta = (pos?: string | null) => {
  switch (pos) {
    case "GK":
      return { label: "Gardien", short: "GK" };
    case "DEF":
      return { label: "Défenseur", short: "DEF" };
    case "MID":
      return { label: "Milieu", short: "MID" };
    case "FWD":
      return { label: "Attaquant", short: "FWD" };
    default:
      return { label: "Polyvalent", short: "—" };
  }
};
