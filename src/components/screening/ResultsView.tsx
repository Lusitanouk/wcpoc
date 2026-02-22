import { useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, Eye, X, Check, HelpCircle, CircleDot, XCircle, CircleOff, CheckSquare, Square, MinusSquare, Database, Flame, Settings2, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FilterBar, { type FilterDefinition } from '@/components/FilterBar';
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

const MATCH_COLUMNS = [
  { key: 'name', label: 'Matched Name / Alias', alwaysVisible: true },
  { key: 'priority', label: 'Priority' },
  { key: 'strength', label: 'Strength' },
  { key: 'dataset', label: 'Dataset' },
  { key: 'identifiers', label: 'Key Identifiers' },
] as const;

type MatchColumnKey = typeof MATCH_COLUMNS[number]['key'];
const DEFAULT_MATCH_COLUMNS: MatchColumnKey[] = ['name', 'priority', 'strength', 'dataset', 'identifiers'];

export function ResultsView({ matches, caseName, caseId, screeningData }: ResultsViewProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [filterDataset, setFilterDataset] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [visibleColumns, setVisibleColumns] = useState<MatchColumnKey[]>([...DEFAULT_MATCH_COLUMNS]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const toggleColumn = (key: MatchColumnKey) => {
    const col = MATCH_COLUMNS.find(c => c.key === key);
    if (col && 'alwaysVisible' in col && col.alwaysVisible) return;
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...visibleColumns];
    const draggedItem = items.splice(dragItem.current, 1)[0];
    items.splice(dragOverItem.current, 0, draggedItem);
    dragItem.current = null;
    dragOverItem.current = null;
    setVisibleColumns(items);
  };

  const isColVisible = (key: MatchColumnKey) => visibleColumns.includes(key);
  const visibleColCount = visibleColumns.length + 2; // +2 for checkbox and action columns

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
        if (filterDataset !== 'all' && m.dataset !== filterDataset) return false;
        if (filterPriority === 'High' && m.priorityLevel !== 'High') return false;
        if (filterPriority === 'sanctions-pep' && m.dataset !== 'Sanctions' && m.dataset !== 'PEP') return false;
        return true;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [matches, activeBucket, filterDataset, filterPriority]);

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

  

  const matchFilterDefs: FilterDefinition[] = [
    {
      key: 'dataset',
      label: 'Dataset',
      icon: <Database className="h-3.5 w-3.5" />,
      options: [
        { value: 'all', label: 'All Datasets' },
        { value: 'Sanctions', label: 'Sanctions' },
        { value: 'PEP', label: 'PEP' },
        { value: 'Law Enforcement', label: 'Law Enforcement' },
        { value: 'Other', label: 'Other' },
      ],
      defaultValue: 'all',
    },
    {
      key: 'priority',
      label: 'Priority',
      icon: <Flame className="h-3.5 w-3.5" />,
      options: [
        { value: 'all', label: 'All Priorities' },
        { value: 'High', label: 'High Priority Only' },
        { value: 'sanctions-pep', label: 'Sanctions/PEP Only' },
      ],
      defaultValue: 'all',
    },
  ];

  const matchFilterValues: Record<string, string> = {
    dataset: filterDataset,
    priority: filterPriority,
  };

  const handleMatchFilterChange = (key: string, value: string) => {
    if (key === 'dataset') setFilterDataset(value);
    if (key === 'priority') setFilterPriority(value);
  };

  const clearAllMatchFilters = () => {
    setFilterDataset('all');
    setFilterPriority('all');
  };

  return (
    <div>

      {/* Disposition Summary & Bucket Tabs */}
      <div className="mb-4 rounded-lg border bg-card">
        {/* Bucket tabs */}
        <div className="flex gap-1 p-1">
          {BUCKETS.map(bucket => (
            <Tooltip key={bucket}>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); handleBucketChange(bucket); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all border-b-2 ${
                    activeBucket === bucket
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
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
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden text-xs">{bucket}</TooltipContent>
            </Tooltip>
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

      <div className="flex items-center gap-2 mb-4 flex-wrap">
       <div className="flex items-center gap-2 flex-1 min-w-0">
          <FilterBar
            filters={matchFilterDefs}
            values={matchFilterValues}
            onChange={handleMatchFilterChange}
            onClearAll={clearAllMatchFilters}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Settings2 className="h-3.5 w-3.5" /> Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <p className="text-xs font-semibold mb-2">Show / Hide & Reorder</p>
              <div className="space-y-0.5 mb-2">
                {visibleColumns.map((key, index) => {
                  const col = MATCH_COLUMNS.find(c => c.key === key)!;
                  const isAlwaysVisible = 'alwaysVisible' in col && col.alwaysVisible;
                  return (
                    <div
                      key={col.key}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className="flex items-center gap-1.5 text-xs py-1 px-1 rounded-md hover:bg-muted/50 cursor-grab active:cursor-grabbing group"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleColumn(key)}
                        disabled={isAlwaysVisible}
                        className="shrink-0"
                      />
                      <span className="truncate">{col.label}</span>
                    </div>
                  );
                })}
              </div>
              {MATCH_COLUMNS.filter(c => !visibleColumns.includes(c.key)).length > 0 && (
                <div className="border-t pt-2 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Hidden</p>
                  {MATCH_COLUMNS.filter(c => !visibleColumns.includes(c.key)).map(col => (
                    <div key={col.key} className="flex items-center gap-1.5 text-xs py-1 px-1 rounded-md hover:bg-muted/50">
                      <div className="w-3" />
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => toggleColumn(col.key)}
                      />
                      <span className="truncate text-muted-foreground">{col.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <Button variant="ghost" size="sm" className="h-6 text-[11px] w-full" onClick={() => setVisibleColumns([...DEFAULT_MATCH_COLUMNS])}>
                  Reset to defaults
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-md bg-primary/10 border border-primary/20 animate-fade-in">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex gap-1.5 ml-2">
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => openBulkDialog('resolve')}>
              <Check className="h-3 w-3" /> Resolve {selectedCount === 1 ? 'Match' : 'Matches'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openBulkDialog('review')}>
              <Eye className="h-3 w-3" /> Review {selectedCount === 1 ? 'Match' : 'Matches'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <Card>

          {/* Table */}
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
                {visibleColumns.map(key => {
                  const col = MATCH_COLUMNS.find(c => c.key === key)!;
                  const widthClass = key === 'priority' ? 'w-20' : key === 'strength' ? 'w-32' : '';
                  return <th key={key} className={`text-left px-4 py-3 font-medium text-muted-foreground ${widthClass}`}>{col.label}</th>;
                })}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-4 py-12 text-center text-muted-foreground">
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
                          {visibleColumns.map(key => {
                            switch (key) {
                              case 'name':
                                return (
                                  <td key={key} className="px-4 py-3" onClick={() => openMatch(m)}>
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
                                );
                              case 'priority':
                                return (
                                  <td key={key} className="px-4 py-3" onClick={() => openMatch(m)}>
                                    <Badge variant="outline" className={`text-[10px] ${priorityColor(m.priorityLevel)}`}>
                                      {m.priorityLevel}
                                    </Badge>
                                  </td>
                                );
                              case 'strength':
                                return (
                                  <td key={key} className="px-4 py-3" onClick={() => openMatch(m)}>
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
                                );
                              case 'dataset':
                                return (
                                  <td key={key} className="px-4 py-3" onClick={() => openMatch(m)}>
                                    <Badge className={`${datasetColors[m.dataset]} text-primary-foreground text-[10px] border-0`} title={m.dataset}>
                                      {datasetInitials[m.dataset]}
                                    </Badge>
                                  </td>
                                );
                              case 'identifiers':
                                return (
                                  <td key={key} className="px-4 py-3 text-xs text-muted-foreground" onClick={() => openMatch(m)}>
                                    {[m.identifiers.nationality, m.identifiers.dob, m.identifiers.gender]
                                      .filter(Boolean)
                                      .join(' · ') || '—'}
                                  </td>
                                );
                              default:
                                return null;
                            }
                          })}
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
            <DialogTitle>Resolve {selectedCount === 1 ? 'Match' : 'Matches'} — {selectedCount}</DialogTitle>
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

          {/* Resolution controls — matches MatchDrawer disposition */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('match.resolution')}</h4>
            <div className="flex gap-4 items-start">
              <div className="space-y-1.5 shrink-0">
                <Label className="text-xs">{t('match.status')}</Label>
                <div className="flex flex-col gap-1">
                  {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setBulkStatus(s)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                        bulkStatus === s
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
                      onClick={() => setBulkRisk(r)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border text-left ${
                        bulkRisk === r
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
                <Label className="text-xs">{t('match.reason')}</Label>
                <Textarea
                  value={bulkReason}
                  onChange={e => setBulkReason(e.target.value)}
                  rows={3}
                  placeholder={t('match.resolutionReason')}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Review comment — matches MatchDrawer */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('match.reviewComment')}</h4>
            <Textarea
              value={bulkComment}
              onChange={e => setBulkComment(e.target.value)}
              rows={2}
              placeholder={t('match.optionalComment')}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!bulkReason.trim()} onClick={handleBulkResolve}>
              Resolve {selectedCount} {selectedCount === 1 ? 'Match' : 'Matches'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Review Dialog */}
      <Dialog open={bulkDialog === 'review'} onOpenChange={v => !v && setBulkDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review {selectedCount === 1 ? 'Match' : 'Matches'} — {selectedCount}</DialogTitle>
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
              Review {selectedCount} {selectedCount === 1 ? 'Match' : 'Matches'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
