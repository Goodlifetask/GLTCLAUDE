import type { Theme } from '../types/user';

export interface ThemeTokens {
  name: string;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
    backgroundDark: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

export const THEMES: Record<Theme, ThemeTokens> = {
  warm_corporate: {
    name: 'warm_corporate',
    displayName: 'Warm Corporate',
    description: 'Amber & navy — executive warmth',
    colors: {
      primary: '#F0A202',
      primaryDark: '#F18805',
      accent: '#D95D39',
      background: '#FFFFFF',
      backgroundDark: '#202C59',
      surface: '#FFF8EC',
      text: '#1A1A2E',
      textSecondary: '#581F18',
      border: '#E8D5B0',
      success: '#2ECC71',
      warning: '#F0A202',
      error: '#D95D39',
    },
  },
  blue_spectrum: {
    name: 'blue_spectrum',
    displayName: 'Blue Spectrum',
    description: 'Sky to indigo — tech confidence',
    colors: {
      primary: '#3F8EFC',
      primaryDark: '#2667FF',
      accent: '#3B28CC',
      background: '#FFFFFF',
      backgroundDark: '#1A1A2E',
      surface: '#EFF6FF',
      text: '#0F172A',
      textSecondary: '#475569',
      border: '#BFDBFE',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
  india: {
    name: 'india',
    displayName: 'India',
    description: 'Saffron, blue & green — bold national pride',
    colors: {
      primary: '#FF8000',
      primaryDark: '#E67300',
      accent: '#008000',
      background: '#FFFFFF',
      backgroundDark: '#1A1A1A',
      surface: '#FFF5E6',
      text: '#1A1A1A',
      textSecondary: '#444444',
      border: '#FFD9B3',
      success: '#008000',
      warning: '#FF8000',
      error: '#CC0000',
    },
  },
  usa: {
    name: 'usa',
    displayName: 'USA',
    description: 'Crimson & navy — patriotic authority',
    colors: {
      primary: '#0157AE',
      primaryDark: '#000654',
      accent: '#D42729',
      background: '#FFFFFF',
      backgroundDark: '#000654',
      surface: '#F0F4FF',
      text: '#000654',
      textSecondary: '#4A4A6A',
      border: '#C5D3E8',
      success: '#2ECC71',
      warning: '#F59E0B',
      error: '#D42729',
    },
  },
};
