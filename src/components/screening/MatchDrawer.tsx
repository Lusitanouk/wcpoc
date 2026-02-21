import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, HelpCircle, XCircle, CircleOff, Clock, User, History, ChevronsUpDown, Maximize2, Minimize2, ExternalLink, FileText, Database } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const fieldResultIcon = (result: string) => {
  switch (result) {
    case 'match': return <Check className="h-3 w-3 text-status-positive" />;
    case 'partial': return <HelpCircle className="h-3 w-3 text-status-possible" />;
    case 'mismatch': return <XCircle className="h-3 w-3 text-status-unresolved" />;
    default: return <CircleOff className="h-3 w-3 text-muted-foreground" />;
  }
};

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
              <Collapsible defaultOpen>
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

          {/* Why it matched */}
          <div className="p-6 border-b">
            <h4 className="text-xs font-semibold mb-2">{t('match.whyMatched')}</h4>
            <ul className="space-y-1.5 mb-2">
              {match.whyMatched.map((wf, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  {fieldResultIcon(wf.result)}
                  <span className="font-medium w-20">{wf.field}</span>
                  <span className="text-muted-foreground">{wf.detail}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground italic mt-1">{match.matchStrengthExplanation}</p>
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

          {/* Comparison */}
          <div className="p-6 border-b">
            <h4 className="text-xs font-medium text-muted-foreground mb-3">{t('match.submittedVsMatched')}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded bg-muted">
                <p className="text-xs text-muted-foreground mb-1">{t('match.submitted')}</p>
                <p className="font-medium">{caseName}</p>
              </div>
              <div className="p-3 rounded bg-primary/5">
                <p className="text-xs text-muted-foreground mb-1">{t('match.matched')}</p>
                <p className="font-medium">{match.matchedName}</p>
              </div>
            </div>
          </div>

          {/* Record Tabs */}
          <div className="p-6 border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start h-8 mb-3 flex-wrap">
                <TabsTrigger value="key-data" className="text-xs">{t('match.keyData')}</TabsTrigger>
                <TabsTrigger value="further" className="text-xs">{t('match.furtherInfo')}</TabsTrigger>
                <TabsTrigger value="aliases" className="text-xs">{t('match.aliases')}</TabsTrigger>
                <TabsTrigger value="keywords" className="text-xs">{t('match.keywords')}</TabsTrigger>
                {rd.pepRoleDetails && <TabsTrigger value="pep" className="text-xs">{t('match.pepDetails')}</TabsTrigger>}
                <TabsTrigger value="connections" className="text-xs">{t('match.connections')}</TabsTrigger>
                <TabsTrigger value="sources" className="text-xs gap-1">
                  <Database className="h-3 w-3" />
                  {t('match.sources')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="key-data" className="space-y-2">
                {Object.entries(rd.keyData).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-1 border-b border-dashed">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="further">
                <div className={`text-sm leading-relaxed ${isFullscreen ? '' : 'max-h-64 overflow-y-auto'}`}>
                  <p>{rd.furtherInfo}</p>
                </div>
              </TabsContent>

              <TabsContent value="aliases">
                <div className="flex flex-wrap gap-2">
                  {rd.aliases.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}
                </div>
              </TabsContent>

              <TabsContent value="keywords">
                <div className="flex flex-wrap gap-2">
                  {rd.keywords.map((k, i) => <Badge key={i} variant="outline" className="text-xs">{k}</Badge>)}
                </div>
              </TabsContent>

              {rd.pepRoleDetails && (
                <TabsContent value="pep">
                  <p className="text-sm">{rd.pepRoleDetails}</p>
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

        {/* Resolution Controls — in fullscreen this is a right sidebar */}
        <div className={`p-6 space-y-4 ${isFullscreen ? 'overflow-y-auto' : ''}`}>
          <h4 className="text-sm font-semibold">
            {match.status === 'Unresolved' ? t('match.resolution') : t('match.updateResolution')}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{t('match.status')}</Label>
              <Select value={status} onValueChange={v => setStatus(v as MatchStatus)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Positive">{t('match.positive')}</SelectItem>
                  <SelectItem value="Possible">{t('match.possible')}</SelectItem>
                  <SelectItem value="False">{t('match.false')}</SelectItem>
                  <SelectItem value="Unknown">{t('match.unknown')}</SelectItem>
                  <SelectItem value="Unresolved">{t('match.unresolved')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t('match.riskLevel')}</Label>
              <Select value={risk} onValueChange={v => setRisk(v as RiskLevel)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">{t('match.high')}</SelectItem>
                  <SelectItem value="Medium">{t('match.medium')}</SelectItem>
                  <SelectItem value="Low">{t('match.low')}</SelectItem>
                  <SelectItem value="None">{t('match.none')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t('match.reason')}</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder={t('match.resolutionReason')}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t('match.reviewComment')}</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder={t('match.optionalComment')}
              className="text-sm"
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
