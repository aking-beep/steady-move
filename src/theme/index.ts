// The Steady Move design system.
//
// Two surfaces, one brand:
//   • Daylight — warm paper, forest ink. For browsing, planning, reflecting.
//   • Nightfall — warm near-black. For doing: the session player and the
//     breathing screen, where a bright screen in a dim room is the wrong
//     answer and a cinematic one is the right one.
//
// Craft rules this system encodes, rather than leaving to each screen:
//   • Separation comes from tone and hairlines, not drop shadows.
//   • Display type is set tight (negative tracking); all-caps labels are set
//     loose (positive tracking). Both are deliberate, and opposite.
//   • Numbers that matter are large, and set with tabular figures so they do
//     not jitter as they count down.
//   • One accent, used sparingly, reserved for action and progress.

import {Platform} from 'react-native';

// ——— Palette ————————————————————————————————————————————————————————————
//
// Near-black rather than pure black, and warm rather than blue: the dark
// surface should feel like the light one with the lamp off, not like a
// different product.

export const palette = {
  paper: '#F7F5F0',
  paperSunken: '#EFEBE2',
  paperRaised: '#FFFFFF',

  night: '#111310',
  nightSunken: '#0A0B09',
  nightRaised: '#1B1E1A',

  forest: '#1E3B2F',
  forestDeep: '#162C23',
  forestSoft: '#DDE6DD',

  sage: '#8CA98A',
  sageBright: '#A9CBA4',
  sageSoft: '#E6ECE2',

  clay: '#B4603A',
  claySoft: '#F3E2D7',
  clayBright: '#D98A5F',

  ink: '#191C17',
  inkMuted: '#595F54',
  inkFaint: '#8B9085',

  cream: '#F2EFE7',
  creamMuted: '#A9AEA3',
  creamFaint: '#6E7369',

  lineLight: '#E2DDD1',
  lineLightStrong: '#CDC7B8',
  lineDark: '#282C26',
  lineDarkStrong: '#3A3F37',

  caution: '#8A5323',
  cautionSoft: '#F6E9DB',
  cautionDark: '#E0A977'
} as const;

export interface Scheme {
  name: 'light' | 'dark';
  /** Page background. */
  bg: string;
  /** Recessed areas — track fills, inset wells. */
  bgSunken: string;
  /** Cards and sheets. */
  surface: string;
  /** A second surface step, for a card on a card. */
  surfaceAlt: string;

  ink: string;
  inkMuted: string;
  inkFaint: string;

  /** Hairlines. */
  line: string;
  lineStrong: string;

  /** Primary action fill, and the ink that sits on it. */
  accent: string;
  accentInk: string;
  accentPressed: string;
  /** A quiet wash of the accent, for selected states. */
  accentSoft: string;

  /** Progress, streaks, the one warm note. */
  highlight: string;
  highlightSoft: string;

  /** Caution copy. Never alarming. */
  caution: string;
  cautionSoft: string;

  scrim: string;
}

export const light: Scheme = {
  name: 'light',
  bg: palette.paper,
  bgSunken: palette.paperSunken,
  surface: palette.paperRaised,
  surfaceAlt: palette.paperSunken,

  ink: palette.ink,
  inkMuted: palette.inkMuted,
  inkFaint: palette.inkFaint,

  line: palette.lineLight,
  lineStrong: palette.lineLightStrong,

  accent: palette.forest,
  accentInk: palette.paper,
  accentPressed: palette.forestDeep,
  accentSoft: palette.forestSoft,

  highlight: palette.clay,
  highlightSoft: palette.claySoft,

  caution: palette.caution,
  cautionSoft: palette.cautionSoft,

  scrim: 'rgba(25, 28, 23, 0.45)'
};

/**
 * On a near-black surface a deep forest button disappears, so the primary
 * action inverts to cream — the same move a black-and-white brand makes.
 * The green stays as the colour of progress.
 */
export const dark: Scheme = {
  name: 'dark',
  bg: palette.night,
  bgSunken: palette.nightSunken,
  surface: palette.nightRaised,
  surfaceAlt: '#232722',

  ink: palette.cream,
  inkMuted: palette.creamMuted,
  inkFaint: palette.creamFaint,

  line: palette.lineDark,
  lineStrong: palette.lineDarkStrong,

  accent: palette.cream,
  accentInk: palette.night,
  accentPressed: '#DAD6CC',
  accentSoft: 'rgba(242, 239, 231, 0.10)',

  highlight: palette.clayBright,
  highlightSoft: 'rgba(217, 138, 95, 0.16)',

  caution: palette.cautionDark,
  cautionSoft: 'rgba(224, 169, 119, 0.14)',

  scrim: 'rgba(0, 0, 0, 0.6)'
};

/** The colour of progress, on either surface. */
export function progressColor(scheme: Scheme): string {
  return scheme.name === 'dark' ? palette.sageBright : palette.forest;
}

