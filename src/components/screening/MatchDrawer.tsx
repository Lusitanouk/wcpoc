import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, HelpCircle, XCircle, CircleOff, Clock, User, History, ChevronsUpDown, Maximize2, Minimize2, ExternalLink, FileText, Database, Download, ArrowDown, X, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Bot, ThumbsUp, ThumbsDown, Pencil } from 'lucide-react';
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

// ─── Maker Card ──────────────────────────────────────────────
function MakerDecisionCard({ match }: { match: Match }) {
  const md = match.makerDecision;
  if (!md) return null;
  const isAgentic = md.makerType === 'Agentic';
  const statusColors: Record<string, string> = {
    Positive: 'text-status-positive border-status-positive/30 bg-status-positive/8',
    Possible: 'text-status-possible border-status-possible/30 bg-status-possible/8',
    False: 'text-status-false border-status-false/30 bg-status-false/8',
    Unknown: 'text-status-unknown border-status-unknown/30 bg-status-unknown/8',
    Unresolved: 'text-status-unresolved border-status-unresolved/30 bg-status-unresolved/8',
  };

  return (
    <div className="mx-4 mt-3 mb-1 rounded-md border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/15 bg-primary/8">
        {isAgentic
          ? <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
          : <User className="h-3.5 w-3.5 text-primary shrink-0" />
        }
        <span className="text-[11px] font-semibold text-primary">
          {isAgentic ? 'Agentic Resolution' : 'Analyst Resolution'} — Pending Checker Review
        </span>
        <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0">
          {isAgentic ? 'Bot' : 'Maker'}
        </Badge>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${statusColors[md.status] || ''}`}>
            {md.status}
          </span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
            md.riskLevel === 'High' ? 'text-destructive' : md.riskLevel === 'Medium' ? 'text-amber-600' : 'text-muted-foreground'
          }`}>
            Risk: {md.riskLevel}
          </span>
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

// ─── Checker Decision Panel ───────────────────────────────────
function CheckerPanel({
  match,
  onSubmit,
}: {
  match: Match;
  onSubmit: (decision: CheckerDecision, amendedStatus?: MatchStatus, amendedRisk?: RiskLevel, reason?: string, comment?: string) => void;
}) {
  const [decision, setDecision] = useState<CheckerDecision | null>(null);
  const [amendedStatus, setAmendedStatus] = useState<MatchStatus>('Possible');
  const [amendedRisk, setAmendedRisk] = useState<RiskLevel>('Low');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const md = match.makerDecision;
  const cr = match.checkerReview;

  const decisionStyles: Record<CheckerDecision, string> = {
    Accepted: 'border-status-positive/40 bg-status-positive/10 text-status-positive',
    Amended: 'border-status-possible/40 bg-status-possible/10 text-status-possible',
    Rejected: 'border-status-unresolved/40 bg-status-unresolved/10 text-status-unresolved',
  };

  if (cr) {
    // Already decided — show read-only result
    return (
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-3.5 w-3.5 text-status-positive shrink-0" />
          <h4 className="text-xs font-semibold">Checker Decision</h4>
          <Badge className={`ml-auto text-[9px] px-1.5 py-0 h-4 border ${decisionStyles[cr.decision]}`}>
            {cr.decision}
          </Badge>
        </div>
        <div className="p-3 rounded-md bg-muted/40 space-y-1.5 text-xs border">
          {cr.decision === 'Amended' && (
            <div className="flex items-center gap-2 text-status-possible font-medium">
              <Pencil className="h-3 w-3" />
              Amended to: {cr.amendedStatus} / {cr.amendedRiskLevel}
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
    <div id="checker-panel" className="p-4 border-b">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-3.5 w-3.5 text-primary shrink-0" />
        <h4 className="text-xs font-semibold">Checker Decision</h4>
        <Badge className="ml-auto text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
          Action Required
        </Badge>
      </div>

      {/* Decision buttons */}
      <div className="flex gap-2 mb-3">
        {(['Accepted', 'Amended', 'Rejected'] as CheckerDecision[]).map(d => (
          <button
            key={d}
            onClick={() => setDecision(d)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all border ${
              decision === d
                ? decisionStyles[d]
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {d === 'Accepted' && <ThumbsUp className="h-3 w-3" />}
            {d === 'Amended' && <Pencil className="h-3 w-3" />}
            {d === 'Rejected' && <ThumbsDown className="h-3 w-3" />}
            {d}
          </button>
        ))}
      </div>

      {/* Amended fields */}
      {decision === 'Amended' && (
        <div className="flex gap-3 mb-3 p-2.5 rounded-md border border-status-possible/25 bg-status-possible/5">
          <div className="space-y-1 shrink-0">
            <Label className="text-[10px] text-muted-foreground">Amended Status</Label>
            <div className="flex flex-col gap-1">
              {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
                <button key={s} onClick={() => setAmendedStatus(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border text-left ${
                    amendedStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1 shrink-0">
            <Label className="text-[10px] text-muted-foreground">Amended Risk</Label>
            <div className="flex flex-col gap-1">
              {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                <button key={r} onClick={() => setAmendedRisk(r)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border text-left ${
                    amendedRisk === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >{r}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reason */}
      <div className="space-y-1.5 mb-2">
        <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
        <Textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          placeholder={decision === 'Rejected' ? 'Reason for rejection...' : decision === 'Amended' ? 'Why were amendments made...' : 'Reason for acceptance...'}
          className="text-xs resize-none"
        />
      </div>
      <div className="space-y-1.5 mb-3">
        <Label className="text-xs">Comment (optional)</Label>
        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          placeholder="Additional notes..."
          className="text-xs resize-none"
        />
      </div>

      <Button
        className="w-full"
        disabled={!decision || !reason.trim()}
        onClick={() => onSubmit(
          decision!,
          decision === 'Amended' ? amendedStatus : undefined,
          decision === 'Amended' ? amendedRisk : undefined,
          reason,
          comment || undefined,
        )}
      >
        Submit {decision || 'Decision'}
      </Button>
    </div>
  );
}

const fieldResultIcon = (result: string) => {
  switch (result) {
    case 'match': return <Check className="h-3 w-3 text-status-positive" />;
    case 'partial': return <HelpCircle className="h-3 w-3 text-status-possible" />;
    case 'mismatch': return <XCircle className="h-3 w-3 text-status-unresolved" />;
    default: return <CircleOff className="h-3 w-3 text-muted-foreground" />;
  }
};


  switch (result) {
    case 'match': return <Check className="h-3 w-3 text-status-positive" />;
    case 'partial': return <HelpCircle className="h-3 w-3 text-status-possible" />;
    case 'mismatch': return <XCircle className="h-3 w-3 text-status-unresolved" />;
    default: return <CircleOff className="h-3 w-3 text-muted-foreground" />;
  }
};

// ─── Source Citation Bubble ──────────────────────────────────
function SourceCitation({ sources, indices }: { sources: { name: string; url: string }[]; indices: number[] }) {
  const cited = indices.filter(i => i < sources.length).map(i => sources[i]);
  if (cited.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors ml-1.5 align-middle cursor-pointer border border-primary/20">
          {indices.map(i => i + 1).join(',')}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 z-50 bg-popover border shadow-lg" side="top" align="start">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Sources</p>
        <ul className="space-y-1.5">
          {cited.map((s, j) => (
            <li key={j} className="flex items-start gap-2 text-xs">
              <span className="inline-flex items-center justify-center h-[16px] min-w-[16px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0 mt-0.5">
                {indices[j] + 1}
              </span>
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

// ─── Change Chip — clickable, scrolls to the change row ─────
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

// ─── What Changed Section ────────────────────────────────────
function WhatChangedSection({ changeLog, reviewRequiredReasons }: { changeLog: ChangeLogEntry[]; reviewRequiredReasons: string[] }) {
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const scrollToRow = useCallback((index: number) => {
    const el = rowRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight flash
      el.classList.add('ring-2', 'ring-status-possible', 'ring-inset');
      setTimeout(() => el.classList.remove('ring-2', 'ring-status-possible', 'ring-inset'), 1800);
    }
  }, []);

  return (
    <div id="what-changed-section" className="p-4 border-b">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-3.5 w-3.5 text-status-possible shrink-0" />
        <h4 className="text-xs font-semibold text-status-possible">What Changed</h4>
        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-status-possible/15 text-status-possible border-0 ml-auto">
          {changeLog.length} change{changeLog.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Reasons row */}
      {reviewRequiredReasons.length > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
          {reviewRequiredReasons.join(' · ')}
        </p>
      )}

      {/* Quick-nav chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {changeLog.map((cl, i) => (
          <ChangeChip key={i} change={cl} index={i} onClick={() => scrollToRow(i)} />
        ))}
      </div>

      {/* Diff table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-status-possible/8 border-b">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground w-5">
                <span className="sr-only">#</span>
              </th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Previous</th>
              <th className="px-1 py-2 text-muted-foreground w-5">→</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Updated</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {changeLog.map((cl, i) => (
              <tr
                key={i}
                ref={el => { rowRefs.current[i] = el; }}
                className="border-b last:border-b-0 transition-all duration-300"
              >
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-status-possible/20 text-status-possible text-[9px] font-bold">
                    {i + 1}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-medium">{cl.field}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[11px] font-mono line-through">
                    {cl.from}
                  </span>
                </td>
                <td className="px-1 py-2.5 text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-status-positive/10 text-status-positive text-[11px] font-mono font-semibold">
                    {cl.to}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                  {cl.changedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Review Required Banner ───────────────────────────────────
function ReviewRequiredBanner({
  match,
  changeCount,
  onJumpToChanges,
}: {
  match: Match;
  changeCount: number;
  onJumpToChanges: () => void;
}) {
  return (
    <div className="mx-4 mt-3 mb-1 rounded-md border border-status-possible/40 bg-status-possible/8 overflow-hidden">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <AlertTriangle className="h-3.5 w-3.5 text-status-possible shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-status-possible leading-tight">Record updated — review required</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
            {match.reviewRequiredReasons.join(' · ')}
          </p>
        </div>
        {changeCount > 0 && (
          <button
            onClick={onJumpToChanges}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-status-possible/20 text-status-possible hover:bg-status-possible/30 transition-colors shrink-0 whitespace-nowrap"
          >
            <ArrowDown className="h-3 w-3" />
            {changeCount} change{changeCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

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

export function MatchDrawer({ match, open, onClose, caseName, onUpdate, screeningData, currentIndex, totalMatches, onNavigate, defaultFullscreen }: MatchDrawerProps) {
  const { t } = useTranslation();
  const { role } = useAppContext();
  const isChecker = role === 'Checker';
  const [status, setStatus] = useState<MatchStatus>(match?.status || 'Unresolved');
  const [risk, setRisk] = useState<RiskLevel>(match?.riskLevel || 'None');
  const [reason, setReason] = useState(match?.reason || '');
  const [matchOutcome, setMatchOutcome] = useState('');
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('key-data');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen ?? false);
  const [dispositionTab, setDispositionTab] = useState<'resolve' | 'review'>('resolve');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const whatChangedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (match && open) {
      setStatus(match.status);
      setRisk(match.riskLevel);
      setReason(match.reason);
      setComment('');
      setHistoryOpen(false);
      setIsFullscreen(defaultFullscreen ?? false);
    }
  }, [match?.id, defaultFullscreen, open]);

  if (!match) return null;

  const jumpToChanges = () => {
    const el = whatChangedRef.current;
    if (!el) return;
    // In fullscreen the scroll container is the content column; in panel it's the sheet scroll
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Pulse the section
    el.classList.add('ring-2', 'ring-status-possible', 'ring-inset', 'rounded-md');
    setTimeout(() => el.classList.remove('ring-2', 'ring-status-possible', 'ring-inset', 'rounded-md'), 1800);
  };

  const handleSave = () => {
    onUpdate({ ...match, status, riskLevel: risk, reason });
    onClose();
  };

  const handleCheckerSubmit = (
    decision: import('@/types').CheckerDecision,
    amendedStatus?: MatchStatus,
    amendedRisk?: RiskLevel,
    reason?: string,
    comment?: string,
  ) => {
    const now = new Date().toISOString().split('T')[0];
    const updatedMatch: Match = {
      ...match,
      pendingCheckerReview: false,
      checkerReview: {
        author: 'Current User (Checker)',
        decision,
        amendedStatus,
        amendedRiskLevel: amendedRisk,
        reason: reason || '',
        comment,
        createdAt: now,
      },
      ...(decision === 'Amended' && amendedStatus ? { status: amendedStatus, riskLevel: amendedRisk ?? match.riskLevel } : {}),
      ...(decision === 'Rejected' ? { status: 'Unresolved' as MatchStatus, pendingCheckerReview: false } : {}),
    };
    onUpdate(updatedMatch);
    onClose();
  };

  const rd = match.recordData;
  const hasNavigation = onNavigate && totalMatches !== undefined && currentIndex !== undefined && totalMatches > 1;
  const hasPrev = hasNavigation && currentIndex > 0;
  const hasNext = hasNavigation && currentIndex < totalMatches - 1;
  const currentResolution = match.resolutionHistory.length > 0 ? match.resolutionHistory[0] : null;
  const olderHistory = match.resolutionHistory.slice(1);

  const hasScreeningData = screeningData && (screeningData.dob || screeningData.gender || screeningData.nationality || screeningData.country || screeningData.idType || screeningData.customFields);

  const resolveReviewPanel = (
    <div id="disposition-section" className={`p-4 ${isFullscreen ? 'overflow-y-auto space-y-4' : 'border-b'}`}>
      {!isFullscreen ? (
        <>
          {/* Stacked tab switcher for side panel */}
          <div className="flex gap-1 mb-3 p-0.5 rounded-md bg-muted/50 w-fit">
            <button
              onClick={() => setDispositionTab('resolve')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                dispositionTab === 'resolve'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Resolve Match
            </button>
            <button
              onClick={() => setDispositionTab('review')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                dispositionTab === 'review'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('match.reviewComment')}
            </button>
          </div>

          {dispositionTab === 'resolve' ? (
            <div className="space-y-3">
              <div className="flex gap-4 items-start">
                <div className="space-y-1.5 shrink-0">
                  <Label className="text-xs">{t('match.status')}</Label>
                  <div className="flex flex-col gap-1">
                    {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                          status === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {t(`match.${s.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 shrink-0">
                  <Label className="text-xs">{t('match.riskLevel')}</Label>
                  <div className="flex flex-col gap-1">
                    {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setRisk(r)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                          risk === r
                            ? r === 'High' ? 'bg-destructive text-destructive-foreground border-destructive'
                              : r === 'Medium' ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {t(`match.${r.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Match Outcome</Label>
                <Select value={matchOutcome} onValueChange={setMatchOutcome}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="Full Match" className="text-xs">Full Match</SelectItem>
                    <SelectItem value="Partial Match" className="text-xs">Partial Match</SelectItem>
                    <SelectItem value="No Match" className="text-xs">No Match</SelectItem>
                    <SelectItem value="Unknown" className="text-xs">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('match.reason')}</Label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('match.resolutionReason')}
                  className="text-xs resize-none"
                />
              </div>
              <Button onClick={handleSave} className="w-full mt-3">Save</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder={t('match.optionalComment')}
                className="text-xs resize-none"
              />
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          )}
        </>
      ) : (
        /* Fullscreen: show both sections stacked */
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Resolve Match</h4>
            <div className="flex gap-4 items-start">
              <div className="space-y-1.5 shrink-0">
                <Label className="text-xs">{t('match.status')}</Label>
                <div className="flex flex-col gap-1">
                  {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                        status === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {t(`match.${s.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 shrink-0">
                <Label className="text-xs">{t('match.riskLevel')}</Label>
                <div className="flex flex-col gap-1">
                  {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setRisk(r)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                        risk === r
                          ? r === 'High' ? 'bg-destructive text-destructive-foreground border-destructive'
                            : r === 'Medium' ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {t(`match.${r.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Match Outcome</Label>
              <Select value={matchOutcome} onValueChange={setMatchOutcome}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="Full Match" className="text-xs">Full Match</SelectItem>
                  <SelectItem value="Partial Match" className="text-xs">Partial Match</SelectItem>
                  <SelectItem value="No Match" className="text-xs">No Match</SelectItem>
                  <SelectItem value="Unknown" className="text-xs">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('match.reason')}</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder={t('match.resolutionReason')}
                className="text-xs resize-none"
              />
            </div>
          </div>
          <div className="border-t" />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('match.reviewComment')}</h4>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder={t('match.optionalComment')}
              className="text-xs resize-none"
            />
          </div>
          <Button onClick={handleSave} className="w-full">Save</Button>
        </>
      )}
    </div>
  );

  const drawerContent = (
    <div className={`flex flex-col ${isFullscreen ? '' : 'h-full'}`}>
      {/* ── Sticky header ── */}
      <div className="pb-3 border-b sticky top-0 z-10 bg-background">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <h2 className="text-base font-semibold truncate">{match.matchedName}</h2>
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => exportMatchPdf(match, caseName)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export match PDF</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hasNavigation && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onNavigate!('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono">{currentIndex + 1}/{totalMatches}</span>
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

        {/* Badges row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap px-4">
          <Badge variant="outline" className="text-[10px]">{match.dataset}</Badge>
          <Badge variant="outline" className="text-[10px]">{match.strength}% {t('screening.strength').toLowerCase()}</Badge>
          <Badge variant="outline" className={`text-[10px] ${priorityColor(match.priorityLevel)}`}>
            {match.priorityLevel} {t('screening.priority')}
          </Badge>
          {match.updated && (
            <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0">{t('match.updated')}</Badge>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] gap-1 ml-auto"
                  onClick={() => setActiveTab('sources')}
                >
                  <Database className="h-3 w-3" />
                  {rd.sources.length} {t('match.sources').toLowerCase()}
                </Button>
              </TooltipTrigger>
              <TooltipContent>View data provenance &amp; source references</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Review Required banner — now in sticky header for instant visibility */}
        {match.reviewRequired && match.changeLog.length > 0 && (
          <ReviewRequiredBanner
            match={match}
            changeCount={match.changeLog.length}
            onJumpToChanges={jumpToChanges}
          />
        )}
      </div>

      {/* ── Main content ── */}
      <div className={isFullscreen ? 'grid grid-cols-[1fr_340px] gap-0 flex-1 overflow-hidden' : 'flex-1'}>
        <div ref={scrollContainerRef} className={isFullscreen ? 'overflow-y-auto border-r' : ''}>

          {/* ── Current Resolution ── */}
          {match.status !== 'Unresolved' && currentResolution && (
            <div className="p-4 border-b">
              <h4 className="text-xs font-semibold mb-2">{t('match.currentResolution')}</h4>
              <div className="p-3 rounded-md bg-muted/50 space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-muted-foreground">{t('match.status')}:</span>{' '}
                    <span className="font-medium">{currentResolution.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('match.riskLevel')}:</span>{' '}
                    <span className="font-medium">{currentResolution.riskLevel}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('match.reason')}:</span>{' '}
                  <span>{currentResolution.reason}</span>
                </div>
                {currentResolution.comment && (
                  <div className="p-2 rounded bg-background border text-[11px] italic text-muted-foreground">
                    "{currentResolution.comment}"
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{currentResolution.author}</span>
                  <Clock className="h-3 w-3 ml-1" />
                  <span>{currentResolution.createdAt}</span>
                </div>
              </div>

              {olderHistory.length > 0 && (
                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-2">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                      <History className="h-3 w-3" />
                      <span>{olderHistory.length} {t('match.previousDecisions')}</span>
                      <ChevronsUpDown className="h-3 w-3 ml-auto" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="max-h-48 mt-2">
                      <div className="space-y-0">
                        {olderHistory.map((entry, idx) => (
                          <div key={entry.id} className="relative pl-5 pb-3">
                            {idx < olderHistory.length - 1 && (
                              <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                            )}
                            <div className="absolute left-0 top-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                              <Check className="h-2.5 w-2.5" />
                            </div>
                            <div className="text-xs">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.status}</Badge>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.riskLevel}</Badge>
                              </div>
                              <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                              {entry.comment && (
                                <p className="mt-1 italic text-[11px] text-muted-foreground">"{entry.comment}"</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                                <span>{entry.author}</span>
                                <span>·</span>
                                <span>{entry.createdAt}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* ── Screening Profile ── */}
          {hasScreeningData && (
            <div className="p-4 border-b">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs font-semibold w-full group">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>{t('cases.screeningData')}</span>
                    <ChevronsUpDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 rounded-md bg-muted/30 border border-border/50">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {screeningData!.dob && (
                        <div>
                          <span className="text-muted-foreground text-[11px]">{t('cases.dob')}</span>
                          <span className="font-medium block">{screeningData!.dob}</span>
                        </div>
                      )}
                      {screeningData!.gender && (
                        <div>
                          <span className="text-muted-foreground text-[11px]">{t('cases.gender')}</span>
                          <span className="font-medium block">{screeningData!.gender}</span>
                        </div>
                      )}
                      {screeningData!.nationality && (
                        <div>
                          <span className="text-muted-foreground text-[11px]">{t('cases.nationality')}</span>
                          <span className="font-medium block">{screeningData!.nationality}</span>
                        </div>
                      )}
                      {screeningData!.country && (
                        <div>
                          <span className="text-muted-foreground text-[11px]">{t('cases.country')}</span>
                          <span className="font-medium block">{screeningData!.country}</span>
                        </div>
                      )}
                      {screeningData!.idType && (
                        <div>
                          <span className="text-muted-foreground text-[11px]">{screeningData!.idType}</span>
                          <span className="font-medium font-mono block">{screeningData!.idNumber || '—'}</span>
                        </div>
                      )}
                      {screeningData!.secondaryIdType && (
                        <div>
                          <span className="text-muted-foreground text-[11px]">{screeningData!.secondaryIdType}</span>
                          <span className="font-medium font-mono block">{screeningData!.secondaryIdNumber || '—'}</span>
                        </div>
                      )}
                    </div>
                    {screeningData!.customFields && Object.keys(screeningData!.customFields).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        {Object.entries(screeningData!.customFields).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-muted-foreground text-[11px]">{key}</span>
                            <span className="font-medium block">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* ── Why it matched ── */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold">{t('match.whyMatched')}</h4>
            </div>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8"></th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Screened</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Matched Record</th>
                  </tr>
                </thead>
                <tbody>
                  {match.whyMatched.map((wf, i) => (
                    <tr key={i} className={`border-b last:border-b-0 ${
                      wf.result === 'match' ? 'bg-status-positive/5'
                      : wf.result === 'mismatch' ? 'bg-status-unresolved/5'
                      : ''
                    }`}>
                      <td className="px-3 py-2">{fieldResultIcon(wf.result)}</td>
                      <td className="px-3 py-2 font-medium">{wf.field}</td>
                      <td className="px-3 py-2 text-muted-foreground">{wf.inputValue || '—'}</td>
                      <td className="px-3 py-2 font-medium">{wf.matchedValue || '—'}</td>
                    </tr>
                  ))}
                  {match.aliases.length > 0 && (
                    <tr className="border-b last:border-b-0 bg-muted/20">
                      <td className="px-3 py-2"><User className="h-3 w-3 text-muted-foreground" /></td>
                      <td className="px-3 py-2 font-medium align-top">Aliases ({match.aliases.length})</td>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={2}>
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
            <p className="text-[10px] text-muted-foreground italic mt-2">{match.matchStrengthExplanation}</p>
          </div>

          {/* ── What Changed — rendered here with ref for scroll targeting ── */}
          {match.reviewRequired && match.changeLog.length > 0 && (
            <div ref={whatChangedRef}>
              <WhatChangedSection
                changeLog={match.changeLog}
                reviewRequiredReasons={match.reviewRequiredReasons}
              />
            </div>
          )}

          {/* ── Resolve & Review in side-panel mode ── */}
          {!isFullscreen && resolveReviewPanel}

          {/* ── Record Tabs ── */}
          <div className="p-4 border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start h-auto flex-wrap gap-1 p-1 mb-3">
                <ResponsiveTabsTrigger value="key-data" icon={<FileText className="h-3 w-3" />} label={t('match.keyData')} />
                <ResponsiveTabsTrigger value="further" icon={<HelpCircle className="h-3 w-3" />} label={t('match.furtherInfo')} />
                <ResponsiveTabsTrigger value="aliases" icon={<User className="h-3 w-3" />} label={t('match.aliases')} />
                <ResponsiveTabsTrigger value="keywords" icon={<FileText className="h-3 w-3" />} label={t('match.keywords')} />
                {rd.pepRoleDetails && <ResponsiveTabsTrigger value="pep" icon={<User className="h-3 w-3" />} label={t('match.pepDetails')} />}
                <ResponsiveTabsTrigger value="connections" icon={<ExternalLink className="h-3 w-3" />} label={t('match.connections')} />
                <ResponsiveTabsTrigger value="sources" icon={<Database className="h-3 w-3" />} label={t('match.sources')} />
              </TabsList>

              <TabsContent value="key-data" className="space-y-2">
                {Object.entries(rd.keyData).map(([k, v], idx) => (
                  <div key={k} className="flex items-center justify-between text-sm py-1 border-b border-dashed">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium flex items-center">
                      {v}
                      <SourceCitation sources={rd.sources} indices={[idx % rd.sources.length]} />
                    </span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="further">
                <div className="text-sm leading-relaxed">
                  <p>
                    {rd.furtherInfo}
                    <SourceCitation sources={rd.sources} indices={rd.sources.map((_, i) => i)} />
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="aliases">
                <div className="flex flex-wrap gap-2 items-center">
                  {rd.aliases.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}
                  <SourceCitation sources={rd.sources} indices={[0]} />
                </div>
              </TabsContent>

              <TabsContent value="keywords">
                <div className="flex flex-wrap gap-2 items-center">
                  {rd.keywords.map((k, i) => <Badge key={i} variant="outline" className="text-xs">{k}</Badge>)}
                  <SourceCitation sources={rd.sources} indices={[0, Math.min(1, rd.sources.length - 1)]} />
                </div>
              </TabsContent>

              {rd.pepRoleDetails && (
                <TabsContent value="pep">
                  <p className="text-sm">
                    {rd.pepRoleDetails}
                    <SourceCitation sources={rd.sources} indices={[0]} />
                  </p>
                </TabsContent>
              )}

              <TabsContent value="connections">
                {rd.connections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('match.noConnections')}</p>
                ) : (
                  <ul className="space-y-1">
                    {rd.connections.map((c, i) => (
                      <li key={i} className="text-sm flex items-center gap-1">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" /> {c}
                        <SourceCitation sources={rd.sources} indices={[i % rd.sources.length]} />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="sources">
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Data provenance — original watchlist sources where this record was found.
                  </p>
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
          </div>
        </div>

        {/* ── Fullscreen right sidebar: disposition panel ── */}
        {isFullscreen && (
          <div className="overflow-y-auto flex flex-col">
            {resolveReviewPanel}
          </div>
        )}
      </div>
    </div>
  );

  // Fullscreen uses Dialog
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
            {drawerContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] p-0 flex flex-col h-full overflow-hidden [&>button.absolute]:hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>{match.matchedName}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {drawerContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}
