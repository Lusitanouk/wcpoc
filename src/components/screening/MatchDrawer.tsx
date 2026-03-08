import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight, ChevronLeft, Check, HelpCircle, XCircle, CircleOff,
  Clock, User, History, ChevronsUpDown, Maximize2, Minimize2,
  ExternalLink, FileText, Database, Download, ArrowDown, X, AlertTriangle,
  ArrowRight, ShieldCheck, ShieldAlert, Bot, ThumbsUp, ThumbsDown, Pencil,
  ChevronDown, ChevronUp, Zap, Eye,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { ResponsiveTabsTrigger } from '@/components/ui/responsive-tabs-trigger';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { priorityColor } from '@/lib/priority';
import type { Match, MatchStatus, RiskLevel, CaseScreeningData, ChangeLogEntry, CheckerDecision } from '@/types';
import { useTranslation } from 'react-i18next';
import { exportMatchPdf } from '@/lib/export';
import { useAppContext } from '@/context/AppContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fieldResultIcon(result: string) {
  switch (result) {
    case 'match':    return <Check     className="h-3.5 w-3.5 text-status-positive shrink-0" />;
    case 'partial':  return <HelpCircle className="h-3.5 w-3.5 text-status-possible shrink-0" />;
    case 'mismatch': return <XCircle   className="h-3.5 w-3.5 text-status-unresolved shrink-0" />;
    default:         return <CircleOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

function fieldResultLabel(result: string) {
  switch (result) {
    case 'match':    return <span className="text-[10px] font-semibold text-status-positive">Match</span>;
    case 'partial':  return <span className="text-[10px] font-semibold text-status-possible">Partial</span>;
    case 'mismatch': return <span className="text-[10px] font-semibold text-status-unresolved">Mismatch</span>;
    default:         return <span className="text-[10px] text-muted-foreground">N/A</span>;
  }
}

const STATUS_COLORS: Record<string, string> = {
  Positive:   'bg-status-positive/10 text-status-positive border-status-positive/30',
  Possible:   'bg-status-possible/10 text-status-possible border-status-possible/30',
  False:      'bg-muted text-muted-foreground border-border',
  Unknown:    'bg-primary/10 text-primary border-primary/30',
  Unresolved: 'bg-destructive/10 text-destructive border-destructive/30',
};

const RISK_COLORS: Record<string, string> = {
  High:   'bg-destructive/10 text-destructive border-destructive/30',
  Medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  Low:    'bg-primary/10 text-primary border-primary/30',
  None:   'bg-muted text-muted-foreground border-border',
};

// ─── Strength Meter ─────────────────────────────────────────────────────────

function StrengthMeter({ value }: { value: number }) {
  const label = value >= 85 ? 'Strong' : value >= 65 ? 'Moderate' : 'Weak';
  const color = value >= 85
    ? 'bg-status-unresolved'
    : value >= 65
    ? 'bg-status-possible'
    : 'bg-status-positive';

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[48px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums whitespace-nowrap">{value}%</span>
      <span className={`text-[10px] font-medium whitespace-nowrap ${
        value >= 85 ? 'text-status-unresolved' : value >= 65 ? 'text-status-possible' : 'text-status-positive'
      }`}>{label}</span>
    </div>
  );
}

// ─── Source Citation Bubble ──────────────────────────────────────────────────

function SourceCitation({ sources, indices }: { sources: { name: string; url: string }[]; indices: number[] }) {
  const cited = indices.filter(i => i < sources.length).map(i => sources[i]);
  if (cited.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-full bg-primary/10 text-primary text-[9px] font-semibold hover:bg-primary/20 transition-colors ml-1 align-middle cursor-pointer border border-primary/20">
          {indices.map(i => i + 1).join(',')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 z-[200] bg-popover border shadow-lg" side="top" align="start">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Sources</p>
        <ul className="space-y-1.5">
          {cited.map((s, j) => (
            <li key={j} className="flex items-start gap-2 text-xs">
              <span className="inline-flex items-center justify-center h-[16px] min-w-[16px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0 mt-0.5">{indices[j] + 1}</span>
              <div className="min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate block">{s.name}</a>
                <span className="text-[10px] text-muted-foreground truncate block">{s.url === '#' ? 'Official watchlist database' : s.url}</span>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// ─── Change Chip ─────────────────────────────────────────────────────────────

function ChangeChip({ change, index, onClick }: { change: ChangeLogEntry; index: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-possible/15 text-status-possible border border-status-possible/25 hover:bg-status-possible/25 transition-colors cursor-pointer"
    >
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-status-possible/25 text-[9px] font-bold shrink-0">{index + 1}</span>
      {change.field}
    </button>
  );
}

// ─── What Changed Section ────────────────────────────────────────────────────

function WhatChangedSection({ changeLog, reviewRequiredReasons }: { changeLog: ChangeLogEntry[]; reviewRequiredReasons: string[] }) {
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const scrollToRow = useCallback((index: number) => {
    const el = rowRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-status-possible', 'ring-inset');
      setTimeout(() => el.classList.remove('ring-2', 'ring-status-possible', 'ring-inset'), 1800);
    }
  }, []);

  return (
    <div className="space-y-2">
      {reviewRequiredReasons.length > 0 && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{reviewRequiredReasons.join(' · ')}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {changeLog.map((cl, i) => (
          <ChangeChip key={i} change={cl} index={i} onClick={() => scrollToRow(i)} />
        ))}
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-status-possible/8 border-b">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-5"><span className="sr-only">#</span></th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Previous</th>
              <th className="px-1 py-2 w-5"></th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Updated</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {changeLog.map((cl, i) => (
              <tr key={i} ref={el => { rowRefs.current[i] = el; }} className="border-b last:border-b-0 transition-all duration-300">
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-status-possible/20 text-status-possible text-[9px] font-bold">{i + 1}</span>
                </td>
                <td className="px-3 py-2.5 font-medium">{cl.field}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[11px] font-mono line-through">{cl.from}</span>
                </td>
                <td className="px-1 py-2.5 text-muted-foreground"><ArrowRight className="h-3 w-3" /></td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-status-positive/10 text-status-positive text-[11px] font-mono font-semibold">{cl.to}</span>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-muted-foreground hidden sm:table-cell whitespace-nowrap">{cl.changedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Maker Decision Card ─────────────────────────────────────────────────────

function MakerDecisionCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const md = match.makerDecision;
  if (!md) return null;
  const isAgentic = md.makerType === 'Agentic';

  return (
    <div className={`rounded-md border border-primary/20 bg-primary/5 overflow-hidden ${compact ? '' : 'mx-4 mt-3 mb-1'}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/15 bg-primary/8">
        {isAgentic ? <Bot className="h-3.5 w-3.5 text-primary shrink-0" /> : <User className="h-3.5 w-3.5 text-primary shrink-0" />}
        <span className="text-[11px] font-semibold text-primary">
          {isAgentic ? 'Agentic Resolution' : 'Analyst Resolution'} — Pending Checker Review
        </span>
        <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0">{isAgentic ? 'Bot' : 'Maker'}</Badge>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_COLORS[md.status] || ''}`}>{md.status}</span>
          <span className={`text-[11px] font-medium ${
            md.riskLevel === 'High' ? 'text-destructive' : md.riskLevel === 'Medium' ? 'text-amber-600' : 'text-muted-foreground'
          }`}>Risk: {md.riskLevel}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">{md.createdAt}</span>
        </div>
        <p className="text-[11px] text-foreground leading-relaxed">{md.reason}</p>
        {md.comment && (
          <p className="text-[11px] text-muted-foreground italic bg-background/50 rounded px-2 py-1 border border-border/40">"{md.comment}"</p>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {isAgentic ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
          <span className="font-medium">{md.author}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Checker Panel ────────────────────────────────────────────────────────────

function CheckerPanel({
  match,
  onSubmit,
  compact = false,
}: {
  match: Match;
  onSubmit: (decision: CheckerDecision, amendedStatus?: MatchStatus, amendedRisk?: RiskLevel, reason?: string, comment?: string) => void;
  compact?: boolean;
}) {
  const [decision, setDecision] = useState<CheckerDecision | null>(null);
  const [amendedStatus, setAmendedStatus] = useState<MatchStatus>('Possible');
  const [amendedRisk, setAmendedRisk] = useState<RiskLevel>('Low');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const cr = match.checkerReview;

  const decisionStyles: Record<CheckerDecision, string> = {
    Accepted: 'border-status-positive/50 bg-status-positive/15 text-status-positive',
    Amended:  'border-status-possible/50 bg-status-possible/15 text-status-possible',
    Rejected: 'border-destructive/50 bg-destructive/15 text-destructive',
  };

  // Read-only once decided
  if (cr) {
    return (
      <div className={compact ? '' : 'p-4 border-b'}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-status-positive shrink-0" />
          <h4 className="text-xs font-semibold">Checker Decision</h4>
          <Badge className={`ml-auto text-[9px] px-1.5 py-0 h-4 border ${decisionStyles[cr.decision]}`}>{cr.decision}</Badge>
        </div>
        <div className="p-3 rounded-md bg-muted/40 space-y-1.5 text-xs border">
          {cr.decision === 'Amended' && (
            <div className="flex items-center gap-2 text-status-possible font-medium">
              <Pencil className="h-3 w-3" />Amended to: {cr.amendedStatus} / {cr.amendedRiskLevel}
            </div>
          )}
          <p className="text-muted-foreground">{cr.reason}</p>
          {cr.comment && <p className="italic text-muted-foreground">"{cr.comment}"</p>}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
            <User className="h-3 w-3" /><span>{cr.author}</span>
            <Clock className="h-3 w-3 ml-1" /><span>{cr.createdAt}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="checker-panel" className={compact ? '' : 'p-4 border-b'}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-3.5 w-3.5 text-primary shrink-0" />
        <h4 className="text-xs font-semibold">Checker Decision</h4>
        <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">Action Required</Badge>
      </div>

      {/* One-click decision buttons */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {(['Accepted', 'Amended', 'Rejected'] as CheckerDecision[]).map(d => (
          <button
            key={d}
            onClick={() => setDecision(d === decision ? null : d)}
            className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-md text-xs font-medium transition-all border ${
              decision === d ? decisionStyles[d] : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {d === 'Accepted' && <ThumbsUp className="h-4 w-4" />}
            {d === 'Amended'  && <Pencil className="h-4 w-4" />}
            {d === 'Rejected' && <ThumbsDown className="h-4 w-4" />}
            {d}
          </button>
        ))}
      </div>

      {/* Amended fields inline */}
      {decision === 'Amended' && (
        <div className="mb-3 p-2.5 rounded-md border border-status-possible/25 bg-status-possible/5">
          <p className="text-[10px] font-medium text-status-possible mb-2">Amend resolution to:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Status</Label>
              <div className="flex flex-col gap-1">
                {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
                  <button key={s} onClick={() => setAmendedStatus(s)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border text-left ${
                      amendedStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Risk Level</Label>
              <div className="flex flex-col gap-1">
                {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                  <button key={r} onClick={() => setAmendedRisk(r)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border text-left ${
                      amendedRisk === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                    }`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {decision && (
        <div className="space-y-2 mb-3">
          <Textarea
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder={
              decision === 'Rejected' ? 'Reason for rejection (required)...' :
              decision === 'Amended'  ? 'Why were amendments made (required)...' :
              'Reason for acceptance (required)...'
            }
            className="text-xs resize-none"
          />
          {!showComment ? (
            <button onClick={() => setShowComment(true)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              + Add optional comment
            </button>
          ) : (
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder="Additional notes (optional)..."
              className="text-xs resize-none"
            />
          )}
        </div>
      )}

      <Button
        className="w-full"
        size="sm"
        disabled={!decision || !reason.trim()}
        onClick={() => onSubmit(decision!, decision === 'Amended' ? amendedStatus : undefined, decision === 'Amended' ? amendedRisk : undefined, reason, comment || undefined)}
      >
        {decision ? `Submit — ${decision}` : 'Select a decision above'}
      </Button>
    </div>
  );
}

// ─── Resolution Panel ─────────────────────────────────────────────────────────

function ResolutionPanel({
  status, setStatus,
  risk, setRisk,
  matchOutcome, setMatchOutcome,
  reason, setReason,
  comment, setComment,
  onSave,
}: {
  status: MatchStatus; setStatus: (s: MatchStatus) => void;
  risk: RiskLevel; setRisk: (r: RiskLevel) => void;
  matchOutcome: string; setMatchOutcome: (v: string) => void;
  reason: string; setReason: (v: string) => void;
  comment: string; setComment: (v: string) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const [showComment, setShowComment] = useState(!!comment);

  return (
    <div className="space-y-3">
      {/* Status + Risk in a single compact row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t('match.status')}</Label>
          <div className="flex flex-col gap-1">
            {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all border text-left flex items-center gap-1.5 ${
                  status === s ? `${STATUS_COLORS[s]} border-current` : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                }`}>
                {status === s && <Check className="h-3 w-3 shrink-0" />}
                {t(`match.${s.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t('match.riskLevel')}</Label>
          <div className="flex flex-col gap-1">
            {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
              <button key={r} onClick={() => setRisk(r)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all border text-left flex items-center gap-1.5 ${
                  risk === r ? `${RISK_COLORS[r]} border-current` : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                }`}>
                {risk === r && <Check className="h-3 w-3 shrink-0" />}
                {t(`match.${r.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Outcome */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Match Outcome</Label>
        <Select value={matchOutcome} onValueChange={setMatchOutcome}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select outcome..." /></SelectTrigger>
          <SelectContent className="bg-popover z-[200]">
            <SelectItem value="Full Match" className="text-xs">Full Match</SelectItem>
            <SelectItem value="Partial Match" className="text-xs">Partial Match</SelectItem>
            <SelectItem value="No Match" className="text-xs">No Match</SelectItem>
            <SelectItem value="Unknown" className="text-xs">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reason */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t('match.reason')}</Label>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={t('match.resolutionReason')} className="text-xs resize-none" />
      </div>

      {/* Optional comment — progressive disclosure */}
      {!showComment ? (
        <button onClick={() => setShowComment(true)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          + Add comment
        </button>
      ) : (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t('match.reviewComment')}</Label>
          <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder={t('match.optionalComment')} className="text-xs resize-none" />
        </div>
      )}

      <Button onClick={onSave} className="w-full" size="sm">
        <Check className="h-3.5 w-3.5" /> Save Resolution
      </Button>
    </div>
  );
}

// ─── Why It Matched — inline, no tab ─────────────────────────────────────────

function WhyMatchedSection({ match }: { match: Match }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="w-8 px-2 py-2"></th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Screened</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Matched Record</th>
            <th className="w-16 px-2 py-2 text-right font-medium text-muted-foreground">Result</th>
          </tr>
        </thead>
        <tbody>
          {match.whyMatched.map((wf, i) => (
            <tr key={i} className={`border-b last:border-b-0 ${
              wf.result === 'match' ? 'bg-status-positive/5'
              : wf.result === 'mismatch' ? 'bg-status-unresolved/5'
              : ''
            }`}>
              <td className="px-2 py-2 text-center">{fieldResultIcon(wf.result)}</td>
              <td className="px-3 py-2 font-medium whitespace-nowrap">{wf.field}</td>
              <td className="px-3 py-2 text-muted-foreground">{wf.inputValue || '—'}</td>
              <td className="px-3 py-2 font-medium">{wf.matchedValue || '—'}</td>
              <td className="px-2 py-2 text-right">{fieldResultLabel(wf.result)}</td>
            </tr>
          ))}
          {match.aliases.length > 0 && (
            <tr className="border-b last:border-b-0 bg-muted/20">
              <td className="px-2 py-2 text-center"><User className="h-3.5 w-3.5 text-muted-foreground mx-auto" /></td>
              <td className="px-3 py-2 font-medium align-top">Aliases</td>
              <td className="px-3 py-2 text-muted-foreground" colSpan={3}>
                <div className="flex flex-wrap gap-1">
                  {match.aliases.map((alias, ai) => (
                    <Badge key={ai} variant="secondary" className="text-[10px]">{alias}</Badge>
                  ))}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Record Detail Tabs ───────────────────────────────────────────────────────

function RecordDetailTabs({ match }: { match: Match }) {
  const { t } = useTranslation();
  const rd = match.recordData;
  const [activeTab, setActiveTab] = useState('key-data');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full justify-start h-auto flex-wrap gap-1 p-1 mb-3">
        <ResponsiveTabsTrigger value="key-data"     icon={<FileText className="h-3 w-3" />}      label={t('match.keyData')} />
        <ResponsiveTabsTrigger value="further"      icon={<HelpCircle className="h-3 w-3" />}    label={t('match.furtherInfo')} />
        <ResponsiveTabsTrigger value="aliases"      icon={<User className="h-3 w-3" />}          label={t('match.aliases')} />
        <ResponsiveTabsTrigger value="keywords"     icon={<FileText className="h-3 w-3" />}      label={t('match.keywords')} />
        {rd.pepRoleDetails && <ResponsiveTabsTrigger value="pep" icon={<User className="h-3 w-3" />} label={t('match.pepDetails')} />}
        <ResponsiveTabsTrigger value="connections"  icon={<ExternalLink className="h-3 w-3" />}  label={t('match.connections')} />
        <ResponsiveTabsTrigger value="sources"      icon={<Database className="h-3 w-3" />}      label={t('match.sources')} />
      </TabsList>

      <TabsContent value="key-data" className="space-y-1.5">
        {Object.entries(rd.keyData).map(([k, v], idx) => (
          <div key={k} className="flex items-center justify-between text-xs py-1.5 border-b border-dashed last:border-0">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium flex items-center">
              {v}<SourceCitation sources={rd.sources} indices={[idx % rd.sources.length]} />
            </span>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="further">
        <p className="text-sm leading-relaxed">
          {rd.furtherInfo}
          <SourceCitation sources={rd.sources} indices={rd.sources.map((_, i) => i)} />
        </p>
      </TabsContent>

      <TabsContent value="aliases">
        <div className="flex flex-wrap gap-2">
          {rd.aliases.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}
          <SourceCitation sources={rd.sources} indices={[0]} />
        </div>
      </TabsContent>

      <TabsContent value="keywords">
        <div className="flex flex-wrap gap-2">
          {rd.keywords.map((k, i) => <Badge key={i} variant="outline" className="text-xs">{k}</Badge>)}
          <SourceCitation sources={rd.sources} indices={[0, Math.min(1, rd.sources.length - 1)]} />
        </div>
      </TabsContent>

      {rd.pepRoleDetails && (
        <TabsContent value="pep">
          <p className="text-sm">{rd.pepRoleDetails}<SourceCitation sources={rd.sources} indices={[0]} /></p>
        </TabsContent>
      )}

      <TabsContent value="connections">
        {rd.connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('match.noConnections')}</p>
        ) : (
          <ul className="space-y-1">
            {rd.connections.map((c, i) => (
              <li key={i} className="text-sm flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />{c}
                <SourceCitation sources={rd.sources} indices={[i % rd.sources.length]} />
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="sources">
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground mb-2">Data provenance — original watchlist sources where this record was found.</p>
          <ul className="space-y-2">
            {rd.sources.map((s, i) => (
              <li key={i} className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50 border border-border/50">
                <Database className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={s.url} className="text-sm font-medium text-primary hover:underline truncate block">{s.name}</a>
                  <span className="text-[10px] text-muted-foreground">{s.url === '#' ? 'Official watchlist database' : s.url}</span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Resolution History ───────────────────────────────────────────────────────

function ResolutionHistory({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const current = match.resolutionHistory[0] ?? null;
  const older = match.resolutionHistory.slice(1);

  if (!current) return null;

  return (
    <div className="space-y-2">
      {/* Current resolution chip */}
      <div className={`flex items-center gap-2 p-2.5 rounded-md border text-xs ${STATUS_COLORS[current.status] || 'bg-muted border-border'}`}>
        <span className="font-semibold">{current.status}</span>
        <span className="opacity-70">·</span>
        <span>Risk: {current.riskLevel}</span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] opacity-70">
          <User className="h-3 w-3" />{current.author}
          <Clock className="h-3 w-3 ml-1" />{current.createdAt}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{current.reason}</p>
      {current.comment && (
        <p className="text-[11px] italic text-muted-foreground bg-muted/30 rounded px-2 py-1 border border-border/40">"{current.comment}"</p>
      )}

      {older.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1 mt-1">
              <History className="h-3 w-3" />
              <span>{older.length} {t('match.previousDecisions')}</span>
              <ChevronsUpDown className="h-3 w-3 ml-auto" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="max-h-44 mt-1">
              <div className="space-y-0 pl-4 border-l-2 border-border">
                {older.map((entry, idx) => (
                  <div key={entry.id} className="pb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.status}</Badge>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.riskLevel}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{entry.createdAt}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>
                    {entry.comment && <p className="mt-0.5 italic text-[11px] text-muted-foreground">"{entry.comment}"</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{entry.author}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MatchDrawerProps {
  match: Match | null;
  open: boolean;
  onClose: () => void;
  caseName: string;
  onUpdate: (m: Match) => void;
  screeningData?: CaseScreeningData;
  currentIndex?: number;
  totalMatches?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  defaultFullscreen?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MatchDrawer({
  match, open, onClose, caseName, onUpdate,
  screeningData, currentIndex, totalMatches, onNavigate, defaultFullscreen,
}: MatchDrawerProps) {
  const { t } = useTranslation();
  const { role } = useAppContext();
  const isChecker = role === 'Checker';

  const [status, setStatus]           = useState<MatchStatus>(match?.status || 'Unresolved');
  const [risk, setRisk]               = useState<RiskLevel>(match?.riskLevel || 'None');
  const [reason, setReason]           = useState(match?.reason || '');
  const [matchOutcome, setMatchOutcome] = useState('');
  const [comment, setComment]         = useState('');
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen ?? false);
  const whatChangedRef = useRef<HTMLDivElement>(null);

  // ─── Persisted section open/closed state ─────────────────────
  const SECTIONS_KEY = 'match-drawer-sections';
  const defaultSections = { whatChanged: true, whyMatched: true, screeningProfile: true, disposition: true };
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    try { return { ...defaultSections, ...JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') }; }
    catch { return defaultSections; }
  });
  const toggleSection = (key: string) => {
    setSectionOpen(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (match && open) {
      setStatus(match.status);
      setRisk(match.riskLevel);
      setReason(match.reason);
      setComment('');
      setIsFullscreen(defaultFullscreen ?? false);
    }
  }, [match?.id, defaultFullscreen, open]);

  if (!match) return null;

  const rd = match.recordData;
  const hasNavigation = onNavigate && totalMatches !== undefined && currentIndex !== undefined && totalMatches > 1;
  const hasPrev = hasNavigation && currentIndex > 0;
  const hasNext = hasNavigation && currentIndex < totalMatches - 1;
  const hasScreeningData = screeningData && (screeningData.dob || screeningData.gender || screeningData.nationality || screeningData.country || screeningData.idType || screeningData.customFields);

  const jumpToChanges = () => {
    const el = whatChangedRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-2', 'ring-status-possible', 'ring-inset', 'rounded-md');
    setTimeout(() => el.classList.remove('ring-2', 'ring-status-possible', 'ring-inset', 'rounded-md'), 1800);
  };

  const handleSave = () => {
    onUpdate({ ...match, status, riskLevel: risk, reason });
    onClose();
  };

  const handleCheckerSubmit = (
    decision: CheckerDecision,
    amendedStatus?: MatchStatus,
    amendedRisk?: RiskLevel,
    checkerReason?: string,
    checkerComment?: string,
  ) => {
    const now = new Date().toISOString().split('T')[0];
    onUpdate({
      ...match,
      pendingCheckerReview: false,
      checkerReview: {
        author: 'Current User (Checker)',
        decision,
        amendedStatus,
        amendedRiskLevel: amendedRisk,
        reason: checkerReason || '',
        comment: checkerComment,
        createdAt: now,
      },
      ...(decision === 'Amended' && amendedStatus ? { status: amendedStatus, riskLevel: amendedRisk ?? match.riskLevel } : {}),
      ...(decision === 'Rejected' ? { status: 'Unresolved' as MatchStatus, pendingCheckerReview: false } : {}),
    });
    onClose();
  };

  // ─── Section: sticky header ──────────────────────────────────

  const stickyHeader = (
    <div className="sticky top-0 z-10 bg-background border-b">
      {/* Top row: name + controls */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold truncate leading-tight">{match.matchedName}</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{caseName}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exportMatchPdf(match, caseName)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {hasNavigation && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onNavigate!('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground font-mono px-0.5">{currentIndex + 1}/{totalMatches}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onNavigate!('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="w-px h-4 bg-border mx-1" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { if (isFullscreen) setIsFullscreen(false); onClose(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Meta row: dataset / priority / strength / status pill */}
      <div className="px-4 pb-2.5 flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] h-5">{match.dataset}</Badge>
        <Badge variant="outline" className={`text-[10px] h-5 ${priorityColor(match.priorityLevel)}`}>
          {match.priorityLevel} priority
        </Badge>
        {match.status !== 'Unresolved' && (
          <Badge variant="outline" className={`text-[10px] h-5 border ${STATUS_COLORS[match.status]}`}>
            {match.status}
          </Badge>
        )}
        {match.riskLevel !== 'None' && (
          <Badge variant="outline" className={`text-[10px] h-5 border ${RISK_COLORS[match.riskLevel]}`}>
            {match.riskLevel} risk
          </Badge>
        )}
        {match.updated && match.changeLog.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={jumpToChanges}
                  className="inline-flex items-center gap-1 text-[10px] h-5 px-2 rounded-full bg-status-possible/15 text-status-possible border-0 hover:bg-status-possible/25 transition-colors font-semibold"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Updated · {match.changeLog.length} change{match.changeLog.length !== 1 ? 's' : ''}
                </button>
              </TooltipTrigger>
              <TooltipContent>Jump to What Changed</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : match.updated ? (
          <Badge className="text-[10px] h-5 bg-status-possible/15 text-status-possible border-0">Updated</Badge>
        ) : null}
        {/* Sources button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-5 text-[10px] gap-1 ml-auto px-2 py-0">
                <Database className="h-3 w-3" />{rd.sources.length} sources
              </Button>
            </TooltipTrigger>
            <TooltipContent>Data provenance</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Strength meter bar */}
      <div className="px-4 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0 w-16">Strength</span>
          <StrengthMeter value={match.strength} />
        </div>
        {match.matchStrengthExplanation && (
          <p className="text-[10px] text-muted-foreground mt-1 pl-[72px] italic">{match.matchStrengthExplanation}</p>
        )}
      </div>

    </div>
  );

  // ─── Section: Why it matched ─────────────────────────────────

  const whyMatchedSection = (
    <div className="p-4 border-b">
      <Collapsible open={sectionOpen.whyMatched} onOpenChange={() => toggleSection('whyMatched')}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold w-full group mb-0">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>{t('match.whyMatched')}</span>
            <ChevronsUpDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2.5">
            <WhyMatchedSection match={match} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Section: What changed ───────────────────────────────────

  const whatChangedSection = match.reviewRequired && match.changeLog.length > 0 ? (
    <div className="p-4 border-b" ref={whatChangedRef}>
      <Collapsible open={sectionOpen.whatChanged} onOpenChange={() => toggleSection('whatChanged')}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold w-full group mb-0">
            <AlertTriangle className="h-3.5 w-3.5 text-status-possible" />
            <span className="text-status-possible">What Changed</span>
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-status-possible/15 text-status-possible border-0">
              {match.changeLog.length} change{match.changeLog.length !== 1 ? 's' : ''}
            </Badge>
            <ChevronsUpDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2.5">
            <WhatChangedSection changeLog={match.changeLog} reviewRequiredReasons={match.reviewRequiredReasons} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  ) : null;

  // ─── Section: Record details ─────────────────────────────────

  const recordDetailSection = (
    <div className="p-4 border-b">
      <RecordDetailTabs match={match} />
    </div>
  );

  // ─── Section: Screening profile ──────────────────────────────

  const screeningProfileSection = hasScreeningData ? (
    <div className="p-4 border-b">
      <Collapsible open={sectionOpen.screeningProfile} onOpenChange={() => toggleSection('screeningProfile')}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold w-full group mb-0">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>{t('cases.screeningData')}</span>
            <ChevronsUpDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 p-3 rounded-md bg-muted/30 border border-border/50">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {screeningData!.dob        && <div><span className="text-muted-foreground text-[11px]">{t('cases.dob')}</span><span className="font-medium block">{screeningData!.dob}</span></div>}
              {screeningData!.gender     && <div><span className="text-muted-foreground text-[11px]">{t('cases.gender')}</span><span className="font-medium block">{screeningData!.gender}</span></div>}
              {screeningData!.nationality&& <div><span className="text-muted-foreground text-[11px]">{t('cases.nationality')}</span><span className="font-medium block">{screeningData!.nationality}</span></div>}
              {screeningData!.country    && <div><span className="text-muted-foreground text-[11px]">{t('cases.country')}</span><span className="font-medium block">{screeningData!.country}</span></div>}
              {screeningData!.idType     && <div><span className="text-muted-foreground text-[11px]">{screeningData!.idType}</span><span className="font-medium font-mono block">{screeningData!.idNumber || '—'}</span></div>}
              {screeningData!.secondaryIdType && <div><span className="text-muted-foreground text-[11px]">{screeningData!.secondaryIdType}</span><span className="font-medium font-mono block">{screeningData!.secondaryIdNumber || '—'}</span></div>}
            </div>
            {screeningData!.customFields && Object.keys(screeningData!.customFields).length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {Object.entries(screeningData!.customFields).map(([key, val]) => (
                  <div key={key}><span className="text-muted-foreground text-[11px]">{key}</span><span className="font-medium block">{val}</span></div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  ) : null;

  // ─── Section: Resolution history ─────────────────────────────

  const resolutionHistorySection = match.status !== 'Unresolved' && match.resolutionHistory.length > 0 ? (
    <div className="p-4 border-b">
      <h4 className="text-xs font-semibold mb-2.5">{t('match.currentResolution')}</h4>
      <ResolutionHistory match={match} />
    </div>
  ) : null;

  // ─── Disposition panel ────────────────────────────────────────
  // Checker: show CheckerPanel; Maker/Analyst: show ResolutionPanel

  const isCheckerView = (isChecker && match.pendingCheckerReview) || !!match.checkerReview;
  const hasMakerDecision = !!match.makerDecision;
  const dispositionLabel = isCheckerView
    ? 'Four-Eyes Review'
    : match.status === 'Unresolved' ? 'Resolve Match' : 'Update Resolution';

  const dispositionSection = (
    <div className="p-4 border-b">
      <Collapsible open={sectionOpen.disposition} onOpenChange={() => toggleSection('disposition')}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold w-full group mb-0">
            {isCheckerView
              ? <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              : <Check className="h-3.5 w-3.5 text-primary" />}
            <span>{dispositionLabel}</span>
            <ChevronsUpDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-3">
            {/* Maker decision — always shown first when present */}
            {hasMakerDecision && <MakerDecisionCard match={match} compact />}
            {/* Checker action or resolution panel below */}
            {isCheckerView ? (
              <CheckerPanel match={match} onSubmit={handleCheckerSubmit} compact />
            ) : (
              <ResolutionPanel
                status={status} setStatus={setStatus}
                risk={risk} setRisk={setRisk}
                matchOutcome={matchOutcome} setMatchOutcome={setMatchOutcome}
                reason={reason} setReason={setReason}
                comment={comment} setComment={setComment}
                onSave={handleSave}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── SIDE PANEL layout ────────────────────────────────────────
  // Top-down scroll: header → what changed → why matched → disposition → record details

  const sidePanelContent = (
    <div className="flex flex-col">
      {stickyHeader}
      {whatChangedSection}
      {whyMatchedSection}
      {screeningProfileSection}
      {resolutionHistorySection}
      {dispositionSection}
      {recordDetailSection}
    </div>
  );

  // Left column (scrollable): identity evidence. Right column (scrollable): disposition + history + profile

  const fullscreenContent = (
    <div className="flex flex-col h-full">
      {stickyHeader}
      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_360px]">
        {/* LEFT: evidence */}
        <div className="overflow-y-auto border-r">
          {whatChangedSection}
          {whyMatchedSection}
          {screeningProfileSection}
          {recordDetailSection}
        </div>
        {/* RIGHT: disposition + context */}
        <div className="overflow-y-auto flex flex-col">
          {resolutionHistorySection}
          {dispositionSection}
        </div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────

  if (isFullscreen) {
    return (
      <>
        <Sheet open={open} onOpenChange={v => { if (!v) { setIsFullscreen(false); onClose(); } }}>
          <SheetContent className="w-0 p-0 border-0 overflow-hidden">
            <SheetHeader className="sr-only"><SheetTitle>{match.matchedName}</SheetTitle></SheetHeader>
          </SheetContent>
        </Sheet>
        <Dialog open={open} onOpenChange={v => { if (!v) { setIsFullscreen(false); onClose(); } }}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 overflow-hidden [&>button.absolute]:hidden">
            {fullscreenContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] p-0 flex flex-col h-full overflow-hidden [&>button.absolute]:hidden">
        <SheetHeader className="sr-only"><SheetTitle>{match.matchedName}</SheetTitle></SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {sidePanelContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}
