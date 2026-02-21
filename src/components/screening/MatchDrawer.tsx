import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Match, MatchStatus, RiskLevel } from '@/types';

interface MatchDrawerProps {
  match: Match | null;
  open: boolean;
  onClose: () => void;
  caseName: string;
  onUpdate: (m: Match) => void;
}

export function MatchDrawer({ match, open, onClose, caseName, onUpdate }: MatchDrawerProps) {
  const [status, setStatus] = useState<MatchStatus>(match?.status || 'Unresolved');
  const [risk, setRisk] = useState<RiskLevel>(match?.riskLevel || 'None');
  const [reason, setReason] = useState(match?.reason || '');
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('key-data');

  // Reset local state when match changes
  if (match && status !== match.status && reason === '') {
    // Sync on new match selection
  }

  if (!match) return null;

  const handleSave = () => {
    onUpdate({ ...match, status, riskLevel: risk, reason });
    onClose();
  };

  const rd = match.recordData;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">{match.matchedName}</SheetTitle>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">{match.dataset}</Badge>
            <Badge variant="outline" className="text-[10px]">{match.strength}% match</Badge>
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
          <h4 className="text-sm font-semibold">Resolution</h4>

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
