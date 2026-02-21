import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserRole } from '@/types';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('Analyst');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <AppContext.Provider value={{ role, setRole, isDark, toggleTheme: () => setIsDark(d => !d) }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be inside AppProvider');
  return ctx;
}
