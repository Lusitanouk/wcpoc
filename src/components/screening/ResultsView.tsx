import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, AlertTriangle, Eye, Filter, X, Check, HelpCircle, CircleDot, XCircle, CircleOff, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MatchDrawer } from './MatchDrawer';
import { priorityColor } from '@/lib/priority';
import type { Match, CheckType, MatchStatus, Dataset, RiskLevel, CaseScreeningData } from '@/types';

interface ResultsViewProps {
  matches: Match[];
  caseName: string;
  caseId: string;
  checkTypes?: CheckType[];
  screeningData?: CaseScreeningData;
}

const statusColors: Record<MatchStatus, string> = {
  Positive: 'bg-status-positive',
  Possible: 'bg-status-possible',
  False: 'bg-status-false',
  Unknown: 'bg-status-unknown',
  Unresolved: 'bg-status-unresolved',
};

const datasetColors: Record<Dataset, string> = {
  Sanctions: 'bg-dataset-sanctions',
  PEP: 'bg-dataset-pep',
  'Law Enforcement': 'bg-dataset-le',
  Other: 'bg-dataset-other',
};

const datasetInitials: Record<Dataset, string> = {
  Sanctions: 'S',
  PEP: 'PEP',
  'Law Enforcement': 'LE',
  Other: 'OT',
};

const bucketIcons: Record<MatchStatus, React.ReactNode> = {
  Unresolved: <CircleDot className="h-3.5 w-3.5" />,
  Positive: <Check className="h-3.5 w-3.5" />,
  Possible: <HelpCircle className="h-3.5 w-3.5" />,
  False: <XCircle className="h-3.5 w-3.5" />,
  Unknown: <CircleOff className="h-3.5 w-3.5" />,
};

const fieldResultIcon = (result: string) => {
  switch (result) {
    case 'match': return <Check className="h-3 w-3 text-status-positive" />;
    case 'partial': return <HelpCircle className="h-3 w-3 text-status-possible" />;
    case 'mismatch': return <XCircle className="h-3 w-3 text-status-unresolved" />;
    default: return <CircleOff className="h-3 w-3 text-muted-foreground" />;
  }
};

function strengthColor(s: number) {
  if (s >= 75) return 'bg-status-unresolved';
  if (s >= 50) return 'bg-status-possible';
  return 'bg-status-false';
}

const BUCKETS: MatchStatus[] = ['Unresolved', 'Positive', 'Possible', 'False', 'Unknown'];

