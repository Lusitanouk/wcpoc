import { useState, useMemo } from 'react';
import { Shield, AlertTriangle, Eye, Filter, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchDrawer } from './MatchDrawer';
import type { Match, CheckType, MatchStatus, Dataset } from '@/types';

interface ResultsViewProps {
  matches: Match[];
  caseName: string;
  caseId: string;
  checkTypes: CheckType[];
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

function strengthColor(s: number) {
  if (s >= 75) return 'bg-status-unresolved';
  if (s >= 50) return 'bg-status-possible';
  return 'bg-status-false';
}

export function ResultsView({ matches, caseName, caseId, checkTypes }: ResultsViewProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(checkTypes[0] || 'World-Check');
  const [showFilters, setShowFilters] = useState(false);
  const [minStrength, setMinStrength] = useState(0);
  const [filterDataset, setFilterDataset] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (m.checkType !== activeTab) return false;
      if (m.strength < minStrength) return false;
      if (filterDataset !== 'all' && m.dataset !== filterDataset) return false;
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      return true;
    });
  }, [matches, activeTab, minStrength, filterDataset, filterStatus]);

  const total = matches.length;
  const unresolved = matches.filter(m => m.status === 'Unresolved').length;
  const reviewReq = matches.filter(m => m.reviewRequired).length;
  const bySanctions = matches.filter(m => m.dataset === 'Sanctions').length;
  const byPep = matches.filter(m => m.dataset === 'PEP').length;
  const byLE = matches.filter(m => m.dataset === 'Law Enforcement').length;

  const openMatch = (m: Match) => {
    setSelectedMatch(m);
    setDrawerOpen(true);
  };

  const onUpdateMatch = (updated: Match) => {
    // In a real app, this would update state
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            {checkTypes.map(ct => (
              <TabsTrigger key={ct} value={ct}>{ct}</TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {(minStrength > 0 || filterDataset !== 'all' || filterStatus !== 'all') && (
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
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Unresolved">Unresolved</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                      <SelectItem value="Possible">Possible</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMinStrength(0); setFilterDataset('all'); setFilterStatus('all'); }}
                  className="gap-1"
                >
                  <X className="h-3 w-3" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {checkTypes.map(ct => (
          <TabsContent key={ct} value={ct}>
            {/* Matches Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Matched Name / Alias</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">Strength</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dataset</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Key Identifiers</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No matches found for the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredMatches.map(m => (
                        <tr
                          key={m.id}
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
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                m.status === 'Unresolved' ? 'border-status-unresolved text-status-unresolved' :
                                m.status === 'Positive' ? 'border-status-positive text-status-positive' :
                                m.status === 'Possible' ? 'border-status-possible text-status-possible' :
                                'border-muted-foreground text-muted-foreground'
                              }`}
                            >
                              {m.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

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
