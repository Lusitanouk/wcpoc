import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Sun, Moon, Monitor, Globe, Clock, UserCog } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, type ThemeMode } from '@/context/AppContext';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n';
import type { UserRole } from '@/types';

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const themeIcons: Record<ThemeMode, React.ReactNode> = {
  light: <Sun className="h-3.5 w-3.5" />,
  dark: <Moon className="h-3.5 w-3.5" />,
  system: <Monitor className="h-3.5 w-3.5" />,
};

export function SettingsDialog() {
  const { t } = useTranslation();
  const { themeMode, setThemeMode, locale, setLocale, timezone, setTimezone, role, setRole } = useAppContext();
  const [open, setOpen] = useState(false);

  const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const roleDescriptions: Record<UserRole, string> = {
    Analyst: 'Resolve and review matches (Maker)',
    Supervisor: 'Oversee analysts and manage cases',
    Checker: 'Review and approve/reject analyst resolutions',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> {t('settings.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Role (Prototype only) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <UserCog className="h-3.5 w-3.5 text-muted-foreground" /> Role (Prototype)
            </Label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(['Analyst', 'Supervisor', 'Checker'] as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                    role === r
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{roleDescriptions[role]}</p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-muted-foreground" /> {t('settings.theme')}
            </Label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    themeMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {themeIcons[mode]}
                  {t(`settings.theme${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Locale */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> {t('settings.locale')}
            </Label>
            <Select value={locale} onValueChange={v => setLocale(v as SupportedLocale)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map(l => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="flex items-center gap-2">
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {t('settings.timezone')}
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={systemTz}>
                  {t('settings.timezoneSystem')} ({systemTz})
                </SelectItem>
                {COMMON_TIMEZONES.filter(tz => tz !== systemTz).map(tz => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {new Date().toLocaleString(locale, { timeZone: timezone, timeZoneName: 'long' })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
