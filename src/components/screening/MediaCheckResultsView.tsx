import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check, HelpCircle, XCircle, CircleOff, CircleDot, AlertTriangle, ChevronDown, ChevronRight,
  ChevronLeft, Filter, CheckSquare, Eye, X, Paperclip, ExternalLink, Newspaper, Gavel, Scale, MessageSquareWarning,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import FilterBar, { type FilterDefinition } from '@/components/FilterBar';
import { priorityColor } from '@/lib/priority';
import type { MediaCheckResult, MediaMatch, MediaArticle, MatchStatus, RiskLevel, MediaPrePost, MediaSecondaryId, MatchFieldResult } from '@/types';

interface MediaCheckResultsViewProps {
  result: MediaCheckResult;
  caseName: string;
  caseId: string;
}

const BUCKETS: MatchStatus[] = ['Unresolved', 'Positive', 'Possible', 'False', 'Unknown'];

const bucketIcons: Record<MatchStatus, React.ReactNode> = {
  Unresolved: <CircleDot className="h-3.5 w-3.5" />,
  Positive: <Check className="h-3.5 w-3.5" />,
  Possible: <HelpCircle className="h-3.5 w-3.5" />,
  False: <XCircle className="h-3.5 w-3.5" />,
  Unknown: <CircleOff className="h-3.5 w-3.5" />,
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

function strengthColor(s: number) {
  if (s >= 75) return 'bg-status-unresolved';
  if (s >= 50) return 'bg-status-possible';
  return 'bg-status-false';
}

function fieldResultIcon(result: MatchFieldResult) {
  switch (result) {
    case 'match': return <Check className="h-3 w-3 text-status-positive" />;
    case 'partial': return <HelpCircle className="h-3 w-3 text-status-possible" />;
    case 'mismatch': return <XCircle className="h-3 w-3 text-status-unresolved" />;
    default: return <CircleOff className="h-3 w-3 text-muted-foreground" />;
  }
}

export function MediaCheckResultsView({ result, caseName, caseId }: MediaCheckResultsViewProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mediaMatches, setMediaMatches] = useState<MediaMatch[]>(result.mediaMatches);

  // Bucket state
  const bucketCounts = useMemo(() => {
    const counts: Record<MatchStatus, number> = { Unresolved: 0, Positive: 0, Possible: 0, False: 0, Unknown: 0 };
    mediaMatches.forEach(m => { counts[m.status]++; });
    return counts;
  }, [mediaMatches]);

  const bucketHasReviewRequired = useMemo(() => {
    const map: Record<MatchStatus, boolean> = { Unresolved: false, Positive: false, Possible: false, False: false, Unknown: false };
    mediaMatches.forEach(m => { if (m.reviewRequired) map[m.status] = true; });
    return map;
  }, [mediaMatches]);

  const defaultBucket = useMemo(() => {
    const p = searchParams.get('mbucket');
    if (p) {
      const m = BUCKETS.find(b => b.toLowerCase() === p.toLowerCase());
      if (m) return m;
    }
    return bucketCounts.Unresolved > 0 ? 'Unresolved' : 'Positive';
  }, []);
  const [activeBucket, setActiveBucket] = useState<MatchStatus>(defaultBucket);
  const [hoveredBucket, setHoveredBucket] = useState<MatchStatus | null>(null);

  const changeBucket = (b: MatchStatus) => {
    setActiveBucket(b);
    setSelectedIds(new Set());
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('mbucket', b.toLowerCase());
      return next;
    }, { replace: true });
  };

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterPrePost, setFilterPrePost] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<'priority' | 'strength'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredMatches = useMemo(() => {
    return mediaMatches
      .filter(m => m.status === activeBucket)
      .filter(m => {
        if (filterPriority !== 'all' && m.priorityLevel !== filterPriority) return false;
        if (filterPrePost !== 'all') {
          const arts = result.articles.filter(a => m.articleIds.includes(a.id));
          if (!arts.some(a => a.prePost === filterPrePost)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortColumn === 'strength') return dir * (a.strength - b.strength);
        return dir * (a.priorityScore - b.priorityScore);
      });
  }, [mediaMatches, activeBucket, filterPriority, filterPrePost, sortColumn, sortDirection, result.articles]);

  const handleSort = (col: 'priority' | 'strength') => {
    if (sortColumn === col) setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortColumn(col); setSortDirection('desc'); }
  };
  const sortIndicator = (col: 'priority' | 'strength') => {
    if (sortColumn !== col) return <ChevronDown className="h-3 w-3 text-muted-foreground/40" />;
    return <ChevronDown className={`h-3 w-3 text-primary transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />;
  };

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = filteredMatches.length > 0 && filteredMatches.every(m => selectedIds.has(m.id));
  const someSelected = filteredMatches.some(m => selectedIds.has(m.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(filteredMatches.map(m => m.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectedCount = selectedIds.size;
  const selectedMatches = filteredMatches.filter(m => selectedIds.has(m.id));

  const selectionSummary = useMemo(() => {
    const byPriority: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    let reviewCount = 0;
    let totalArticles = 0;
    selectedMatches.forEach(m => {
      byPriority[m.priorityLevel] = (byPriority[m.priorityLevel] || 0) + 1;
      byRisk[m.riskLevel] = (byRisk[m.riskLevel] || 0) + 1;
      if (m.reviewRequired) reviewCount++;
      totalArticles += m.articleIds.length;
    });
    return { byPriority, byRisk, reviewCount, totalArticles };
  }, [selectedMatches]);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedRows(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // Drawer
  const [selectedMatch, setSelectedMatch] = useState<MediaMatch | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openMatch = (m: MediaMatch) => { setSelectedMatch(m); setDrawerOpen(true); };

  // Resolution controls (in drawer)
  const [resStatus, setResStatus] = useState<MatchStatus>('False');
  const [resRisk, setResRisk] = useState<RiskLevel>('None');
  const [resReason, setResReason] = useState('');
  useEffect(() => {
    if (selectedMatch) {
      setResStatus(selectedMatch.status === 'Unresolved' ? 'False' : selectedMatch.status);
      setResRisk(selectedMatch.riskLevel);
      setResReason(selectedMatch.reason || '');
    }
  }, [selectedMatch]);

  const saveResolution = () => {
    if (!selectedMatch) return;
    setMediaMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, status: resStatus, riskLevel: resRisk, reason: resReason } : m));
    setDrawerOpen(false);
  };

  // Bulk resolve
  const [bulkDialog, setBulkDialog] = useState<'resolve' | 'review' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<MatchStatus>('False');
  const [bulkRisk, setBulkRisk] = useState<RiskLevel>('None');
  const [bulkReason, setBulkReason] = useState('');
  const openBulk = (kind: 'resolve' | 'review') => {
    setBulkStatus('False'); setBulkRisk('None'); setBulkReason('');
    setBulkDialog(kind);
  };
  const handleBulkResolve = () => {
    setMediaMatches(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, status: bulkStatus, riskLevel: bulkRisk, reason: bulkReason } : m));
    setBulkDialog(null); setSelectedIds(new Set());
  };
  const handleBulkReview = () => {
    setMediaMatches(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, reviewRequired: false } : m));
    setBulkDialog(null); setSelectedIds(new Set());
  };

  // Sticky offsets
  const bucketRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [stickyOffsets, setStickyOffsets] = useState({ filter: 0, thead: 0 });
  useEffect(() => {
    const measure = () => {
      const bucketEl = bucketRef.current;
      const filterEl = filterRef.current;
      if (bucketEl) {
        const b = bucketEl.offsetHeight - 24;
        const fh = filterEl ? filterEl.offsetHeight + 16 : 0;
        setStickyOffsets({ filter: b, thead: b + fh });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mediaMatches, showFilters]);

  const filterDefs: FilterDefinition[] = [
    {
      key: 'priority', label: 'Priority', icon: <AlertTriangle className="h-3.5 w-3.5" />,
      options: [
        { value: 'all', label: 'All Priorities' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
      ],
      defaultValue: 'all',
    },
    {
      key: 'prePost', label: 'Pre/Post-conviction', icon: <Gavel className="h-3.5 w-3.5" />,
      options: [
        { value: 'all', label: 'All' },
        { value: 'Pre-conviction', label: 'Pre-conviction' },
        { value: 'Post-conviction', label: 'Post-conviction' },
        { value: 'Allegation', label: 'Allegation' },
      ],
      defaultValue: 'all',
    },
  ];

  const selectedArticles = selectedMatch
    ? result.articles
        .filter(a => selectedMatch.articleIds.includes(a.id))
        .sort((a, b) => new Date(b.publishedDate + 'T' + (b.publishedTime || '00:00')).getTime()
          - new Date(a.publishedDate + 'T' + (a.publishedTime || '00:00')).getTime())
    : [];

  return (
    <div>
      {/* Bucket tabs */}
      <div ref={bucketRef} className="mb-4 rounded-lg border bg-card sticky -top-6 z-20">
        <div className="flex gap-1 p-1">
          {BUCKETS.map(bucket => (
            <Tooltip key={bucket}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => changeBucket(bucket)}
                  onMouseEnter={() => setHoveredBucket(bucket)}
                  onMouseLeave={() => setHoveredBucket(null)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all border-b-2 ${
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
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden text-xs">{bucket}</TooltipContent>
            </Tooltip>
          ))}
          <div className="ml-auto flex items-center gap-1.5 pr-2">
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              className={`h-7 text-xs gap-1 ${showFilters ? 'ring-1 ring-primary/30' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {!showFilters && (filterPrePost !== 'all' || filterPriority !== 'all') && (
                <Badge className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">
                  {(filterPrePost !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>
        {/* Contextual stats */}
        {(() => {
          const statsBucket = hoveredBucket || activeBucket;
          const bMatches = mediaMatches.filter(m => m.status === statsBucket);
          const total = bMatches.length;
          const totalArticles = bMatches.reduce((s, m) => s + m.articleIds.length, 0);
          return (
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 border-t bg-muted/30 text-xs transition-all duration-200 ${hoveredBucket ? 'max-h-20 opacity-100 py-2' : 'max-h-0 overflow-hidden opacity-0'}`}>
              <span className="font-medium text-foreground">{total} {statsBucket.toLowerCase()}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground"><span className="text-foreground font-medium">{totalArticles}</span> articles</span>
            </div>
          );
        })()}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div ref={filterRef} className="flex items-center gap-2 mb-4 flex-wrap sticky z-20 bg-background py-2" style={{ top: `${stickyOffsets.filter}px` }}>
          <FilterBar
            filters={filterDefs}
            values={{ priority: filterPriority, prePost: filterPrePost }}
            onChange={(k, v) => { if (k === 'priority') setFilterPriority(v); if (k === 'prePost') setFilterPrePost(v); }}
            onClearAll={() => { setFilterPriority('all'); setFilterPrePost('all'); }}
          />
        </div>
      )}

      {/* Bulk bar (overlays thead) */}
      {selectedCount > 0 && (
        <div className="sticky z-40 h-0 overflow-visible" style={{ top: `${stickyOffsets.thead}px` }}>
          <div
            className="absolute left-12 right-2 top-1 flex items-center gap-2 px-3 h-10 rounded-md border border-primary/20 animate-fade-in shadow-sm"
            style={{ backgroundColor: 'color-mix(in srgb, hsl(var(--primary)) 10%, hsl(var(--background)))' }}
          >
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <div className="flex gap-1.5 ml-2">
              <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => openBulk('resolve')}>
                <Check className="h-3 w-3" /> Resolve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openBulk('review')}>
                <Eye className="h-3 w-3" /> Mark Reviewed
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-card sticky z-30" style={{ top: `${stickyOffsets.thead}px` }}>
              <th className="px-3 py-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className="h-4 w-4"
                  {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' } : {})}
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[250px]">Matched Name / Alias</th>
              <th
                className="text-left px-4 py-3 font-medium text-muted-foreground w-24 cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">Priority {sortIndicator('priority')}</div>
              </th>
              <th
                className="text-left px-4 py-3 font-medium text-muted-foreground w-36 cursor-pointer hover:text-foreground select-none"
                onClick={() => handleSort('strength')}
              >
                <div className="flex items-center gap-1">Strength {sortIndicator('strength')}</div>
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Articles</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Coverage</th>
              <th className="px-2 py-3 w-10"></th>
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
                const isExpanded = expandedRows.has(m.id);
                const arts = result.articles.filter(a => m.articleIds.includes(a.id));
                const prePostCounts: Record<string, number> = {};
                arts.forEach(a => { prePostCounts[a.prePost] = (prePostCounts[a.prePost] || 0) + 1; });
                return (
                  <React.Fragment key={m.id}>
                    <tr
                      className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${m.reviewRequired ? 'bg-status-possible/5' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => openMatch(m)}
                    >
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(m.id)} className="h-4 w-4" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                            onClick={e => { e.stopPropagation(); toggleExpand(m.id); }}
                          >
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                          <span className="font-medium hover:underline">{m.matchedName}</span>
                          {m.aliases.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">+{m.aliases.length} aliases</span>
                          )}
                          {m.reviewRequired && (
                            <Badge variant="secondary" className="text-[10px] bg-status-possible/15 text-status-possible border-0 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Review required
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] ${priorityColor(m.priorityLevel)}`}>{m.priorityLevel}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${strengthColor(m.strength)}`} style={{ width: `${m.strength}%` }} />
                          </div>
                          <span className="text-xs font-mono">{m.strength}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Newspaper className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{arts.length}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(Object.keys(prePostCounts) as MediaPrePost[]).map(pp => (
                            <Badge key={pp} variant="outline" className={`text-[10px] gap-1 ${prePostColors[pp]}`}>
                              {prePostIcons[pp]} {pp.split('-')[0]} {prePostCounts[pp]}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3" onClick={e => { e.stopPropagation(); openMatch(m); }}>
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="ml-6 space-y-2">
                            <p className="text-xs font-semibold">Why it matched</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 max-w-xl">
                              <div className="flex items-center gap-2 text-xs">
                                <Check className="h-3 w-3 text-status-positive" />
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium">{m.matchedName}</span>
                              </div>
                              {m.secondaryIds.map(sid => (
                                <div key={sid.label} className="flex items-center gap-2 text-xs">
                                  {fieldResultIcon(sid.result)}
                                  <span className="text-muted-foreground">{sid.label}:</span>
                                  <span className="font-medium truncate">{sid.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Match Drawer */}
      <Sheet open={drawerOpen} onOpenChange={v => !v && setDrawerOpen(false)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {selectedMatch && (
            <>
              <SheetHeader className="p-6 pb-4 border-b space-y-2">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg">{selectedMatch.matchedName}</SheetTitle>
                  <Badge variant="outline" className={`text-[10px] ${priorityColor(selectedMatch.priorityLevel)}`}>
                    {selectedMatch.priorityLevel} priority
                  </Badge>
                </div>
                <SheetDescription className="text-xs">
                  {selectedArticles.length} adverse media {selectedArticles.length === 1 ? 'article' : 'articles'} for case {caseName}
                </SheetDescription>
              </SheetHeader>

              {/* Why it matched — primary name, aliases, secondary IDs */}
              <div className="p-6 border-b space-y-4 bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why it matched</p>

                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">Primary Name</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-status-positive" />
                    {selectedMatch.matchedName}
                  </p>
                </div>

                {selectedMatch.aliases.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Aliases</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMatch.aliases.map(a => (
                        <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Secondary Identifiers</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {selectedMatch.secondaryIds.map(sid => (
                      <div key={sid.label} className="flex items-center gap-2 text-xs">
                        {fieldResultIcon(sid.result)}
                        <span className="text-muted-foreground">{sid.label}:</span>
                        <span className="font-medium truncate">{sid.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Headlines list */}
              <div className="p-6 border-b">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Headlines ({selectedArticles.length})
                </p>
                <div className="space-y-3">
                  {selectedArticles.map(a => (
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
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{a.publication}</span>
                        <span>·</span>
                        <span>{a.publishedDate}{a.publishedTime ? ` ${a.publishedTime}` : ''}</span>
                        <span>·</span>
                        <span>{a.sourceType}</span>
                        <Button variant="ghost" size="sm" className="h-6 ml-auto gap-1 text-[10px]">
                          <ExternalLink className="h-3 w-3" /> Read
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="p-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disposition</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={resStatus} onValueChange={v => setResStatus(v as MatchStatus)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['Positive', 'Possible', 'False', 'Unknown', 'Unresolved'] as MatchStatus[]).map(s => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Risk Level</Label>
                    <Select value={resRisk} onValueChange={v => setResRisk(v as RiskLevel)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                          <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason</Label>
                  <Textarea value={resReason} onChange={e => setResReason(e.target.value)} placeholder="Disposition rationale..." className="min-h-[60px] text-xs resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={saveResolution} disabled={!resReason.trim()}>Save Disposition</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk Resolve Sheet */}
      <Sheet open={bulkDialog === 'resolve'} onOpenChange={v => !v && setBulkDialog(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Resolve {selectedCount === 1 ? 'Match' : 'Matches'} — {selectedCount}</SheetTitle>
            <SheetDescription>Apply the same disposition to all selected matches.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={bulkStatus} onValueChange={v => setBulkStatus(v as MatchStatus)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]).map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Risk Level</Label>
              <Select value={bulkRisk} onValueChange={v => setBulkRisk(v as RiskLevel)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (required)</Label>
              <Textarea value={bulkReason} onChange={e => setBulkReason(e.target.value)} className="min-h-[60px] text-xs resize-none" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!bulkReason.trim()} onClick={handleBulkResolve}>Resolve {selectedCount}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk Review Sheet */}
      <Sheet open={bulkDialog === 'review'} onOpenChange={v => !v && setBulkDialog(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mark as Reviewed — {selectedCount}</SheetTitle>
            <SheetDescription>Confirm review of the selected matches.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Label className="text-xs">Comment (optional)</Label>
            <Textarea value={bulkReason} onChange={e => setBulkReason(e.target.value)} className="min-h-[60px] text-xs resize-none" />
          </div>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleBulkReview}>Confirm Reviewed</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
