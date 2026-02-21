import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, AlertTriangle, Eye, Filter, X, Check, HelpCircle, CircleDot, XCircle, CircleOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { MatchDrawer } from './MatchDrawer';
import { priorityColor } from '@/lib/priority';
import type { Match, CheckType, MatchStatus, Dataset } from '@/types';

interface ResultsViewProps {
  matches: Match[];
  caseName: string;
  caseId: string;
  checkTypes?: CheckType[];
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

export function ResultsView({ matches, caseName, caseId }: ResultsViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minStrength, setMinStrength] = useState(0);
  const [filterDataset, setFilterDataset] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

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

  // Default bucket from URL or auto-detect
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
    setSearchParams({ bucket: bucket.toLowerCase() }, { replace: true });
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
  const bySanctions = matches.filter(m => m.dataset === 'Sanctions').length;
  const byPep = matches.filter(m => m.dataset === 'PEP').length;
  const byLE = matches.filter(m => m.dataset === 'Law Enforcement').length;

  const openMatch = (m: Match) => {
    setSelectedMatch(m);
    setDrawerOpen(true);
  };

  const onUpdateMatch = (updated: Match) => {
    setSelectedMatch(updated);
  };

  return (
    <div>
      {/* Case Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {caseName}
          </h1>
          <p className="text-sm text-muted-foreground">Case ID: {caseId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Audit Trail</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <SummaryCard label="Total Matches" value={total} />
        <SummaryCard label="Unresolved" value={unresolved} accent="text-status-unresolved" />
        <SummaryCard label="Review Required" value={reviewReq} accent="text-status-possible" />
        <SummaryCard label="Sanctions" value={bySanctions} accent="text-dataset-sanctions" />
        <SummaryCard label="PEP" value={byPep} accent="text-dataset-pep" />
        <SummaryCard label="Law Enforcement" value={byLE} accent="text-dataset-le" />
      </div>

      {/* Resolution Buckets */}
      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg">
        {BUCKETS.map(bucket => (
          <button
            key={bucket}
            onClick={() => handleBucketChange(bucket)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              activeBucket === bucket
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            {bucketIcons[bucket]}
            {bucket}
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
              {bucketCounts[bucket]}
            </Badge>
            {bucketHasReviewRequired[bucket] && (
              <AlertTriangle className="h-3 w-3 text-status-possible" />
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-end mb-4">
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {(minStrength > 0 || filterDataset !== 'all' || filterPriority !== 'all') && (
            <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">!</Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Min Match Strength</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[minStrength]}
                    onValueChange={v => setMinStrength(v[0])}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8">{minStrength}%</span>
                </div>
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMinStrength(0); setFilterDataset('all'); setFilterPriority('all'); }}
                className="gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
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
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No matches in this bucket for the current filters.
                  </td>
                </tr>
              ) : (
                filteredMatches.map(m => (
                  <HoverCard key={m.id} openDelay={300} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <tr
                        onClick={() => openMatch(m)}
                        className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${
                          m.reviewRequired ? 'bg-status-possible/5' : ''
                        }`}
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && openMatch(m)}
                      >
                        <td className="px-4 py-3">
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
                          </div>
                          {m.aliases.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              aka: {m.aliases.slice(0, 2).join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] ${priorityColor(m.priorityLevel)}`}>
                            {m.priorityLevel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
                          <Badge className={`${datasetColors[m.dataset]} text-primary-foreground text-[10px] border-0`}>
                            {m.dataset}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {[m.identifiers.nationality, m.identifiers.dob, m.identifiers.gender]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Match Drawer */}
      <MatchDrawer
        match={selectedMatch}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        caseName={caseName}
        onUpdate={onUpdateMatch}
      />
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${accent || ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
