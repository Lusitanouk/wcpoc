import { useState, type ReactNode, type FormEvent } from 'react';
import { Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const COOKIE = 'wc_access';
const PASS = 'Sibos2026!';

function hasAccess() {
  return document.cookie.split('; ').some(c => c === `${COOKIE}=granted`);
}

export function PassphraseGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(hasAccess);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (ok) return <>{children}</>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value === PASS) {
      document.cookie = `${COOKIE}=granted; max-age=${60 * 60 * 24 * 365 * 10}; path=/; SameSite=Lax`;
      setOk(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Restricted preview</h1>
        </div>
        <p className="text-sm text-muted-foreground">Enter the passphrase to continue.</p>
        <Input
          type="password"
          autoFocus
          value={value}
          onChange={e => { setValue(e.target.value); setError(false); }}
          placeholder="Passphrase"
        />
        {error && <p className="text-xs text-destructive">Incorrect passphrase.</p>}
        <Button type="submit" className="w-full">Enter</Button>
      </form>
    </div>
  );
}
