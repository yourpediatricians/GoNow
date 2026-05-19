export const Colors = {
  // Brand
  primary: '#FF5A1F',
  primaryDark: '#E04010',
  primaryLight: '#FF7A45',
  secondary: '#1A1A2E',
  accent: '#FFD700',

  // Neutrals
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  surfaceBorder: '#2E2E2E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',
  textInverse: '#000000',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Captain
  captainPrimary: '#6C63FF',
  captainSecondary: '#4CAF50',

  // Map
  mapPinRider: '#FF5A1F',
  mapPinCaptain: '#6C63FF',
  mapRoute: '#FF5A1F',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
  black: '900' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};
