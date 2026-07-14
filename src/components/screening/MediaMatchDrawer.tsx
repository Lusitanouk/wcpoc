import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Check, HelpCircle, XCircle, CircleOff,
  Maximize2, Minimize2, ExternalLink, X, AlertTriangle,
  ChevronsUpDown, Newspaper, Gavel, Scale, MessageSquareWarning,
  User, Sparkles, History, Clock,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { priorityColor } from '@/lib/priority';
import type {
  MediaMatch, MediaArticle, MediaPrePost, MatchStatus, RiskLevel, MatchFieldResult,
} from '@/types';

// ─── style maps ─────────────────────────────────────────────

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

const prePostIcons: Record<MediaPrePost, React.ReactNode> = {
  'Pre-conviction': <Scale className="h-3 w-3" />,
  'Post-conviction': <Gavel className="h-3 w-3" />,
  'Allegation': <MessageSquareWarning className="h-3 w-3" />,
};

const prePostColors: Record<MediaPrePost, string> = {
  'Pre-conviction': 'bg-status-possible/10 text-status-possible border-status-possible/30',
  'Post-conviction': 'bg-destructive/10 text-destructive border-destructive/30',
  'Allegation': 'bg-muted text-muted-foreground border-border',
};

const mediaRiskColors: Record<string, string> = {
  High: 'bg-destructive/10 text-destructive border-destructive/30',
  Medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  Low: 'bg-primary/10 text-primary border-primary/30',
  'No Risk': 'bg-muted text-muted-foreground border-border',
  Unknown: 'bg-muted text-muted-foreground border-border',
};

