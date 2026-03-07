import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Check, HelpCircle, XCircle, CircleOff, Clock, User, History, ChevronsUpDown, Maximize2, Minimize2, ExternalLink, FileText, Database, Download, ArrowRight, X, AlertTriangle, Zap, TrendingUp } from 'lucide-react';
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
import type { Match, MatchStatus, RiskLevel, CaseScreeningData } from '@/types';
import { useTranslation } from 'react-i18next';
import { exportMatchPdf } from '@/lib/export';

// ─── Field result icon ────────────────────────────────────────
const fieldResultIcon = (result: string, size = 'sm') => {
  const cls = size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';
  switch (result) {
    case 'match': return <Check className={`${cls} text-status-positive`} />;
    case 'partial': return <HelpCircle className={`${cls} text-status-possible`} />;
    case 'mismatch': return <XCircle className={`${cls} text-status-unresolved`} />;
    default: return <CircleOff className={`${cls} text-muted-foreground`} />;
  }
};

const fieldResultBg = (result: string) => {
  switch (result) {
    case 'match': return 'bg-status-positive/10 border-status-positive/30 text-status-positive';
    case 'partial': return 'bg-status-possible/10 border-status-possible/30 text-status-possible';
    case 'mismatch': return 'bg-status-unresolved/10 border-status-unresolved/30 text-status-unresolved';
    default: return 'bg-muted/50 border-border text-muted-foreground';
  }
};

const fieldResultLabel = (result: string) => {
  switch (result) {
    case 'match': return 'Match';
    case 'partial': return 'Partial';
    case 'mismatch': return 'Mismatch';
    default: return 'Missing';
  }
};

// ─── Strength meter ───────────────────────────────────────────
function StrengthMeter({ strength }: { strength: number }) {
  const color = strength >= 85 ? 'bg-status-unresolved' : strength >= 65 ? 'bg-status-possible' : 'bg-status-false';
  const label = strength >= 85 ? 'Strong' : strength >= 65 ? 'Moderate' : 'Weak';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${strength}%` }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums shrink-0">{strength}%</span>
      <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{label}</span>
    </div>
  );
}

// ─── Why Matched scorecards ───────────────────────────────────
function WhyMatchedCards({ match }: { match: Match }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {match.whyMatched.map((wf, i) => (
          <div
            key={i}
            className={`rounded-md border px-2.5 py-2 flex flex-col gap-0.5 ${fieldResultBg(wf.result)}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70 truncate">{wf.field}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1 py-0.5 border ${fieldResultBg(wf.result)}`}>
                {fieldResultLabel(wf.result)}
              </span>
            </div>
            {(wf.inputValue || wf.matchedValue) && (
              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <span className="text-[11px] font-mono truncate opacity-80">{wf.inputValue || '—'}</span>
                {wf.result !== 'missing' && (
                  <>
                    <ArrowRight className="h-2.5 w-2.5 shrink-0 opacity-50" />
                    <span className="text-[11px] font-mono font-medium truncate">{wf.matchedValue || '—'}</span>
                  </>
                )}
              </div>
            )}
            <span className="text-[10px] opacity-60 truncate">{wf.detail}</span>
          </div>
        ))}
      </div>
      {match.aliases.length > 0 && (
        <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-2">Aliases ({match.aliases.length})</span>
          <span className="inline-flex flex-wrap gap-1 mt-1">
            {match.aliases.map((alias, ai) => (
              <Badge key={ai} variant="secondary" className="text-[10px] font-normal">{alias}</Badge>
            ))}
          </span>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground italic leading-relaxed">{match.matchStrengthExplanation}</p>
    </div>
  );
}

