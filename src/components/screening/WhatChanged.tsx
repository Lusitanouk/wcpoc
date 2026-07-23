import { useState } from 'react';
import { ArrowRight, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { ChangeLogEntry, ChangeMateriality } from '@/types';

type Variant = 'summary' | 'inline' | 'full';

const materialityRank: Record<ChangeMateriality, number> = { high: 0, medium: 1, low: 2 };

function sortEntries(entries: ChangeLogEntry[]): ChangeLogEntry[] {
  return [...entries].sort((a, b) => {
    const ra = materialityRank[a.materiality ?? 'medium'];
    const rb = materialityRank[b.materiality ?? 'medium'];
    if (ra !== rb) return ra - rb;
    return (b.changedAt || '').localeCompare(a.changedAt || '');
  });
}

function materialityBadge(m: ChangeMateriality | undefined) {
  const key = m ?? 'medium';
  if (key === 'high') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-status-unresolved/15 text-status-unresolved uppercase tracking-wide"><AlertTriangle className="h-2.5 w-2.5" />High</span>;
  if (key === 'medium') return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-status-possible/15 text-status-possible uppercase tracking-wide">Medium</span>;
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground uppercase tracking-wide">Low</span>;
}

function primaryText(cl: ChangeLogEntry) {
  return cl.summary && cl.summary.trim().length > 0 ? cl.summary : `${cl.field}: ${cl.from} → ${cl.to}`;
}

export interface WhatChangedProps {
  changeLog: ChangeLogEntry[];
  reviewRequiredReasons?: string[];
  variant: Variant;
  /** Max entries to show in `summary`/`inline` variants before truncating. */
  maxItems?: number;
}

export function WhatChanged({ changeLog, reviewRequiredReasons = [], variant, maxItems }: WhatChangedProps) {
  const sorted = sortEntries(changeLog);
  const [showMinor, setShowMinor] = useState(false);

  if (sorted.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  // ── Compact single-line variant for table cells ──
  if (variant === 'summary') {
    const top = sorted[0];
    const rest = sorted.length - 1;
    return (
      <div className="flex items-start gap-1.5 min-w-0">
        <div className="shrink-0 mt-0.5">{materialityBadge(top.materiality)}</div>
        <div className="min-w-0">
          <div className="text-xs text-foreground truncate">{primaryText(top)}</div>
          {rest > 0 && <div className="text-[10px] text-muted-foreground">+{rest} more change{rest === 1 ? '' : 's'}</div>}
        </div>
      </div>
    );
  }

  // ── Inline variant for expanded table rows ──
  if (variant === 'inline') {
    const items = maxItems ? sorted.slice(0, maxItems) : sorted;
    const remaining = sorted.length - items.length;
    return (
      <div className="space-y-1">
        {items.map((cl, i) => {
          const isHigh = (cl.materiality ?? 'medium') === 'high';
          const isLow = (cl.materiality ?? 'medium') === 'low';
          return (
            <div key={i} className={`flex items-start gap-1.5 text-[11px] ${isLow ? 'text-muted-foreground' : ''}`}>
              <div className="shrink-0 mt-0.5">{materialityBadge(cl.materiality)}</div>
              <span className={`${isHigh ? 'font-medium text-foreground' : ''}`}>{primaryText(cl)}</span>
            </div>
          );
        })}
        {remaining > 0 && (
          <div className="text-[10px] text-muted-foreground">+{remaining} more change{remaining === 1 ? '' : 's'}</div>
        )}
      </div>
    );
  }

  // ── Full variant for drawer ──
  const major = sorted.filter(c => (c.materiality ?? 'medium') !== 'low');
  const minor = sorted.filter(c => (c.materiality ?? 'medium') === 'low');

  return (
    <div className="space-y-3">
      {reviewRequiredReasons.length > 0 && (
        <div className="rounded-md border border-status-possible/30 bg-status-possible/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-status-possible mb-1">Review required</p>
          <ul className="text-xs text-foreground space-y-0.5">
            {reviewRequiredReasons.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
      )}

      {major.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Materiality</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Change</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell w-24">Date</th>
              </tr>
            </thead>
            <tbody>
              {major.map((cl, i) => {
                const isHigh = (cl.materiality ?? 'medium') === 'high';
                return (
                  <tr key={i} className={`border-b last:border-b-0 align-top ${isHigh ? 'bg-status-unresolved/[0.04]' : ''}`}>
                    <td className="px-3 py-2.5">{materialityBadge(cl.materiality)}</td>
                    <td className="px-3 py-2.5">
                      <div className={`${isHigh ? 'font-semibold text-foreground' : 'text-foreground'} leading-snug`}>
                        {primaryText(cl)}
                      </div>
                      {cl.summary && (
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                          <span className="px-1 py-0 rounded bg-destructive/10 text-destructive line-through">{cl.from}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                          <span className="px-1 py-0 rounded bg-status-positive/10 text-status-positive">{cl.to}</span>
                          <span className="text-muted-foreground">· {cl.field}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground hidden sm:table-cell whitespace-nowrap">{cl.changedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {minor.length > 0 && (
        <div className="rounded-md border bg-muted/30">
          <button
            type="button"
            onClick={() => setShowMinor(s => !s)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMinor ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span>Show {minor.length} minor change{minor.length === 1 ? '' : 's'}</span>
          </button>
          {showMinor && (
            <ul className="px-3 pb-2 space-y-1">
              {minor.map((cl, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <div className="shrink-0 mt-0.5">{materialityBadge(cl.materiality)}</div>
                  <span>{primaryText(cl)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
