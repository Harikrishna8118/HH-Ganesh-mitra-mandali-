import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode =
  | 'light'
  | 'dark'
  | 'glass'
  | 'saffron'
  | 'midnight'
  | 'emerald'
  | 'vermilion'
  | 'system';

export interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  tagline: string;
  isDark: boolean;
  isGlass?: boolean;
  swatchBg: string;
  accentHex: string;
  themeColorHex: string;
}

export const AVAILABLE_THEMES: ThemeDefinition[] = [
  {
    id: 'light',
    name: 'Classic Mandir',
    tagline: 'Warm cream devotional canvas with crimson festival accents',
    isDark: false,
    swatchBg: 'linear-gradient(135deg, #FAF9F6 0%, #FEE2E2 100%)',
    accentHex: '#DC2626',
    themeColorHex: '#DC2626',
  },
  {
    id: 'dark',
    name: 'Classic Slate',
    tagline: 'Deep slate nocturnal contrast with golden diya illumination',
    isDark: true,
    swatchBg: 'linear-gradient(135deg, #0B0F19 0%, #1F293D 100%)',
    accentHex: '#F59E0B',
    themeColorHex: '#0B0F19',
  },
  {
    id: 'glass',
    name: 'Liquid Glass',
    tagline: 'Frosted acrylic glassmorphism with luminous sheen & ambient aura',
    isDark: true,
    isGlass: true,
    swatchBg: 'linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(245,158,11,0.2) 100%)',
    accentHex: '#38BDF8',
    themeColorHex: '#0F172A',
  },
  {
    id: 'saffron',
    name: 'Mandir Gold & Kesari',
    tagline: 'Traditional sacred saffron and radiant temple gold ambiance',
    isDark: false,
    swatchBg: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 50%, #FDE68A 100%)',
    accentHex: '#D97706',
    themeColorHex: '#D97706',
  },
  {
    id: 'midnight',
    name: 'Midnight Utsav',
    tagline: 'Cosmic obsidian night sky lit by warm festive deepam lanterns',
    isDark: true,
    swatchBg: 'linear-gradient(135deg, #060911 0%, #111827 50%, #311333 100%)',
    accentHex: '#FBBF24',
    themeColorHex: '#060911',
  },
  {
    id: 'emerald',
    name: 'Sacred Bilva Grove',
    tagline: 'Serene temple garden emerald and auspicious Tulasi green',
    isDark: false,
    swatchBg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #A7F3D0 100%)',
    accentHex: '#059669',
    themeColorHex: '#064E3B',
  },
  {
    id: 'vermilion',
    name: 'Royal Sindhoor',
    tagline: 'Deep ceremonial red and royal auspicious kumkum celebration',
    isDark: true,
    swatchBg: 'linear-gradient(135deg, #4C0519 0%, #881337 50%, #BE123C 100%)',
    accentHex: '#FB7185',
    themeColorHex: '#4C0519',
  },
];

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ThemeMode;
  isDark: boolean;
  isGlass: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'gmm_theme_preference_v2';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (
        saved === 'light' ||
        saved === 'dark' ||
        saved === 'glass' ||
        saved === 'saffron' ||
        saved === 'midnight' ||
        saved === 'emerald' ||
        saved === 'vermilion' ||
        saved === 'system'
      ) {
        return saved;
      }
      // Migrate from old storage key if available
      const oldSaved = localStorage.getItem('gmm_theme_preference');
      if (oldSaved === 'dark') return 'dark';
      if (oldSaved === 'light') return 'light';
    } catch {
      // Ignore localStorage errors
    }
    return 'light';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  // Determine effective theme
  const resolvedTheme: ThemeMode =
    theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  const currentThemeDef = AVAILABLE_THEMES.find((t) => t.id === resolvedTheme) || AVAILABLE_THEMES[0];
  const isDark = currentThemeDef.isDark;
  const isGlass = resolvedTheme === 'glass';

  // Apply theme attributes to document.documentElement
  useEffect(() => {
    const root = document.documentElement;

    // Remove legacy theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-glass', 'theme-saffron', 'theme-midnight', 'theme-emerald', 'theme-vermilion');

    // Set data-theme attribute
    root.setAttribute('data-theme', resolvedTheme);
    root.classList.add(`theme-${resolvedTheme}`);

    // Manage 'dark' class for Tailwind CSS dark: variants
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Manage 'glass-mode' class for glassmorphic styling
    if (isGlass) {
      root.classList.add('glass-mode');
    } else {
      root.classList.remove('glass-mode');
    }

    // Update meta theme-color for mobile address bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', currentThemeDef.themeColorHex);
    }
  }, [resolvedTheme, isDark, isGlass, currentThemeDef]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // In-memory state persists
    }
  };

  const toggleTheme = () => {
    // Quick toggle between primary light and primary dark or glass
    if (resolvedTheme === 'light' || resolvedTheme === 'saffron' || resolvedTheme === 'emerald') {
      setTheme('glass');
    } else {
      setTheme('light');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark,
        isGlass,
        setTheme,
        toggleTheme,
        availableThemes: AVAILABLE_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
