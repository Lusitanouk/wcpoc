import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, HelpCircle, XCircle, CircleOff, Clock, User, History, ChevronsUpDown, Maximize2, Minimize2, ExternalLink, FileText, Database, Download, ArrowDown } from 'lucide-react';
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

const fieldResultIcon = (result: string) => {
  switch (result) {
    case 'match': return <Check className="h-3 w-3 text-status-positive" />;
    case 'partial': return <HelpCircle className="h-3 w-3 text-status-possible" />;
    case 'mismatch': return <XCircle className="h-3 w-3 text-status-unresolved" />;
    default: return <CircleOff className="h-3 w-3 text-muted-foreground" />;
  }
};

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
}

export function MatchDrawer({ match, open, onClose, caseName, onUpdate, screeningData, currentIndex, totalMatches, onNavigate }: MatchDrawerProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MatchStatus>(match?.status || 'Unresolved');
  const [risk, setRisk] = useState<RiskLevel>(match?.riskLevel || 'None');
  const [reason, setReason] = useState(match?.reason || '');
  const [matchOutcome, setMatchOutcome] = useState('');
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('key-data');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (match) {
      setStatus(match.status);
      setRisk(match.riskLevel);
      setReason(match.reason);
      setComment('');
      setHistoryOpen(false);
    }
  }, [match?.id]);

  if (!match) return null;

  const handleSave = () => {
    onUpdate({ ...match, status, riskLevel: risk, reason });
    onClose();
  };

  const rd = match.recordData;
  const hasNavigation = onNavigate && totalMatches !== undefined && currentIndex !== undefined && totalMatches > 1;
  const hasPrev = hasNavigation && currentIndex > 0;
  const hasNext = hasNavigation && currentIndex < totalMatches - 1;
  const currentResolution = match.resolutionHistory.length > 0 ? match.resolutionHistory[0] : null;
  const olderHistory = match.resolutionHistory.slice(1);

  const hasScreeningData = screeningData && (screeningData.dob || screeningData.gender || screeningData.nationality || screeningData.country || screeningData.idType || screeningData.customFields);

  const drawerContent = (
    <div className={`${isFullscreen ? '' : 'overflow-y-auto h-full'}`}>
      {/* Header with match navigation */}
      <div className="p-6 pb-4 border-b">
        <div className="flex items-center justify-between gap-2">
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
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onNavigate!('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono">{currentIndex + 1}/{totalMatches}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onNavigate!('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{match.dataset}</Badge>
          <Badge variant="outline" className="text-[10px]">{match.strength}% {t('screening.strength').toLowerCase()}</Badge>
          <Badge variant="outline" className={`text-[10px] ${priorityColor(match.priorityLevel)}`}>
            {match.priorityLevel} {t('screening.priority')}
          </Badge>
          {match.updated && (
            <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0">{t('match.updated')}</Badge>
          )}
          {/* Quick provenance access */}
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
        {match.reviewRequired && match.reviewRequiredReasons.length > 0 && (
          <div className="mt-2 p-2 rounded bg-status-possible/10 text-xs">
            <span className="font-medium text-status-possible">{t('match.reviewRequired')}:</span>{' '}
            {match.reviewRequiredReasons.join(', ')}
          </div>
        )}
      </div>

      {/* Main content - use columns in fullscreen */}
      <div className={isFullscreen ? 'grid grid-cols-[1fr_360px] gap-0 h-[calc(100vh-120px)]' : ''}>
        <div className={isFullscreen ? 'overflow-y-auto border-r' : ''}>
          {/* ── Current Resolution (TOP) ── */}
          {match.status !== 'Unresolved' && currentResolution && (
            <div className="p-6 border-b">
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

          {/* ── Screening Profile (for resolution context) ── */}
          {hasScreeningData && (
            <div className="p-6 border-b">
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

          {/* Why it matched — enhanced comparison table */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold">{t('match.whyMatched')}</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => {
                        const el = document.getElementById('disposition-section');
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <ArrowDown className="h-3 w-3" /> Resolve or Review
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Jump to resolution &amp; review</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground italic mt-2">{match.matchStrengthExplanation}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {match.whyMatched.map((wf, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{wf.field}</Badge>
              ))}
            </div>
          </div>

          {/* What changed */}
          {match.reviewRequired && match.changeLog.length > 0 && (
            <div className="p-6 border-b">
              <h4 className="text-xs font-semibold text-status-possible mb-2">{t('match.whatChanged')}</h4>
              <div className="text-xs mb-2 text-muted-foreground">
                {match.reviewRequiredReasons.join(' · ')}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Field</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">From</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">To</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {match.changeLog.map((cl, i) => (
                    <tr key={i} className={`border-b border-dashed ${i === 0 ? 'bg-status-possible/5' : ''}`}>
                      <td className="py-1.5 font-medium">{cl.field}</td>
                      <td className="py-1.5 text-muted-foreground">{cl.from}</td>
                      <td className="py-1.5">{cl.to}</td>
                      <td className="py-1.5 text-muted-foreground">{cl.changedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Record Tabs */}
          <div className="p-6 border-b">
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

        {/* Resolution & Review Controls — in fullscreen this is a right sidebar */}
        <div id="disposition-section" className={`p-6 space-y-6 ${isFullscreen ? 'overflow-y-auto' : ''}`}>
          {/* ── Section 1: Resolve Match ── */}
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
              <div className="flex-1 min-w-0 space-y-1.5">
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
          </div>

          {/* ── Divider ── */}
          <div className="border-t" />

          {/* ── Section 2: Review ── */}
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

          <Button onClick={handleSave} className="w-full">{t('match.saveResolution')}</Button>
        </div>
      </div>
    </div>
  );

  // Fullscreen mode uses a Dialog instead of Sheet
  if (isFullscreen) {
    return (
      <>
        {/* Keep the sheet technically open but hidden so state is preserved */}
        <Sheet open={open} onOpenChange={v => { if (!v) { setIsFullscreen(false); onClose(); } }}>
          <SheetContent className="w-0 p-0 border-0 overflow-hidden">
            <SheetHeader className="sr-only"><SheetTitle>{match.matchedName}</SheetTitle></SheetHeader>
          </SheetContent>
        </Sheet>
        <Dialog open={open} onOpenChange={v => { if (!v) { setIsFullscreen(false); onClose(); } }}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 overflow-hidden">
            {drawerContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{match.matchedName}</SheetTitle>
        </SheetHeader>
        {drawerContent}
      </SheetContent>
    </Sheet>
  );
}
