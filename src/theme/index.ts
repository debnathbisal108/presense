// src/theme/index.ts
// PreSense AI — Design System
// Aesthetic: "Biopunk Minimalism" — deep navy biometric surfaces,
// electric teal pulse accents, warm amber alert states.
// Evokes a clinical-grade health interface with a living, breathing quality.

export const Colors = {
  // ── Core backgrounds ──────────────────────────────────────────────
  bg: {
    primary:   '#080E1A',   // near-black navy — deep body-scan dark
    secondary: '#0D1626',   // slightly lifted surface
    card:      '#111E33',   // card backgrounds
    elevated:  '#162240',   // elevated panels / modals
    overlay:   'rgba(8, 14, 26, 0.85)',
  },

  // ── Brand / accent ────────────────────────────────────────────────
  teal: {
    bright:  '#00E5CC',   // primary CTA, pulse rings
    mid:     '#00B8A3',   // secondary usage
    dim:     '#007A6D',   // muted / disabled state
    glow:    'rgba(0, 229, 204, 0.18)',
    glowStrong: 'rgba(0, 229, 204, 0.35)',
  },

  // ── Risk states ───────────────────────────────────────────────────
  risk: {
    low: {
      primary: '#00E5A0',
      glow:    'rgba(0, 229, 160, 0.20)',
      bg:      'rgba(0, 229, 160, 0.08)',
    },
    medium: {
      primary: '#FFB830',
      glow:    'rgba(255, 184, 48, 0.20)',
      bg:      'rgba(255, 184, 48, 0.08)',
    },
    high: {
      primary: '#FF4D6A',
      glow:    'rgba(255, 77, 106, 0.22)',
      bg:      'rgba(255, 77, 106, 0.09)',
    },
  },

  // ── Metric colors ─────────────────────────────────────────────────
  glucose: '#E5C07B',    // warm amber
  stress:  '#E06C75',    // soft red
  bp:      '#61AFEF',    // sky blue
  energy:  '#98C379',    // sage green

  // ── Text ──────────────────────────────────────────────────────────
  text: {
    primary:   '#E8F0FA',
    secondary: '#7A9BC0',
    muted:     '#3D5A7A',
    inverse:   '#080E1A',
  },

  // ── Borders ───────────────────────────────────────────────────────
  border: {
    subtle:  'rgba(0, 229, 204, 0.08)',
    mild:    'rgba(0, 229, 204, 0.18)',
    strong:  'rgba(0, 229, 204, 0.40)',
  },

  white:       '#FFFFFF',
  transparent: 'transparent',
};

export const Typography = {
  // Display font: Courier-like monospace gives clinical data readout feel
  // Body: system default San Francisco / Roboto for legibility
  families: {
    display: 'Courier',          // monospace — vital-sign readout aesthetic
    heading: 'Georgia',          // serif — authoritative, trustworthy
    body:    'System',           // system default
    mono:    'Courier',
  },
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    '2xl': 30,
    '3xl': 38,
    '4xl': 48,
  },
  weights: {
    regular: '400' as const,
    medium:  '500' as const,
    semibold:'600' as const,
    bold:    '700' as const,
    black:   '900' as const,
  },
  lineHeights: {
    tight:  1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
  '5xl': 72,
};

export const Radii = {
  sm:   6,
  md:   12,
  lg:   18,
  xl:   24,
  '2xl': 32,
  full: 9999,
};

export const Shadows = {
  teal: {
    shadowColor: Colors.teal.bright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: (color: string, radius = 16) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: radius,
    elevation: 10,
  }),
};

export const Animations = {
  fast:   200,
  normal: 350,
  slow:   600,
  pulse:  1500,
};

export default {
  Colors,
  Typography,
  Spacing,
  Radii,
  Shadows,
  Animations,
};
