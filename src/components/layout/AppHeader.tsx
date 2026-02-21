import { Search, Shield, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext'; // isDark, toggleTheme still used
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { getCaseById } from '@/data/mock-data';

export function AppHeader() {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useAppContext();
  const location = useLocation();
  const [search, setSearch] = useState('');

  const breadcrumbMap: Record<string, string> = {
    '/screen': t('header.newScreening'),
    '/cases': t('header.caseManager'),
    '/alerts': t('nav.alerts'),
    '/reports': t('nav.reports'),
    '/admin': t('header.administration'),
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((seg, i) => {
    const path = '/' + pathSegments.slice(0, i + 1).join('/');
    // Resolve case ID to case name for /cases/:id
    let label = breadcrumbMap[path];
    if (!label) {
      if (pathSegments[0] === 'cases' && i === 1) {
        const caseData = getCaseById(seg);
        label = caseData?.name || seg;
      } else {
        label = seg;
      }
    }
    return { label, path };
  });

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 sticky top-0 z-30">

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-muted-foreground">{t('nav.home')}</span>
        {breadcrumbs.map((b) => (
          <span key={b.path} className="flex items-center gap-1.5 min-w-0">
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground truncate max-w-[200px]">{b.label}</span>
          </span>
        ))}
      </nav>

      {/* Global Search */}
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('header.searchPlaceholder')}
            className="pl-9 w-64 h-8 text-sm bg-background"
          />
        </div>


        {/* Settings */}
        <SettingsDialog />

        {/* Theme Toggle */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Brand */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">WC1</span>
        </div>
      </div>
    </header>
  );
}
