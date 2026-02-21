import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, HelpCircle, XCircle, CircleOff, Clock, User, History, ChevronsUpDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { priorityColor } from '@/lib/priority';
import type { Match, MatchStatus, RiskLevel } from '@/types';

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
  // Navigation
  currentIndex?: number;
  totalMatches?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function MatchDrawer({ match, open, onClose, caseName, onUpdate, currentIndex, totalMatches, onNavigate }: MatchDrawerProps) {
  const [status, setStatus] = useState<MatchStatus>(match?.status || 'Unresolved');
  const [risk, setRisk] = useState<RiskLevel>(match?.riskLevel || 'None');
  const [reason, setReason] = useState(match?.reason || '');
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('key-data');
  const [historyOpen, setHistoryOpen] = useState(false);

  // Sync state when match changes (navigation)
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

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto p-0">
        {/* Header with match navigation */}
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base truncate">{match.matchedName}</SheetTitle>
            {hasNavigation && (
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasPrev} onClick={() => onNavigate!('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono">{currentIndex + 1}/{totalMatches}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!hasNext} onClick={() => onNavigate!('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">{match.dataset}</Badge>
            <Badge variant="outline" className="text-[10px]">{match.strength}% match</Badge>
            <Badge variant="outline" className={`text-[10px] ${priorityColor(match.priorityLevel)}`}>
              {match.priorityLevel} Priority
            </Badge>
            {match.updated && (
              <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0">Updated</Badge>
            )}
          </div>
          {match.reviewRequired && match.reviewRequiredReasons.length > 0 && (
            <div className="mt-2 p-2 rounded bg-status-possible/10 text-xs">
              <span className="font-medium text-status-possible">Review Required:</span>{' '}
              {match.reviewRequiredReasons.join(', ')}
            </div>
          )}
        </SheetHeader>

        {/* ── Current Resolution (TOP) ── */}
        {match.status !== 'Unresolved' && currentResolution && (
          <div className="p-6 border-b">
            <h4 className="text-xs font-semibold mb-2">Current Resolution</h4>
            <div className="p-3 rounded-md bg-muted/50 space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="font-medium">{currentResolution.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk:</span>{' '}
                  <span className="font-medium">{currentResolution.riskLevel}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Reason:</span>{' '}
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

            {/* Expandable Resolution History */}
            {olderHistory.length > 0 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-2">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                    <History className="h-3 w-3" />
                    <span>{olderHistory.length} previous decision{olderHistory.length > 1 ? 's' : ''}</span>
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

        {/* Why it matched */}
        <div className="p-6 border-b">
          <h4 className="text-xs font-semibold mb-2">Why it matched</h4>
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

        {/* What changed (for review required) */}
        {match.reviewRequired && match.changeLog.length > 0 && (
          <div className="p-6 border-b">
            <h4 className="text-xs font-semibold text-status-possible mb-2">What changed</h4>
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
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Submitted vs Matched</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Submitted</p>
              <p className="font-medium">{caseName}</p>
            </div>
            <div className="p-3 rounded bg-primary/5">
              <p className="text-xs text-muted-foreground mb-1">Matched</p>
              <p className="font-medium">{match.matchedName}</p>
            </div>
          </div>
        </div>

        {/* Record Tabs */}
        <div className="p-6 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start h-8 mb-3">
              <TabsTrigger value="key-data" className="text-xs">Key Data</TabsTrigger>
              <TabsTrigger value="further" className="text-xs">Further Info</TabsTrigger>
              <TabsTrigger value="aliases" className="text-xs">Aliases</TabsTrigger>
              <TabsTrigger value="keywords" className="text-xs">Keywords</TabsTrigger>
              {rd.pepRoleDetails && <TabsTrigger value="pep" className="text-xs">PEP Details</TabsTrigger>}
              <TabsTrigger value="connections" className="text-xs">Connections</TabsTrigger>
              <TabsTrigger value="sources" className="text-xs">Sources</TabsTrigger>
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
              <p className="text-sm leading-relaxed">{rd.furtherInfo}</p>
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
                <p className="text-sm text-muted-foreground">No known connections.</p>
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
              <ul className="space-y-1">
                {rd.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} className="text-sm text-primary hover:underline">{s.name}</a>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>

        {/* Resolution Controls */}
        <div className="p-6 space-y-4">
          <h4 className="text-sm font-semibold">{match.status === 'Unresolved' ? 'Resolution' : 'Update Resolution'}</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as MatchStatus)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Positive">Positive</SelectItem>
                  <SelectItem value="Possible">Possible</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                  <SelectItem value="Unresolved">Unresolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Risk Level</Label>
              <Select value={risk} onValueChange={v => setRisk(v as RiskLevel)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Reason</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="Resolution reason..."
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Review Comment</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder="Optional comment..."
              className="text-sm"
            />
          </div>

          <Button onClick={handleSave} className="w-full">Save Resolution</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