export function ResultsView({ matches, caseName, caseId, screeningData }: ResultsViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [minStrength, setMinStrength] = useState(0);
  const [filterDataset, setFilterDataset] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<'resolve' | 'review' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<MatchStatus>('False');
  const [bulkRisk, setBulkRisk] = useState<RiskLevel>('None');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkComment, setBulkComment] = useState('');

  // Bucket counts
  const bucketCounts = useMemo(() => {
    const counts: Record<MatchStatus, number> = { Unresolved: 0, Positive: 0, Possible: 0, False: 0, Unknown: 0 };
    matches.forEach(m => { counts[m.status]++; });
    return counts;
  }, [matches]);

  const bucketHasReviewRequired = useMemo(() => {
    const map: Record<MatchStatus, boolean> = { Unresolved: false, Positive: false, Possible: false, False: false, Unknown: false };
    matches.forEach(m => { if (m.reviewRequired) map[m.status] = true; });
    return map;
  }, [matches]);

  const defaultBucket = useMemo(() => {
    const param = searchParams.get('bucket');
    if (param) {
      const mapped = BUCKETS.find(b => b.toLowerCase() === param.toLowerCase());
      if (mapped) return mapped;
    }
    if (bucketCounts.Unresolved > 0) return 'Unresolved';
    if (bucketCounts.Positive > 0) return 'Positive';
    return 'Unresolved';
  }, []);

  const [activeBucket, setActiveBucket] = useState<MatchStatus>(defaultBucket);

  const handleBucketChange = (bucket: MatchStatus) => {
    setActiveBucket(bucket);
    setSelectedIds(new Set());
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('bucket', bucket.toLowerCase());
      return next;
    }, { replace: true });
  };

  const filteredMatches = useMemo(() => {
    return matches
      .filter(m => {
        if (m.status !== activeBucket) return false;
        if (m.strength < minStrength) return false;
        if (filterDataset !== 'all' && m.dataset !== filterDataset) return false;
        if (filterPriority === 'High' && m.priorityLevel !== 'High') return false;
        if (filterPriority === 'sanctions-pep' && m.dataset !== 'Sanctions' && m.dataset !== 'PEP') return false;
        return true;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [matches, activeBucket, minStrength, filterDataset, filterPriority]);

  const total = matches.length;
  const unresolved = bucketCounts.Unresolved;
  const reviewReq = matches.filter(m => m.reviewRequired).length;

  const openMatch = (m: Match) => {
    setSelectedMatch(m);
    setDrawerOpen(true);
  };

  const onUpdateMatch = (updated: Match) => {
    setSelectedMatch(updated);
  };

  // Match navigation
  const selectedMatchIndex = selectedMatch ? filteredMatches.findIndex(m => m.id === selectedMatch.id) : -1;
  const navigateMatch = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? selectedMatchIndex - 1 : selectedMatchIndex + 1;
    if (newIndex >= 0 && newIndex < filteredMatches.length) {
      setSelectedMatch(filteredMatches[newIndex]);
    }
  };

  // Bulk selection helpers
  const allSelected = filteredMatches.length > 0 && filteredMatches.every(m => selectedIds.has(m.id));
  const someSelected = filteredMatches.some(m => selectedIds.has(m.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMatches.map(m => m.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const selectedMatches = filteredMatches.filter(m => selectedIds.has(m.id));

  const openBulkDialog = (type: 'resolve' | 'review') => {
    setBulkStatus('False');
    setBulkRisk('None');
    setBulkReason('');
    setBulkComment('');
    setBulkDialog(type);
  };

  const handleBulkResolve = () => {
    // In a real app this would persist; here we just close
    setBulkDialog(null);
    setSelectedIds(new Set());
  };

  const handleBulkReview = () => {
    setBulkDialog(null);
    setSelectedIds(new Set());
  };

  // Summary of selected for dialog
  const selectionSummary = useMemo(() => {
    const byDataset: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let reviewCount = 0;
    selectedMatches.forEach(m => {
      byDataset[m.dataset] = (byDataset[m.dataset] || 0) + 1;
      byPriority[m.priorityLevel] = (byPriority[m.priorityLevel] || 0) + 1;
      if (m.reviewRequired) reviewCount++;
    });
    return { byDataset, byPriority, reviewCount };
  }, [selectedMatches]);

  const activeFilterCount = (minStrength > 0 ? 1 : 0) + (filterDataset !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0);

  return (
    <div>

      {/* Disposition Summary & Bucket Tabs */}
      <div className="mb-4 rounded-lg border bg-card">
        {/* Bucket tabs */}
        <div className="flex gap-1 p-1">
          {BUCKETS.map(bucket => (
            <button
              key={bucket}
              onClick={(e) => { e.stopPropagation(); handleBucketChange(bucket); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                activeBucket === bucket
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {bucketIcons[bucket]}
              <span className="hidden sm:inline">{bucket}</span>
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                {bucketCounts[bucket]}
              </Badge>
              {bucketHasReviewRequired[bucket] && (
                <AlertTriangle className="h-3 w-3 text-status-possible" />
              )}
            </button>
          ))}
        </div>
        {/* Contextual stats row for active bucket */}
        {(() => {
          const bucketMatches = matches.filter(m => m.status === activeBucket);
          const bucketTotal = bucketMatches.length;
          const bucketReview = bucketMatches.filter(m => m.reviewRequired).length;
          const datasetCounts: Record<string, number> = {};
          bucketMatches.forEach(m => { datasetCounts[m.dataset] = (datasetCounts[m.dataset] || 0) + 1; });
          const riskCounts: Record<string, number> = {};
          bucketMatches.forEach(m => { riskCounts[m.riskLevel] = (riskCounts[m.riskLevel] || 0) + 1; });
          return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-t bg-muted/30 text-xs">
              <span className="font-medium text-foreground">{bucketTotal} {activeBucket.toLowerCase()}</span>
              {Object.keys(datasetCounts).length > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {Object.entries(datasetCounts).map(([ds, count], i) => (
                      <span key={ds}>{i > 0 ? ', ' : ''}<span className="text-foreground font-medium">{count}</span> {ds}</span>
                    ))}
                  </span>
                </>
              )}
              {Object.entries(riskCounts).filter(([level]) => level !== 'None').length > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {Object.entries(riskCounts).filter(([level]) => level !== 'None').map(([level, count], i) => (
                      <span key={level}>
                        {i > 0 ? ', ' : ''}
                        <span className={`font-medium ${level === 'High' ? 'text-destructive' : level === 'Medium' ? 'text-amber-600' : 'text-foreground'}`}>{count}</span>
                        {' '}{level} risk
                      </span>
                    ))}
                  </span>
                </>
              )}
              {bucketReview > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-status-possible font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {bucketReview} review required
                  </span>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Bulk Action Bar / Export */}
      <div className="flex items-center justify-between mb-4 gap-2">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 flex-1 animate-fade-in">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <div className="flex gap-1.5 ml-2">
              <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => openBulkDialog('resolve')}>
                <Check className="h-3 w-3" /> Bulk Resolve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openBulkDialog('review')}>
                <Eye className="h-3 w-3" /> Mark Reviewed
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : <div />}
      </div>

      <div className={`grid gap-4 ${showFilters ? 'grid-cols-[220px_1fr]' : 'grid-cols-1'}`}>
        {/* Left Filter Sidebar */}
        {showFilters && (
          <Card className="h-fit sticky top-4 animate-fade-in">
            <CardContent className="p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</h3>
                <div className="flex items-center gap-1">
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-0.5" onClick={() => { setMinStrength(0); setFilterDataset('all'); setFilterPriority('all'); }}>
                      <X className="h-2.5 w-2.5" /> Clear
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowFilters(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Match Strength</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[minStrength]}
                    onValueChange={v => setMinStrength(v[0])}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">{minStrength}%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Dataset</label>
                <Select value={filterDataset} onValueChange={setFilterDataset}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Datasets</SelectItem>
                    <SelectItem value="Sanctions">Sanctions</SelectItem>
                    <SelectItem value="PEP">PEP</SelectItem>
                    <SelectItem value="Law Enforcement">Law Enforcement</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="High">High Priority Only</SelectItem>
                    <SelectItem value="sanctions-pep">Sanctions/PEP Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active filter chips */}
              {activeFilterCount > 0 && (
                <div className="pt-3 border-t space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Active</p>
                  <div className="flex flex-wrap gap-1">
                    {minStrength > 0 && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        ≥{minStrength}%
                        <button onClick={() => setMinStrength(0)}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                    {filterDataset !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        {filterDataset}
                        <button onClick={() => setFilterDataset('all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                    {filterPriority !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        {filterPriority}
                        <button onClick={() => setFilterPriority('all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Matches Table */}
        <Card>
        {!showFilters && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(true)}
              className="gap-1.5 h-7 text-xs"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className="h-4 w-4"
                    {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' } : {})}
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Matched Name / Alias</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">Strength</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dataset</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Key Identifiers</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No matches in this bucket for the current filters.
                  </td>
                </tr>
              ) : (
                filteredMatches.map(m => {
                  const isSelected = selectedIds.has(m.id);
                  return (
                    <HoverCard key={m.id} openDelay={300} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <tr
                          className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${
                            m.reviewRequired ? 'bg-status-possible/5' : ''
                          } ${isSelected ? 'bg-primary/5' : ''}`}
                          tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' && openMatch(m)}
                        >
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleOne(m.id)}
                              aria-label={`Select ${m.matchedName}`}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3" onClick={() => openMatch(m)}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{m.matchedName}</span>
                              {m.updated && (
                                <Badge variant="secondary" className="text-[10px] bg-status-possible/15 text-status-possible border-0">
                                  Updated
                                </Badge>
                              )}
                              {m.reviewRequired && (
                                <AlertTriangle className="h-3.5 w-3.5 text-status-possible" />
                              )}
                              {m.resolutionHistory.length > 1 && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                                  {m.resolutionHistory.length} reviews
                                </Badge>
                              )}
                            </div>
                            {m.aliases.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                aka: {m.aliases.slice(0, 2).join(', ')}
                              </p>
                            )}
                            {m.status !== 'Unresolved' && m.resolutionHistory.length > 0 && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[300px]" title={m.resolutionHistory[0].reason}>
                                {m.resolutionHistory[0].author}: {m.resolutionHistory[0].reason}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={() => openMatch(m)}>
                            <Badge variant="outline" className={`text-[10px] ${priorityColor(m.priorityLevel)}`}>
                              {m.priorityLevel}
                            </Badge>
                          </td>
                          <td className="px-4 py-3" onClick={() => openMatch(m)}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${strengthColor(m.strength)}`}
                                  style={{ width: `${m.strength}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono">{m.strength}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3" onClick={() => openMatch(m)}>
                            <Badge className={`${datasetColors[m.dataset]} text-primary-foreground text-[10px] border-0`} title={m.dataset}>
                              {datasetInitials[m.dataset]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground" onClick={() => openMatch(m)}>
                            {[m.identifiers.nationality, m.identifiers.dob, m.identifiers.gender]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </td>
                          <td className="px-4 py-3" onClick={() => openMatch(m)}>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </td>
                        </tr>
                      </HoverCardTrigger>
                      <HoverCardContent side="left" className="w-72 p-3">
                        <p className="text-xs font-semibold mb-2">Why it matched</p>
                        <ul className="space-y-1 mb-2">
                          {m.whyMatched.map((wf, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs">
                              {fieldResultIcon(wf.result)}
                              <span className="text-muted-foreground">{wf.field}:</span>
                              <span>{wf.detail}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-muted-foreground italic">{m.matchStrengthExplanation}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.whyMatched.map((wf, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{wf.field}</Badge>
                          ))}
                        </div>
                        {m.reviewRequired && m.changeLog.length > 0 && (
                          <div className="mt-3 pt-2 border-t">
                            <p className="text-[10px] font-semibold text-status-possible mb-1">What changed</p>
                            {m.changeLog.slice(0, 2).map((cl, i) => (
                              <p key={i} className="text-[10px] text-muted-foreground">
                                {cl.field}: {cl.from} → {cl.to}
                              </p>
                            ))}
                          </div>
                        )}
                      </HoverCardContent>
                    </HoverCard>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </div>

      {/* Match Drawer */}
      <MatchDrawer
        match={selectedMatch}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        caseName={caseName}
        onUpdate={onUpdateMatch}
        screeningData={screeningData}
        currentIndex={selectedMatchIndex >= 0 ? selectedMatchIndex : undefined}
        totalMatches={filteredMatches.length}
        onNavigate={navigateMatch}
      />

      {/* Bulk Resolve Dialog */}
      <Dialog open={bulkDialog === 'resolve'} onOpenChange={v => !v && setBulkDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Resolve — {selectedCount} Matches</DialogTitle>
            <DialogDescription>Apply the same resolution status to all selected matches.</DialogDescription>
          </DialogHeader>

          {/* Selection summary */}
          <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1.5">
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectionSummary.byDataset).map(([ds, count]) => (
                <Badge key={ds} variant="secondary" className="text-[10px]">{ds}: {count}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectionSummary.byPriority).map(([p, count]) => (
                <Badge key={p} variant="outline" className="text-[10px]">{p} priority: {count}</Badge>
              ))}
            </div>
            {selectionSummary.reviewCount > 0 && (
              <div className="flex items-center gap-1 text-status-possible">
                <AlertTriangle className="h-3 w-3" />
                <span>{selectionSummary.reviewCount} require review</span>
              </div>
            )}
          </div>

          {/* Matches being resolved */}
          <div className="max-h-40 overflow-y-auto border rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 sticky top-0">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Strength</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Dataset</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Current</th>
                </tr>
              </thead>
              <tbody>
                {selectedMatches.map(m => (
                  <tr key={m.id} className="border-b">
                    <td className="px-3 py-1.5 font-medium">{m.matchedName}</td>
                    <td className="px-3 py-1.5 font-mono">{m.strength}%</td>
                    <td className="px-3 py-1.5"><Badge className={`${datasetColors[m.dataset]} text-primary-foreground text-[9px] border-0`} title={m.dataset}>{datasetInitials[m.dataset]}</Badge></td>
                    <td className="px-3 py-1.5 text-muted-foreground">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resolution: Status | Risk Level | Reason + Comment */}
          <div className="flex gap-4 items-start">
            <div className="space-y-1.5 shrink-0">
              <Label className="text-xs">Status</Label>
              <div className="flex flex-col gap-1">
                {(['Positive', 'Possible', 'False', 'Unknown', 'Unresolved'] as MatchStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setBulkStatus(s)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                      bulkStatus === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 shrink-0">
              <Label className="text-xs">Risk Level</Label>
              <div className="flex flex-col gap-1">
                {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setBulkRisk(r)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                      bulkRisk === r
                        ? r === 'High' ? 'bg-destructive text-destructive-foreground border-destructive'
                          : r === 'Medium' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Reason (required)</Label>
                <Textarea
                  value={bulkReason}
                  onChange={e => setBulkReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for bulk resolution..."
                  className="text-xs resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comment (optional)</Label>
                <Textarea
                  value={bulkComment}
                  onChange={e => setBulkComment(e.target.value)}
                  rows={2}
                  placeholder="Additional comment..."
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!bulkReason.trim()} onClick={handleBulkResolve}>
              Resolve {selectedCount} Matches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Review Dialog */}
      <Dialog open={bulkDialog === 'review'} onOpenChange={v => !v && setBulkDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Reviewed — {selectedCount} Matches</DialogTitle>
            <DialogDescription>Confirm that the selected matches have been reviewed. Their status will remain unchanged.</DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1.5">
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectionSummary.byDataset).map(([ds, count]) => (
                <Badge key={ds} variant="secondary" className="text-[10px]">{ds}: {count}</Badge>
              ))}
            </div>
            {selectionSummary.reviewCount > 0 && (
              <div className="flex items-center gap-1 text-status-possible">
                <AlertTriangle className="h-3 w-3" />
                <span>{selectionSummary.reviewCount} flagged for review</span>
              </div>
            )}
          </div>

          <div className="max-h-32 overflow-y-auto border rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 sticky top-0">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Strength</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedMatches.map(m => (
                  <tr key={m.id} className="border-b">
                    <td className="px-3 py-1.5 font-medium">{m.matchedName}</td>
                    <td className="px-3 py-1.5 font-mono">{m.strength}%</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Review Comment (optional)</Label>
            <Textarea
              value={bulkComment}
              onChange={e => setBulkComment(e.target.value)}
              rows={2}
              placeholder="Review notes..."
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleBulkReview}>
              Confirm Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