// ─── What Changed panel ───────────────────────────────────────
function WhatChangedPanel({ match, compact = false }: { match: Match; compact?: boolean }) {
  if (!match.reviewRequired || match.changeLog.length === 0) return null;
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap gap-1">
        {match.reviewRequiredReasons.map((r, i) => (
          <Badge key={i} className="text-[10px] bg-status-possible/15 text-status-possible border-status-possible/30 border">
            {r}
          </Badge>
        ))}
      </div>
      <div className="rounded-md border border-status-possible/30 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-status-possible/8 border-b border-status-possible/20">
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Field</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Previous</th>
              <th className="text-left px-3 py-1.5 font-semibold">New Value</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {match.changeLog.map((cl, i) => (
              <tr key={i} className={`border-b last:border-b-0 ${i === 0 ? 'bg-status-possible/5' : ''}`}>
                <td className="px-3 py-1.5 font-semibold">{cl.field}</td>
                <td className="px-3 py-1.5 text-muted-foreground line-through">{cl.from}</td>
                <td className="px-3 py-1.5 font-medium text-foreground">{cl.to}</td>
                <td className="px-3 py-1.5 text-muted-foreground tabular-nums text-[11px]">{cl.changedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Source Citation Bubble (ChatGPT-style) ──────────────────
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
  const [status, setStatus] = useState<MatchStatus>(match?.status || 'Unresolved');
  const [risk, setRisk] = useState<RiskLevel>(match?.riskLevel || 'None');
  const [reason, setReason] = useState(match?.reason || '');
  const [matchOutcome, setMatchOutcome] = useState('');
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('key-data');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen ?? false);
  const [dispositionTab, setDispositionTab] = useState<'resolve' | 'review'>('resolve');
  const changesRef = useRef<HTMLDivElement>(null);
  const whyMatchedRef = useRef<HTMLDivElement>(null);

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

  const handleSave = () => {
    onUpdate({ ...match, status, riskLevel: risk, reason });
    onClose();
  };

  const scrollToChanges = () => {
    changesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const rd = match.recordData;
  const hasNavigation = onNavigate && totalMatches !== undefined && currentIndex !== undefined && totalMatches > 1;
  const hasPrev = hasNavigation && currentIndex > 0;
  const hasNext = hasNavigation && currentIndex < totalMatches - 1;
  const currentResolution = match.resolutionHistory.length > 0 ? match.resolutionHistory[0] : null;
  const olderHistory = match.resolutionHistory.slice(1);
  const hasScreeningData = screeningData && (screeningData.dob || screeningData.gender || screeningData.nationality || screeningData.country || screeningData.idType || screeningData.customFields);
  const hasChanges = match.reviewRequired && match.changeLog.length > 0;

  // ─── Disposition Panel ────────────────────────────────────
  const resolveReviewPanel = (
    <div id="disposition-section" className={`${isFullscreen ? 'p-5 overflow-y-auto space-y-5 h-full' : 'p-4 border-t bg-card'}`}>
      {!isFullscreen ? (
        <>
          <div className="flex gap-0.5 mb-3 p-0.5 rounded-md bg-muted/60 w-fit">
            {(['resolve', 'review'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDispositionTab(tab)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  dispositionTab === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'resolve' ? 'Resolve Match' : t('match.reviewComment')}
              </button>
            ))}
          </div>

          {dispositionTab === 'resolve' ? (
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="space-y-1.5 shrink-0">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('match.status')}</Label>
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
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('match.riskLevel')}</Label>
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
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Match Outcome</Label>
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
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('match.reason')}</Label>
                    <Textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={3}
                      placeholder={t('match.resolutionReason')}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">Save Resolution</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                placeholder={t('match.optionalComment')}
                className="text-xs resize-none"
              />
              <Button onClick={handleSave} className="w-full">Save Review</Button>
            </div>
          )}
        </>
      ) : (
        /* Fullscreen: both stacked */
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Resolve Match</h4>
            <div className="flex gap-3 items-start">
              <div className="space-y-1.5 shrink-0">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('match.status')}</Label>
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
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('match.riskLevel')}</Label>
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
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Match Outcome</Label>
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
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('match.reason')}</Label>
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

  // ─── Main content ─────────────────────────────────────────
  const drawerContent = (
    <div className={`flex flex-col ${isFullscreen ? 'h-full' : ''}`}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-10 bg-background border-b">
        {/* Top bar: name + controls */}
        <div className="px-4 pt-3 pb-2 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-tight truncate">{match.matchedName}</h2>
            {/* Meta row */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">{match.dataset}</Badge>
              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 h-5 ${priorityColor(match.priorityLevel)}`}>
                {match.priorityLevel} priority
              </Badge>
              {match.updated && (
                <Badge className="text-[10px] py-0 px-1.5 h-5 bg-status-possible/15 text-status-possible border-status-possible/30 border">
                  Updated
                </Badge>
              )}
              {match.reviewRequired && (
                <Badge className="text-[10px] py-0 px-1.5 h-5 bg-destructive/10 text-destructive border-destructive/30 border">
                  Review Required
                </Badge>
              )}
            </div>
          </div>
          {/* Controls */}
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
                <div className="w-px h-4 bg-border mx-0.5" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onNavigate!('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[10px] text-muted-foreground font-mono px-0.5">{currentIndex + 1}/{totalMatches}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onNavigate!('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <div className="w-px h-4 bg-border mx-0.5" />
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

        {/* Strength meter row */}
        <div className="px-4 pb-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
            <TrendingUp className="h-3 w-3" />
            <span>Match strength</span>
          </div>
          <div className="flex-1 min-w-0">
            <StrengthMeter strength={match.strength} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 shrink-0" onClick={() => setActiveTab('sources')}>
                  <Database className="h-3 w-3" />
                  {rd.sources.length} {t('match.sources').toLowerCase()}
                </Button>
              </TooltipTrigger>
              <TooltipContent>View data sources</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* What Changed alert bar — only shown if record is updated */}
        {hasChanges && (
          <div className="mx-4 mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-status-possible/10 border border-status-possible/30 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-status-possible shrink-0" />
            <span className="text-status-possible font-medium flex-1 truncate">
              Record updated · {match.changeLog.length} field{match.changeLog.length > 1 ? 's' : ''} changed
            </span>
            <button
              onClick={scrollToChanges}
              className="text-[10px] text-status-possible hover:underline font-semibold whitespace-nowrap flex items-center gap-0.5 shrink-0"
            >
              Jump to changes <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className={`${isFullscreen ? 'grid grid-cols-[1fr_340px] flex-1 overflow-hidden' : 'flex-1'}`}>

        {/* Left / main scroll area */}
        <div className={`${isFullscreen ? 'overflow-y-auto' : ''}`}>

          {/* Current Resolution */}
          {match.status !== 'Unresolved' && currentResolution && (
            <div className="px-4 py-3 border-b">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Current Resolution</h4>
              <div className="p-2.5 rounded-md bg-muted/40 space-y-1.5 text-xs border">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{currentResolution.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{currentResolution.riskLevel} risk</Badge>
                </div>
                <p className="text-muted-foreground">{currentResolution.reason}</p>
                {currentResolution.comment && (
                  <p className="p-2 rounded bg-background border text-[11px] italic text-muted-foreground">"{currentResolution.comment}"</p>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <User className="h-2.5 w-2.5" /><span>{currentResolution.author}</span>
                  <Clock className="h-2.5 w-2.5 ml-1" /><span>{currentResolution.createdAt}</span>
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
                    <ScrollArea className="max-h-40 mt-1">
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
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.status}</Badge>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.riskLevel}</Badge>
                              </div>
                              <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                                <span>{entry.author}</span><span>·</span><span>{entry.createdAt}</span>
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

          {/* ── Why it Matched — visual scorecards ── */}
          <div ref={whyMatchedRef} className="px-4 py-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                {t('match.whyMatched')}
              </h4>
            </div>
            <WhyMatchedCards match={match} />
          </div>

          {/* ── What Changed ── */}
          {hasChanges && (
            <div ref={changesRef} className="px-4 py-3 border-b bg-status-possible/5">
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-status-possible mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {t('match.whatChanged')}
              </h4>
              <WhatChangedPanel match={match} />
            </div>
          )}

          {/* Screening profile context */}
          {hasScreeningData && (
            <div className="px-4 py-3 border-b">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-full group">
                    <FileText className="h-3 w-3 text-primary" />
                    <span>{t('cases.screeningData')}</span>
                    <ChevronsUpDown className="h-3 w-3 ml-auto group-hover:text-foreground transition-colors" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-2.5 rounded-md bg-muted/30 border border-border/50">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      {screeningData!.dob && (<div><span className="text-[10px] text-muted-foreground">{t('cases.dob')}</span><span className="font-medium block">{screeningData!.dob}</span></div>)}
                      {screeningData!.gender && (<div><span className="text-[10px] text-muted-foreground">{t('cases.gender')}</span><span className="font-medium block">{screeningData!.gender}</span></div>)}
                      {screeningData!.nationality && (<div><span className="text-[10px] text-muted-foreground">{t('cases.nationality')}</span><span className="font-medium block">{screeningData!.nationality}</span></div>)}
                      {screeningData!.country && (<div><span className="text-[10px] text-muted-foreground">{t('cases.country')}</span><span className="font-medium block">{screeningData!.country}</span></div>)}
                      {screeningData!.idType && (<div><span className="text-[10px] text-muted-foreground">{screeningData!.idType}</span><span className="font-medium font-mono block">{screeningData!.idNumber || '—'}</span></div>)}
                      {screeningData!.secondaryIdType && (<div><span className="text-[10px] text-muted-foreground">{screeningData!.secondaryIdType}</span><span className="font-medium font-mono block">{screeningData!.secondaryIdNumber || '—'}</span></div>)}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Record Detail Tabs */}
          <div className="px-4 py-3 border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start h-auto flex-wrap gap-0.5 p-0.5 mb-3">
                <ResponsiveTabsTrigger value="key-data" icon={<FileText className="h-3 w-3" />} label={t('match.keyData')} />
                <ResponsiveTabsTrigger value="further" icon={<HelpCircle className="h-3 w-3" />} label={t('match.furtherInfo')} />
                <ResponsiveTabsTrigger value="aliases" icon={<User className="h-3 w-3" />} label={t('match.aliases')} />
                <ResponsiveTabsTrigger value="keywords" icon={<FileText className="h-3 w-3" />} label={t('match.keywords')} />
                {rd.pepRoleDetails && <ResponsiveTabsTrigger value="pep" icon={<User className="h-3 w-3" />} label={t('match.pepDetails')} />}
                <ResponsiveTabsTrigger value="connections" icon={<ExternalLink className="h-3 w-3" />} label={t('match.connections')} />
                <ResponsiveTabsTrigger value="sources" icon={<Database className="h-3 w-3" />} label={t('match.sources')} />
              </TabsList>

              <TabsContent value="key-data" className="space-y-0 m-0">
                {Object.entries(rd.keyData).map(([k, v], idx) => (
                  <div key={k} className="flex items-center justify-between text-xs py-1.5 border-b border-dashed last:border-b-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium flex items-center">
                      {v}
                      <SourceCitation sources={rd.sources} indices={[idx % rd.sources.length]} />
                    </span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="further" className="m-0">
                <div className="text-sm leading-relaxed">
                  <p>
                    {rd.furtherInfo}
                    <SourceCitation sources={rd.sources} indices={rd.sources.map((_, i) => i)} />
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="aliases" className="m-0">
                <div className="flex flex-wrap gap-2 items-center">
                  {rd.aliases.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}
                  <SourceCitation sources={rd.sources} indices={[0]} />
                </div>
              </TabsContent>

              <TabsContent value="keywords" className="m-0">
                <div className="flex flex-wrap gap-2 items-center">
                  {rd.keywords.map((k, i) => <Badge key={i} variant="outline" className="text-xs">{k}</Badge>)}
                  <SourceCitation sources={rd.sources} indices={[0, Math.min(1, rd.sources.length - 1)]} />
                </div>
              </TabsContent>

              {rd.pepRoleDetails && (
                <TabsContent value="pep" className="m-0">
                  <p className="text-sm">
                    {rd.pepRoleDetails}
                    <SourceCitation sources={rd.sources} indices={[0]} />
                  </p>
                </TabsContent>
              )}

              <TabsContent value="connections" className="m-0">
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

              <TabsContent value="sources" className="m-0">
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

          {/* Disposition — in side-panel appears at bottom as sticky footer */}
          {!isFullscreen && resolveReviewPanel}
        </div>

        {/* Right sidebar in fullscreen: resolution panel */}
        {isFullscreen && (
          <div className="border-l overflow-y-auto bg-card/50">
            {resolveReviewPanel}
          </div>
        )}
      </div>
    </div>
  );

  // Fullscreen mode uses a Dialog
  if (isFullscreen) {
    return (
      <>
        <Sheet open={open} onOpenChange={v => { if (!v) { setIsFullscreen(false); onClose(); } }}>
          <SheetContent className="w-0 p-0 border-0 overflow-hidden">
            <SheetHeader className="sr-only"><SheetTitle>{match.matchedName}</SheetTitle></SheetHeader>
          </SheetContent>
        </Sheet>
        <Dialog open={open} onOpenChange={v => { if (!v) { setIsFullscreen(false); onClose(); } }}>
          <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden [&>button.absolute]:hidden">
            {drawerContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col h-full overflow-hidden [&>button.absolute]:hidden">
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
