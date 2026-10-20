// The Steady Move design system: one restrained, natural palette plus a single
// spacing, radius and type scale. Screens compose these tokens and never
// hard-code a colour or a magic number.

export const colors = {
  /** Warm off-white page background. */
  canvas: '#F5F2EB',
  /** Slightly warmer surface for stacked sections. */
  canvasAlt: '#EFEBE1',
  /** Card and sheet surfaces. */
  surface: '#FFFFFF',
  /** Quiet filled surface (chips at rest, inactive tracks). */
  surfaceMuted: '#E9E5DA',

  /** Charcoal body and heading type. */
  ink: '#22251F',
  /** Secondary type. */
  inkSoft: '#5C6157',
  /** Tertiary type, captions, metadata. */
  inkFaint: '#8A8F82',

  /** Deep forest green: primary actions and emphasis. */
  primary: '#1F3D30',
  primaryPressed: '#172E25',
  /** Type and icons placed on the primary colour. */
  onPrimary: '#F5F2EB',
  /** Light green wash behind primary content. */
  primarySoft: '#DDE7DF',

  /** Sage: secondary accents, selected states, progress fills. */
  sage: '#8AA888',
  sageSoft: '#E4EBE0',

  /** Clay: warm accent for streaks and highlights. Used sparingly. */
  clay: '#B06B45',
  claySoft: '#F2E3D8',

  /** Hairlines and dividers. */
  border: '#DFDACE',
  borderStrong: '#C9C3B4',

  /** Safety / caution messaging. Never alarming red. */
  caution: '#8A5A2B',
  cautionSoft: '#F6EADC',

  /** Scrims for modal and overlay states. */
  scrim: 'rgba(34, 37, 31, 0.45)'
} as const;

/** 4pt base spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 44
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999
} as const;

/**
 * Type scale. `lineHeight` is always set so that OS font scaling grows text
 * without collapsing line spacing.
 */
export const type = {
  display: {fontSize: 40, lineHeight: 44, fontWeight: '700' as const, letterSpacing: -1},
  title: {fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.6},
  heading: {fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3},
  subheading: {fontSize: 17, lineHeight: 24, fontWeight: '600' as const},
  body: {fontSize: 16, lineHeight: 24, fontWeight: '400' as const},
  bodyStrong: {fontSize: 16, lineHeight: 24, fontWeight: '600' as const},
  small: {fontSize: 14, lineHeight: 20, fontWeight: '400' as const},
  caption: {fontSize: 13, lineHeight: 18, fontWeight: '500' as const},
  /** All-caps section eyebrow. */
  eyebrow: {fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 1.4},
  /** Tabular-feeling numerals for timers. */
  timer: {fontSize: 64, lineHeight: 70, fontWeight: '300' as const, letterSpacing: -2}
} as const;

/** Soft, low-contrast elevation. Android uses `elevation`, iOS the shadow set. */
export const elevation = {
  card: {
    shadowColor: '#22251F',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 2
  },
  raised: {
    shadowColor: '#22251F',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 10},
    elevation: 6
  }
} as const;

/** Animation timings. Every consumer must also respect the reduce-motion setting. */
export const motion = {
  fast: 140,
  base: 240,
  slow: 420,
  /** Press feedback scale for tappable surfaces. */
  pressScale: 0.97
} as const;

/** Minimum tappable edge, per platform accessibility guidance. */
export const MIN_TAP = 44;

/**
 * Bottom padding tab screens add so their last card clears the tab bar.
 *
 * The bar itself is sized by React Navigation, which also adds the device's
 * safe-area inset — pinning its height clipped the labels. This is therefore a
 * deliberate over-estimate of the bar's content height: a little extra space
 * after the final card costs nothing, whereas too little hides it.
 */
export const TAB_BAR_INSET = 88;

export const theme = {colors, spacing, radius, type, elevation, motion, MIN_TAP};
export default theme;