// ——— Spacing ————————————————————————————————————————————————————————————
// A 4pt base. Screens use `gutter` for their side margins and nothing else.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  huge: 56,
  gutter: 22
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  sheet: 32,
  pill: 999
} as const;

// ——— Type ———————————————————————————————————————————————————————————————
//
// Fraunces, an editorial serif, for the few places a screen speaks. Inter
// Tight for everything that works: labels, numbers, controls.

export const fonts = {
  displaySemi: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  sans: 'InterTight_400Regular',
  sansMedium: 'InterTight_500Medium',
  sansSemi: 'InterTight_600SemiBold',
  sansBold: 'InterTight_700Bold'
} as const;

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
};

/**
 * Display sizes carry negative tracking because default spacing looks gappy
 * once type is large; the all-caps label carries positive tracking for the
 * opposite reason. Line heights are explicit so OS font scaling grows the text
 * without collapsing the leading.
 */
export const type = {
  /** The one big statement on a screen. */
  display: {fontFamily: fonts.displaySemi, fontSize: 40, lineHeight: 44, letterSpacing: -1},
  /** Screen titles. */
  title: {fontFamily: fonts.displaySemi, fontSize: 29, lineHeight: 34, letterSpacing: -0.6},
  /** Editorial subheads, set in the serif at a readable weight. */
  serifBody: {fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 27, letterSpacing: -0.2},

  heading: {fontFamily: fonts.sansBold, fontSize: 21, lineHeight: 27, letterSpacing: -0.4},
  subheading: {fontFamily: fonts.sansSemi, fontSize: 16, lineHeight: 23, letterSpacing: -0.1},

  body: {fontFamily: fonts.sans, fontSize: 15.5, lineHeight: 23},
  bodyStrong: {fontFamily: fonts.sansSemi, fontSize: 15.5, lineHeight: 23},
  small: {fontFamily: fonts.sans, fontSize: 14, lineHeight: 21},
  smallStrong: {fontFamily: fonts.sansSemi, fontSize: 14, lineHeight: 21},
  caption: {fontFamily: fonts.sansMedium, fontSize: 12.5, lineHeight: 18},

  /** The all-caps eyebrow. Loose, small, and used as a rule-mate. */
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },

  /** Oversized statistics — the number is the thing. */
  stat: {fontFamily: fonts.sansSemi, fontSize: 36, lineHeight: 40, letterSpacing: -1.4},
  statLarge: {fontFamily: fonts.sansSemi, fontSize: 52, lineHeight: 54, letterSpacing: -2},
  /** The session clock. */
  timer: {fontFamily: fonts.sansMedium, fontSize: 74, lineHeight: 78, letterSpacing: -3},

  /** Former name for `label`, kept so screens can migrate one at a time. */
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  }
} as const satisfies Record<string, TextStyle>;

/**
 * Tabular figures, so a counting clock does not shuffle its own digits.
 * Applied to every number that changes in place.
 */
export const tabular = Platform.select({
  ios: {fontVariant: ['tabular-nums' as const]},
  default: {fontVariant: ['tabular-nums' as const]}
});

// ——— Depth ———————————————————————————————————————————————————————————————
// Premium interfaces separate with tone and hairlines. Shadow is reserved for
// things that genuinely float above the page.

export const elevation = {
  none: {},
  /** Former names: cards now separate with tone and a hairline, not shadow. */
  card: {},
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 6
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 12},
    elevation: 8
  }
} as const;

export const motion = {
  fast: 140,
  base: 240,
  slow: 420,
  pressScale: 0.975
} as const;

/** Minimum tappable edge. */
export const MIN_TAP = 44;

/** Bottom padding tab screens add so the last card clears the tab bar. */
export const TAB_BAR_INSET = 88;

/** Hairline that stays a hairline on every density. */
export const HAIRLINE = Platform.select({android: 0.8, default: 0.5}) as number;

// ——— Compatibility ——————————————————————————————————————————————————————
// The Daylight scheme under the names the screens already use, so the system
// can be adopted screen by screen rather than in one unreviewable sweep.

export const colors = {
  canvas: light.bg,
  canvasAlt: light.bgSunken,
  surface: light.surface,
  surfaceMuted: light.bgSunken,

  ink: light.ink,
  inkSoft: light.inkMuted,
  inkFaint: light.inkFaint,

  primary: light.accent,
  primaryPressed: light.accentPressed,
  onPrimary: light.accentInk,
  primarySoft: light.accentSoft,

  sage: palette.sage,
  sageSoft: palette.sageSoft,

  clay: light.highlight,
  claySoft: light.highlightSoft,

  border: light.line,
  borderStrong: light.lineStrong,

  caution: light.caution,
  cautionSoft: light.cautionSoft,

  scrim: light.scrim
} as const;

export const theme = {colors, light, dark, spacing, radius, type, elevation, motion, MIN_TAP};
export default theme;
