/**
 * Theme System
 * Centralized theme configuration with light/dark mode support
 */

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryLight: string;
  
  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgSurface: string;
  bgElevated: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverted: string;
  
  // Borders
  border: string;
  borderLight: string;
  borderFocus: string;
  
  // Domain colors (SAF)
  fluid: string;
  thermal: string;
  mechanical: string;
  control: string;
  electrical: string;
  
  // Flow types (SAF)
  energy: string;
  material: string;
  information: string;
}

export interface ThemeConfig extends ThemeColors {
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    glow: string;
  };
  
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}

// Light theme
export const lightTheme: ThemeConfig = {
  // Primary colors
  primary: '#06b6d4',
  primaryHover: '#0891b2',
  primaryLight: '#cffafe',
  
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  bgSurface: '#ffffff',
  bgElevated: '#ffffff',
  
  // Text colors
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textInverted: '#ffffff',
  
  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderFocus: '#06b6d4',
  
  // Domain colors (SAF)
  fluid: '#3b82f6',
  thermal: '#f97316',
  mechanical: '#a855f7',
  control: '#22c55e',
  electrical: '#eab308',
  
  // Flow types (SAF)
  energy: '#ef4444',
  material: '#06b6d4',
  information: '#3b82f6',
  
  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
  },
  
  // Border radius
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    full: '9999px',
  },
  
  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'Share Tech Mono', monospace",
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem',  // 24px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(6, 182, 212, 0.3)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
};

// Dark theme (default)
export const darkTheme: ThemeConfig = {
  // Primary colors
  primary: '#06b6d4',
  primaryHover: '#22d3ee',
  primaryLight: 'rgba(6, 182, 212, 0.2)',
  
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Backgrounds
  bgPrimary: '#0c1a3e',
  bgSecondary: '#0f294e',
  bgTertiary: '#1a375c',
  bgSurface: '#1e3a5f',
  bgElevated: '#254673',
  
  // Text colors
  textPrimary: '#e0f2fe',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textInverted: '#0f172a',
  
  // Borders
  border: '#334155',
  borderLight: '#475569',
  borderFocus: '#06b6d4',
  
  // Domain colors (SAF)
  fluid: '#3b82f6',
  thermal: '#f97316',
  mechanical: '#a855f7',
  control: '#22c55e',
  electrical: '#eab308',
  
  // Flow types (SAF)
  energy: '#ef4444',
  material: '#06b6d4',
  information: '#3b82f6',
  
  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  
  // Border radius
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  
  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'Share Tech Mono', monospace",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(6, 182, 212, 0.5)',
  },
  
  // Transitions
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
};

// Theme registry
export const themes: Record<Theme, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
};

// Apply theme to document (for CSS variable access)
export function applyTheme(theme: Theme): void {
  const config = themes[theme];
  const root = document.documentElement;
  
  // Set data attribute
  root.setAttribute('data-theme', theme);
  
  // Set CSS variables
  root.style.setProperty('--color-primary', config.primary);
  root.style.setProperty('--color-primary-hover', config.primaryHover);
  root.style.setProperty('--color-primary-light', config.primaryLight);
  
  root.style.setProperty('--color-success', config.success);
  root.style.setProperty('--color-warning', config.warning);
  root.style.setProperty('--color-error', config.error);
  root.style.setProperty('--color-info', config.info);
  
  root.style.setProperty('--color-bg-primary', config.bgPrimary);
  root.style.setProperty('--color-bg-secondary', config.bgSecondary);
  root.style.setProperty('--color-bg-tertiary', config.bgTertiary);
  root.style.setProperty('--color-bg-surface', config.bgSurface);
  root.style.setProperty('--color-bg-elevated', config.bgElevated);
  
  root.style.setProperty('--color-text-primary', config.textPrimary);
  root.style.setProperty('--color-text-secondary', config.textSecondary);
  root.style.setProperty('--color-text-tertiary', config.textTertiary);
  root.style.setProperty('--color-text-inverted', config.textInverted);
  
  root.style.setProperty('--color-border', config.border);
  root.style.setProperty('--color-border-light', config.borderLight);
  root.style.setProperty('--color-border-focus', config.borderFocus);
  
  root.style.setProperty('--color-fluid', config.fluid);
  root.style.setProperty('--color-thermal', config.thermal);
  root.style.setProperty('--color-mechanical', config.mechanical);
  root.style.setProperty('--color-control', config.control);
  root.style.setProperty('--color-electrical', config.electrical);
  
  root.style.setProperty('--shadow-glow', config.shadows.glow);
}
