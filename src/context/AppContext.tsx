import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '@/types';
import type { SupportedLocale } from '@/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [role, setRole] = useState<UserRole>('Analyst');
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('app-theme') as ThemeMode) || 'system';
  });
  const [timezone, setTimezoneState] = useState(() => {
    return localStorage.getItem('app-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  const resolvedDark = themeMode === 'system' ? getSystemDark() : themeMode === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedDark);
  }, [resolvedDark]);

  // Listen for system theme changes
  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => document.documentElement.classList.toggle('dark', mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('app-theme', mode);
  };

  const setLocale = (code: SupportedLocale) => {
    i18n.changeLanguage(code);
    localStorage.setItem('app-locale', code);
  };

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem('app-timezone', tz);
  };

  const locale = (i18n.language || 'en') as SupportedLocale;

  return (
    <AppContext.Provider value={{
      role, setRole,
      isDark: resolvedDark,
      themeMode,
      setThemeMode,
      toggleTheme: () => setThemeMode(resolvedDark ? 'light' : 'dark'),
      locale,
      setLocale,
      timezone,
      setTimezone,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
}
