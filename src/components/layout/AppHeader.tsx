import { Search, Shield, Sun, Moon, Bot, User } from 'lucide-react';
import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import type { UserRole } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsDialog } from '@/components/SettingsDialog';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { getCaseById } from '@/data/mock-data';
import { allMatches } from '@/data/mock-data';

const roleConfig: Record<string, { label: string; color: string; icon: typeof User }> = {
  Analyst:    { label: 'Analyst',    color: 'bg-primary/10 text-primary border-primary/20',                      icon: User },
  Supervisor: { label: 'Supervisor', color: 'bg-status-possible/10 text-status-possible border-status-possible/20', icon: User },
  Checker:    { label: 'Checker',    color: 'bg-status-positive/10 text-status-positive border-status-positive/20', icon: Bot  },
};

export function AppHeader() {
  const { t } = useTranslation();
  const { isDark, toggleTheme, role } = useAppContext();
  const location = useLocation();
  const [search, setSearch] = useState('');

  const rc = roleConfig[role] ?? roleConfig['Analyst'];
  const RoleIcon = rc.icon;

  // Pending checker count badge
  const pendingCount = role === 'Checker'
    ? allMatches.filter(m => m.pendingCheckerReview && !m.checkerReview).length
    : 0;

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
        <Link to="/home" className="text-muted-foreground hover:text-foreground transition-colors">{t('nav.home')}</Link>
        {breadcrumbs.map((b, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={b.path} className="flex items-center gap-1.5 min-w-0">
              <span className="text-muted-foreground">/</span>
              {isLast ? (
                <span className="font-medium text-foreground truncate max-w-[200px]">{b.label}</span>
              ) : (
                <Link to={b.path} className="font-medium text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]">{b.label}</Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2">
        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('header.searchPlaceholder')}
            className="pl-9 w-56 h-8 text-sm bg-background"
          />
        </div>

        {/* Role badge — click to cycle roles */}
        <button
          onClick={() => {
            const roles: UserRole[] = ['Analyst', 'Supervisor', 'Checker'];
            const next = roles[(roles.indexOf(role) + 1) % roles.length];
            setRole(next);
          }}
          title="Click to switch role"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer ${rc.color}`}
        >
          <RoleIcon className="h-3 w-3 shrink-0" />
          <span>{rc.label}</span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-status-positive text-status-positive-foreground text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Notifications */}
        <NotificationsDrawer />

        {/* Settings */}
        <SettingsDialog />

        {/* Theme Toggle */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Brand */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">AML</span>
        </div>
      </div>
    </header>
  );
}
