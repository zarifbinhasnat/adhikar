/**
 * Adhikar design tokens for Know Your Rights BD.
 * Palette: warm paper-ink-clay. Never pure black or pure white.
 * Full token rationale in /Legal Adviser/colors_and_type.css
 */

// ── Raw palette ────────────────────────────────────────────────────────────

export const PALETTE = {
  paper50:  '#FBF8F3',
  paper100: '#F5F0E8',
  paper200: '#EDE6DA',
  paper300: '#E1D8C7',
  paper400: '#C8BCA6',

  ink900: '#1F1B16',
  ink700: '#3A332A',
  ink500: '#5C5346',
  ink400: '#7B7160',
  ink300: '#9D9484',

  clay900: '#6E2F1A',
  clay700: '#9C4126',
  clay500: '#C96442',
  clay300: '#E8B59E',
  clay100: '#F5E2D6',
  clay50:  '#FBF1E9',

  sage900: '#2D4A3E',
  sage700: '#4A6F5E',
  sage500: '#6B8E7F',
  sage300: '#A8C0B5',
  sage100: '#DCE8E1',
  sage50:  '#EEF3F0',

  ochre900: '#6B4A12',
  ochre700: '#9A6F1F',
  ochre500: '#C99846',
  ochre300: '#E6C997',
  ochre100: '#F4E4C3',
  ochre50:  '#FBF4E3',

  coral900: '#6B2820',
  coral700: '#8E3A2C',
  coral500: '#B85541',
  coral300: '#DCA294',
  coral100: '#F0D8D0',
  coral50:  '#F9EAE4',
};

// ── Semantic color roles (use these in components) ─────────────────────────

export const COLORS = {
  // Spread raw palette so screens can do COLORS.clay500 etc.
  ...PALETTE,

  // Semantic roles
  primary:       '#C96442',  // clay500 — CTAs, tabs active, focus
  primaryLight:  '#9C4126',  // clay700 — hover/pressed state
  primarySoft:   '#F5E2D6',  // clay100 — tinted bg
  primaryBorder: '#E1D8C7',  // paper300

  background:   '#F5F0E8',  // paper100 — app background
  surface:      '#FBF8F3',  // paper50  — cards, elevated surfaces
  surfaceAlt:   '#EDE6DA',  // paper200 — recessed wells
  surfaceInput: '#FBF8F3',  // paper50  — input backgrounds
  border:       '#E1D8C7',  // paper300 — hairlines

  textPrimary:   '#1F1B16',  // ink900
  textSecondary: '#3A332A',  // ink700
  textMuted:     '#5C5346',  // ink500
  textLight:     '#7B7160',  // ink400
  textFaint:     '#9D9484',  // ink300
  onAccent:      '#FBF8F3',  // paper50 — text on clay/coral backgrounds

  danger:        '#B85541',  // coral500 — mature emergency, not panic-red
  dangerSoft:    '#F0D8D0',  // coral100
  dangerDark:    '#8E3A2C',  // coral700

  success:       '#4A6F5E',  // sage700
  successSoft:   '#DCE8E1',  // sage100
  successDark:   '#2D4A3E',  // sage900
  successBorder: '#A8C0B5',  // sage300

  warning:       '#C99846',  // ochre500
  warningSoft:   '#FBF4E3',  // ochre50
  warningDark:   '#6B4A12',  // ochre900
  warningMid:    '#9A6F1F',  // ochre700

  accent:      '#C96442',  // clay500
  accentSoft:  '#F5E2D6',  // clay100
  accentHover: '#9C4126',  // clay700

  // Pure white only for content on deeply tinted surfaces
  white: '#FFFFFF',
};

// ── Typography ─────────────────────────────────────────────────────────────

export const FONTS = {
  family: {
    normal:    'Manrope_400Regular',
    medium:    'Manrope_500Medium',
    semibold:  'Manrope_600SemiBold',
    bold:      'Manrope_700Bold',
    serif:     'SourceSerif4_400Regular',
    serifBold: 'SourceSerif4_600SemiBold',
    bn:        'HindSiliguri_400Regular',
    bnMedium:  'HindSiliguri_500Medium',
    bnBold:    'HindSiliguri_700Bold',
  },
  size: {
    xs:    12,
    sm:    14,
    md:    15,  // Adhikar minimum body size
    lg:    17,
    xl:    20,
    xxl:   22,
    title: 26,  // mobile page title
  },
  weight: {
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
};

// ── Spacing — 4px base grid ────────────────────────────────────────────────

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

// ── Radii — soft, never sharp ──────────────────────────────────────────────

export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  xxl:  28,
  pill: 999,
};

// ── Shadows — warm ink tones, never pure black ─────────────────────────────

const SHADOW_COLOR = '#3A332A';  // ink700

export const SHADOWS = {
  xs: {
    elevation: 1,
    shadowColor: SHADOW_COLOR,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  sm: {
    elevation: 2,
    shadowColor: SHADOW_COLOR,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  md: {
    elevation: 4,
    shadowColor: SHADOW_COLOR,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  lg: {
    elevation: 8,
    shadowColor: SHADOW_COLOR,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
  },
};