function fieldResultIcon(result: MatchFieldResult) {
  switch (result) {
    case 'match':    return <Check className="h-3.5 w-3.5 text-status-positive shrink-0" />;
    case 'partial':  return <HelpCircle className="h-3.5 w-3.5 text-status-possible shrink-0" />;
    case 'mismatch': return <XCircle className="h-3.5 w-3.5 text-status-unresolved shrink-0" />;
    default:         return <CircleOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

// ─── AI Recommendation (media-specific heuristic) ───────────

function computeMediaRecommendation(match: MediaMatch, articles: MediaArticle[]) {
  const highRisk = articles.filter(a => a.riskLevel === 'High').length;
  const postConv = articles.filter(a => a.prePost === 'Post-conviction').length;
  const allegations = articles.filter(a => a.prePost === 'Allegation').length;
  const matchIds = match.secondaryIds.filter(s => s.result === 'match').length;
  const mismatchIds = match.secondaryIds.filter(s => s.result === 'mismatch').length;

  const score = Math.min(100, Math.round(
    match.strength * 0.35
    + highRisk * 6
    + postConv * 8
    + matchIds * 8
    - mismatchIds * 12
    - allegations * 2
  ));

  let recommendedStatus: MatchStatus = 'Possible';
  let recommendedRisk: RiskLevel = 'Low';
  let headline = 'Review headlines before disposition';

  if (mismatchIds >= 2 && match.strength < 65) {
    recommendedStatus = 'False';
    recommendedRisk = 'None';
    headline = 'Likely False match — identifier mismatches';
  } else if (postConv >= 1 && matchIds >= 1 && match.strength >= 75) {
    recommendedStatus = 'Positive';
    recommendedRisk = highRisk > 0 ? 'High' : 'Medium';
    headline = 'Likely Positive — post-conviction coverage';
  } else if (highRisk >= 2 || postConv >= 1) {
    recommendedStatus = 'Possible';
    recommendedRisk = highRisk >= 2 ? 'High' : 'Medium';
    headline = 'Possible — corroborate secondary identifiers';
  } else if (allegations >= 2 && matchIds === 0) {
    recommendedStatus = 'Possible';
    recommendedRisk = 'Low';
    headline = 'Possible — allegations only, low corroboration';
  }

  const narrative = [
    `AI review of ${articles.length} article${articles.length === 1 ? '' : 's'}:`,
    `${postConv} post-conviction, ${allegations} allegation, ${highRisk} high-risk headline${highRisk === 1 ? '' : 's'}.`,
    `Secondary IDs: ${matchIds} match / ${mismatchIds} mismatch.`,
    `Match strength ${match.strength}%.`,
    `Recommendation: ${recommendedStatus} · ${recommendedRisk} risk.`,
  ].join(' ');

  return { score, recommendedStatus, recommendedRisk, headline, narrative };
}

// ─── Props ───────────────────────────────────────────────────

interface MediaMatchDrawerProps {
  match: MediaMatch | null;
  articles: MediaArticle[];
  open: boolean;
  onClose: () => void;
  caseName: string;
  onUpdate: (patch: Partial<MediaMatch> & { id: string }) => void;
  currentIndex?: number;
  totalMatches?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  defaultFullscreen?: boolean;
}

// ─── Component ──────────────────────────────────────────────

export function MediaMatchDrawer({
  match, articles, open, onClose, caseName, onUpdate,
  currentIndex, totalMatches, onNavigate, defaultFullscreen,
}: MediaMatchDrawerProps) {
  const [status, setStatus] = useState<MatchStatus>('False');
  const [risk, setRisk] = useState<RiskLevel>('None');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen ?? false);
  const [aiApplied, setAiApplied] = useState(false);

  const SECTIONS_KEY = 'media-match-drawer-sections';
  const defaultSections = { whyMatched: true, headlines: true, disposition: true };
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
      setStatus(match.status === 'Unresolved' ? 'False' : match.status);
      setRisk(match.riskLevel);
      setReason(match.reason || '');
      setComment('');
      setAiApplied(false);
      setIsFullscreen(defaultFullscreen ?? false);
    }
  }, [match?.id, defaultFullscreen, open]);

  if (!match) return null;

  const matchArticles = articles
    .filter(a => match.articleIds.includes(a.id))
    .sort((a, b) => new Date(b.publishedDate + 'T' + (b.publishedTime || '00:00')).getTime()
      - new Date(a.publishedDate + 'T' + (a.publishedTime || '00:00')).getTime());

  const rec = computeMediaRecommendation(match, matchArticles);
  const scoreColor = rec.score >= 75 ? 'text-status-unresolved'
    : rec.score >= 50 ? 'text-status-possible'
    : 'text-status-positive';

  const hasNavigation = onNavigate && totalMatches !== undefined && currentIndex !== undefined && totalMatches > 1;
  const hasPrev = hasNavigation && currentIndex! > 0;
  const hasNext = hasNavigation && currentIndex! < totalMatches! - 1;

  const applyAi = () => {
    setStatus(rec.recommendedStatus);
    setRisk(rec.recommendedRisk);
    setReason(rec.narrative);
    setAiApplied(true);
    setTimeout(() => setAiApplied(false), 2000);
  };

  const handleSave = () => {
    onUpdate({ id: match.id, status, riskLevel: risk, reason });
    onClose();
  };

  const prePostCounts: Record<string, number> = {};
  matchArticles.forEach(a => { prePostCounts[a.prePost] = (prePostCounts[a.prePost] || 0) + 1; });

  // ─── Header ────────────────────────────────────────────────

  const stickyHeader = (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold truncate leading-tight">{match.matchedName}</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{caseName}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <TooltipProvider>
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
              <span className="text-xs text-muted-foreground font-mono px-0.5">{(currentIndex ?? 0) + 1}/{totalMatches}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onNavigate!('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { if (isFullscreen) setIsFullscreen(false); onClose(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-2.5 flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] h-5">Adverse Media</Badge>
        <Badge variant="outline" className={`text-[10px] h-5 ${priorityColor(match.priorityLevel)}`}>
          {match.priorityLevel} priority
        </Badge>
        {match.status !== 'Unresolved' && (
          <Badge variant="outline" className={`text-[10px] h-5 border ${STATUS_COLORS[match.status]}`}>{match.status}</Badge>
        )}
        {match.riskLevel !== 'None' && (
          <Badge variant="outline" className={`text-[10px] h-5 border ${RISK_COLORS[match.riskLevel]}`}>{match.riskLevel} risk</Badge>
        )}
        {match.reviewRequired && (
          <Badge className="text-[10px] h-5 bg-status-possible/15 text-status-possible border-0 gap-1">
            <AlertTriangle className="h-2.5 w-2.5" /> Review required
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
          <Newspaper className="h-3 w-3" />
          <span><span className="font-semibold text-foreground">{matchArticles.length}</span> articles</span>
          <span className="tabular-nums">· {match.strength}% strength</span>
        </div>
      </div>
    </div>
  );

  // ─── Why matched ───────────────────────────────────────────

  const whyMatchedSection = (
    <div className="p-4 border-b">
      <Collapsible open={sectionOpen.whyMatched} onOpenChange={() => toggleSection('whyMatched')}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold w-full group mb-0">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>Why it matched</span>
            <ChevronsUpDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2.5 rounded-md border bg-primary/[0.02] overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/30 space-y-2">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Primary Name</p>
                <p className="text-xs font-medium flex items-center gap-2">
                  <Check className="h-3 w-3 text-status-positive" />
                  {match.matchedName}
                </p>
              </div>
              {match.aliases.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Aliases</p>
                  <div className="flex flex-wrap gap-1">
                    {match.aliases.map(a => (
                      <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="w-8 px-2 py-1.5"></th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Secondary Identifier</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-24">Result</th>
                </tr>
              </thead>
              <tbody>
                {match.secondaryIds.map(sid => (
                  <tr key={sid.label} className="border-b last:border-b-0">
                    <td className="px-2 py-2 text-center">{fieldResultIcon(sid.result)}</td>
                    <td className="px-3 py-2 font-medium">{sid.label}</td>
                    <td className="px-3 py-2 font-mono">{sid.value}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-semibold ${
                        sid.result === 'match' ? 'text-status-positive'
                        : sid.result === 'partial' ? 'text-status-possible'
                        : sid.result === 'mismatch' ? 'text-status-unresolved'
                        : 'text-muted-foreground'
                      }`}>
                        {sid.result === 'match' ? 'Match'
                          : sid.result === 'partial' ? 'Partial'
                          : sid.result === 'mismatch' ? 'Mismatch'
                          : 'Missing'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Headlines ─────────────────────────────────────────────

  const headlinesSection = (
    <div className="p-4 border-b">
      <Collapsible open={sectionOpen.headlines} onOpenChange={() => toggleSection('headlines')}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold w-full group mb-0">
            <Newspaper className="h-3.5 w-3.5 text-primary" />
            <span>Headlines ({matchArticles.length})</span>
            <div className="ml-auto flex items-center gap-1">
              {(Object.keys(prePostCounts) as MediaPrePost[]).map(pp => (
                <Badge key={pp} variant="outline" className={`text-[9px] gap-1 ${prePostColors[pp]}`}>
                  {prePostIcons[pp]} {pp.split('-')[0]} {prePostCounts[pp]}
                </Badge>
              ))}
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2.5">
            {matchArticles.map(a => (
              <div key={a.id} className="p-3 rounded-md border bg-card hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium leading-snug flex-1">{a.headline}</h4>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${prePostColors[a.prePost]}`}>
                      {prePostIcons[a.prePost]} {a.prePost}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${mediaRiskColors[a.riskLevel]}`}>
                      {a.riskLevel} risk
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.snippet}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground">{a.publication}</span>
                  <span>·</span>
                  <span>{a.publishedDate}{a.publishedTime ? ` ${a.publishedTime}` : ''}</span>
                  <span>·</span>
                  <span>{a.sourceType}</span>
                  {a.topics.slice(0, 2).map(t => (
                    <Badge key={t} variant="secondary" className="text-[9px] h-4 px-1">{t}</Badge>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6 ml-auto gap-1 text-[10px]">
                    <ExternalLink className="h-3 w-3" /> Read
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Disposition ───────────────────────────────────────────

  const dispositionSection = (
    <div className="p-4 border-b">
      <Collapsible open={sectionOpen.disposition} onOpenChange={() => toggleSection('disposition')}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-semibold w-full group mb-0">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span>{match.status === 'Unresolved' ? 'Resolve Match' : 'Update Resolution'}</span>
            <ChevronsUpDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-3">
            {/* AI recommendation */}
            <div className="rounded-md border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-2.5 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold leading-tight">AI Recommendation</div>
                <div className="text-[10px] text-muted-foreground leading-snug truncate">
                  {rec.headline} · <span className={scoreColor}>score {rec.score}/100</span>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant={aiApplied ? 'secondary' : 'default'}
                onClick={applyAi}
                className="h-7 text-[11px] gap-1 shrink-0"
              >
                {aiApplied ? <><Check className="h-3 w-3" /> Applied</> : <><Sparkles className="h-3 w-3" /> Apply</>}
              </Button>
            </div>

            {/* Status + Risk */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Status</Label>
                <div className="flex flex-col gap-1">
                  {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
                    <button key={s} onClick={() => setStatus(s)}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all border text-left flex items-center gap-1.5 ${
                        status === s ? `${STATUS_COLORS[s]} border-current` : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                      }`}>
                      {status === s && <Check className="h-3 w-3 shrink-0" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Risk Level</Label>
                <div className="flex flex-col gap-1">
                  {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                    <button key={r} onClick={() => setRisk(r)}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all border text-left flex items-center gap-1.5 ${
                        risk === r ? `${RISK_COLORS[r]} border-current` : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                      }`}>
                      {risk === r && <Check className="h-3 w-3 shrink-0" />}
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Reason</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder="Resolution rationale..." className="text-xs resize-none" />
            </div>

            {!showComment ? (
              <button onClick={() => setShowComment(true)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                + Add comment
              </button>
            ) : (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Review Comment</Label>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                  placeholder="Optional comment..." className="text-xs resize-none" />
              </div>
            )}

            <Button onClick={handleSave} className="w-full" size="sm" disabled={!reason.trim()}>
              <Check className="h-3.5 w-3.5" /> Save Resolution
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // ─── Layouts ───────────────────────────────────────────────

  const sidePanelContent = (
    <div className="flex flex-col">
      {stickyHeader}
      {whyMatchedSection}
      {dispositionSection}
      {headlinesSection}
    </div>
  );

  const fullscreenContent = (
    <div className="flex flex-col h-full">
      {stickyHeader}
      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_400px]">
        <div className="overflow-y-auto border-r">
          {whyMatchedSection}
          {headlinesSection}
        </div>
        <div className="overflow-y-auto flex flex-col">
          {dispositionSection}
        </div>
      </div>
    </div>
  );

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
