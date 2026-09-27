import { Platform } from 'react-native';
import {
  CategoryMeta,
  CategoryName,
  ExpenseCategory,
  IncomeCategory,
} from '../types/budget';

/**
 * Clean Editorial Bento & Studio Design System
 * #F5F5F7 gallery canvas, #FFFFFF rounded-3xl Bento tiles, #1D1D1F ink,
 * #0071E3 primary blue actions, and dark contrast hero surfaces.
 */
export const STUDIO_FONT_FAMILY = Platform.select({
  web: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  ios: 'System',
  default: 'sans-serif',
});

export const APPLE_FONT_FAMILY = STUDIO_FONT_FAMILY;

export const STUDIO_COLORS = {
  background: '#F5F5F7',
  heroBackground: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F7',
  surfaceTertiary: '#E8E8ED',

  cinemaBlack: '#000000',
  cinemaSurface: '#101014',
  cinemaElevated: '#1C1C1E',
  cinemaGlass: 'rgba(255, 255, 255, 0.08)',
  cinemaBorder: 'rgba(255, 255, 255, 0.12)',

  navGlassLight: 'rgba(255, 255, 255, 0.85)',
  navBorder: 'rgba(0, 0, 0, 0.08)',
  cardBorder: 'rgba(0, 0, 0, 0.06)',
  divider: '#E5E5EA',

  textPrimary: '#1D1D1F',
  textSecondary: '#6E6E73',
  textMuted: '#86868B',
  textOnDark: '#F5F5F7',
  textOnDarkMuted: '#A1A1A6',

  primaryBlue: '#0071E3',
  primaryBlueHover: '#0077ED',
  primaryBlueLight: '#E8F2FF',
  primaryBlueSoft: '#2997FF',

  // Compatibility aliases
  appleBlue: '#0071E3',
  appleBlueHover: '#0077ED',
  appleBlueLight: '#E8F2FF',
  appleBlueSoft: '#2997FF',

  positive: '#28CD41',
  positiveDark: '#1F9E32',
  positiveBg: '#EAFBF0',

  warning: '#FF9500',
  warningDark: '#C93400',
  warningBg: '#FFF5E5',

  danger: '#FF3B30',
  dangerDark: '#D70015',
  dangerBg: '#FFECEB',

  purple: '#AF52DE',
  teal: '#00C7BE',
  pink: '#FF2D55',
  indigo: '#5856D6',

  bgPrimary: '#F5F5F7',
  bgElevated: '#FFFFFF',
  bgSurface: '#FFFFFF',
  bgGlass: '#FFFFFF',
  bgGlassStrong: '#F5F5F7',
  bgGlassHover: '#E8E8ED',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  borderGlass: 'rgba(0, 0, 0, 0.08)',
  borderHighlight: '#0071E3',
  accentBlue: '#0071E3',
  accentCyan: '#00C7BE',
  accentViolet: '#AF52DE',
  accentAmber: '#FF9500',
  accentPink: '#FF2D55',
  positiveSoft: '#EAFBF0',
  dangerSoft: '#FFECEB',
  warningSoft: '#FFF5E5',
};

export const APPLE_TV_COLORS = STUDIO_COLORS;
export const BOOSTLAB_COLORS = STUDIO_COLORS;

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salary',
  'Freelance',
  'Other Income',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Entertainment',
  'EMI',
  'Other',
];

export const CATEGORY_META: Record<CategoryName, CategoryMeta> = {
  Salary: {
    name: 'Salary',
    type: 'income',
    icon: '💼',
    color: '#1F9E32',
    bgGlow: 'rgba(40, 205, 65, 0.14)',
    shortCode: 'SAL',
  },
  Freelance: {
    name: 'Freelance',
    type: 'income',
    icon: '⚡',
    color: '#0071E3',
    bgGlow: 'rgba(0, 113, 227, 0.14)',
    shortCode: 'FRL',
  },
  'Other Income': {
    name: 'Other Income',
    type: 'income',
    icon: '💎',
    color: '#AF52DE',
    bgGlow: 'rgba(175, 82, 222, 0.14)',
    shortCode: 'INC',
  },
  Rent: {
    name: 'Rent',
    type: 'expense',
    icon: '🏠',
    color: '#0071E3',
    bgGlow: 'rgba(0, 113, 227, 0.14)',
    shortCode: 'HOME',
  },
  Food: {
    name: 'Food',
    type: 'expense',
    icon: '🍽️',
    color: '#FF9500',
    bgGlow: 'rgba(255, 149, 0, 0.14)',
    shortCode: 'FOOD',
  },
  Travel: {
    name: 'Travel',
    type: 'expense',
    icon: '✈️',
    color: '#00C7BE',
    bgGlow: 'rgba(0, 199, 190, 0.14)',
    shortCode: 'TRVL',
  },
  Shopping: {
    name: 'Shopping',
    type: 'expense',
    icon: '🛍️',
    color: '#FF2D55',
    bgGlow: 'rgba(255, 45, 85, 0.14)',
    shortCode: 'SHOP',
  },
  Bills: {
    name: 'Bills',
    type: 'expense',
    icon: '⚡',
    color: '#5856D6',
    bgGlow: 'rgba(88, 86, 214, 0.14)',
    shortCode: 'UTIL',
  },
  Entertainment: {
    name: 'Entertainment',
    type: 'expense',
    icon: '🎬',
    color: '#AF52DE',
    bgGlow: 'rgba(175, 82, 222, 0.14)',
    shortCode: 'FUN',
  },
  EMI: {
    name: 'EMI',
    type: 'expense',
    icon: '🏦',
    color: '#FF3B30',
    bgGlow: 'rgba(255, 59, 48, 0.14)',
    shortCode: 'EMI',
  },
  Other: {
    name: 'Other',
    type: 'expense',
    icon: '📦',
    color: '#8E8E93',
    bgGlow: 'rgba(142, 142, 147, 0.14)',
    shortCode: 'MISC',
  },
};

export const CURRENCY_OPTIONS = [
  { symbol: '₹', code: 'INR', label: 'INR (₹)' },
  { symbol: '$', code: 'USD', label: 'USD ($)' },
  { symbol: '€', code: 'EUR', label: 'EUR (€)' },
  { symbol: '£', code: 'GBP', label: 'GBP (£)' },
];
