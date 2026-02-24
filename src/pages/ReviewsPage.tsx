import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, ChevronDown, ChevronRight, ArrowUpDown, Calendar, Layers, BarChart3, Filter, Settings2, GripVertical, Check, Eye, X, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveTabsTrigger } from '@/components/ui/responsive-tabs-trigger';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cases, allMatches, getCaseById } from '@/data/mock-data';
import { priorityColor } from '@/lib/priority';
import FilterBar, { type FilterDefinition } from '@/components/FilterBar';
import type { Match, PriorityLevel, MatchStatus, RiskLevel } from '@/types';

function alertAgeDays(m: Match): number {
  const ref = m.reviewRequired && m.reviewRequiredAt ? m.reviewRequiredAt : m.alertDate;
  const diff = Date.now() - new Date(ref).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function ageLabel(days: number): string {
  if (days > 30) return '30+ days';
  if (days >= 14) return '14–30 days';
  if (days >= 7) return '7–13 days';
  return '< 7 days';
}

function ageBadgeClass(days: number): string {
  if (days > 30) return 'border-status-unresolved text-status-unresolved';
  if (days >= 14) return 'border-status-possible text-status-possible';
  return 'border-muted-foreground text-muted-foreground';
}

type SortKey = 'priority' | 'age' | 'strength';

interface CaseAlertGroup {
  caseId: string;
  caseName: string;
  alerts: Match[];
  highestPriority: PriorityLevel;
  oldestAge: number;
}

const FILTER_DEFS: FilterDefinition[] = [
  {
    key: 'priority', label: 'Priority', icon: <AlertTriangle className="h-3 w-3" />, defaultValue: 'all',
    options: [{ value: 'all', label: 'All Priorities' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }],
  },
  {
    key: 'age', label: 'Age', icon: <Calendar className="h-3 w-3" />, defaultValue: 'all',
    options: [{ value: 'all', label: 'All Ages' }, { value: '30+', label: '30+ days' }, { value: '14-30', label: '14–30 days' }, { value: '7-13', label: '7–13 days' }, { value: '<7', label: '< 7 days' }],
  },
  {
    key: 'sort', label: 'Sort by', icon: <ArrowUpDown className="h-3 w-3" />, defaultValue: 'priority',
    options: [{ value: 'priority', label: 'Priority' }, { value: 'age', label: 'Age' }, { value: 'strength', label: 'Strength' }],
  },
];
const ALERT_COLUMNS = [
  { key: 'case', label: 'Case', alwaysVisible: true },
  { key: 'matchedName', label: 'Matched Name' },
  { key: 'priority', label: 'Priority' },
  { key: 'age', label: 'Age' },
  { key: 'strength', label: 'Strength' },
  { key: 'dataset', label: 'Dataset' },
] as const;
type AlertColumnKey = typeof ALERT_COLUMNS[number]['key'];
const DEFAULT_ALERT_COLUMNS: AlertColumnKey[] = ['case', 'matchedName', 'priority', 'age', 'strength', 'dataset'];

export default function AlertsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState('unresolved');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ priority: 'all', age: 'all', sort: 'priority' });
  const [groupByCase, setGroupByCase] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [visibleAlertCols, setVisibleAlertCols] = useState<AlertColumnKey[]>([...DEFAULT_ALERT_COLUMNS]);
  const alertDragItem = useRef<number | null>(null);
  const alertDragOverItem = useRef<number | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<'resolve' | 'review' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<MatchStatus>('False');
  const [bulkRisk, setBulkRisk] = useState<RiskLevel>('None');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkComment, setBulkComment] = useState('');

  const toggleAlertCol = (key: AlertColumnKey) => {
    const col = ALERT_COLUMNS.find(c => c.key === key);
    if (col && 'alwaysVisible' in col && col.alwaysVisible) return;
    setVisibleAlertCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const handleAlertDragStart = (i: number) => { alertDragItem.current = i; };
  const handleAlertDragEnter = (i: number) => { alertDragOverItem.current = i; };
  const handleAlertDragEnd = () => {
    if (alertDragItem.current === null || alertDragOverItem.current === null) return;
    const items = [...visibleAlertCols];
    const dragged = items.splice(alertDragItem.current, 1)[0];
    items.splice(alertDragOverItem.current, 0, dragged);
    alertDragItem.current = null;
    alertDragOverItem.current = null;
    setVisibleAlertCols(items);
  };
  const isAlertCol = (key: AlertColumnKey) => visibleAlertCols.includes(key);

  const priorityFilter = filterValues.priority || 'all';
  const ageFilter = filterValues.age || 'all';
  const sortBy = (filterValues.sort || 'priority') as SortKey;

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const filterAndSort = (list: Match[]) => {
    return list
      .filter(m => priorityFilter === 'all' || m.priorityLevel === priorityFilter)
      .filter(m => {
        if (ageFilter === 'all') return true;
        const days = alertAgeDays(m);
        if (ageFilter === '30+') return days > 30;
        if (ageFilter === '14-30') return days >= 14 && days <= 30;
        if (ageFilter === '7-13') return days >= 7 && days <= 13;
        if (ageFilter === '<7') return days < 7;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return b.priorityScore - a.priorityScore;
        if (sortBy === 'age') return alertAgeDays(b) - alertAgeDays(a);
        return b.strength - a.strength;
      });
  };

  const unresolvedMatches = useMemo(() =>
    filterAndSort(allMatches.filter(m => m.status === 'Unresolved')),
    [priorityFilter, ageFilter, sortBy]
  );

  const reviewRequiredMatches = useMemo(() =>
    filterAndSort(allMatches.filter(m => m.reviewRequired)),
    [priorityFilter, ageFilter, sortBy]
  );

  const activeList = tab === 'unresolved' ? unresolvedMatches : reviewRequiredMatches;

  const caseGroups = useMemo((): CaseAlertGroup[] => {
    const map = new Map<string, Match[]>();
    activeList.forEach(m => {
      const arr = map.get(m.caseId) || [];
      arr.push(m);
      map.set(m.caseId, arr);
    });
    const groups: CaseAlertGroup[] = [];
    map.forEach((alerts, caseId) => {
      const c = getCaseById(caseId);
      const priorityOrder: PriorityLevel[] = ['High', 'Medium', 'Low'];
      const highestPriority = priorityOrder.find(p => alerts.some(a => a.priorityLevel === p)) || 'Low';
      groups.push({ caseId, caseName: c?.name || caseId, alerts, highestPriority, oldestAge: Math.max(...alerts.map(alertAgeDays)) });
    });
    groups.sort((a, b) => {
      if (sortBy === 'age') return b.oldestAge - a.oldestAge;
      return Math.max(...b.alerts.map(x => x.priorityScore)) - Math.max(...a.alerts.map(x => x.priorityScore));
    });
    return groups;
  }, [activeList, sortBy]);

  const multiAlertCaseCount = caseGroups.filter(g => g.alerts.length > 1).length;
  const highCount = activeList.filter(m => m.priorityLevel === 'High').length;
  const aged30 = activeList.filter(m => alertAgeDays(m) > 30).length;

  const toggleExpanded = (caseId: string) => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      next.has(caseId) ? next.delete(caseId) : next.add(caseId);
      return next;
    });
  };

  const activeFilterCount = Object.entries(filterValues).filter(([k, v]) => {
    const def = FILTER_DEFS.find(f => f.key === k);
    return def && v !== def.defaultValue;
  }).length;

  // Bulk selection helpers
  const allSelected = activeList.length > 0 && activeList.every(m => selectedIds.has(m.id));
  const someSelected = activeList.some(m => selectedIds.has(m.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeList.map(m => m.id)));
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
  const selectedMatches = activeList.filter(m => selectedIds.has(m.id));

  const openBulkDialog = (type: 'resolve' | 'review') => {
    setBulkStatus('False');
    setBulkRisk('None');
    setBulkReason('');
    setBulkComment('');
    setBulkDialog(type);
  };

  const handleBulkResolve = () => {
    setBulkDialog(null);
    setSelectedIds(new Set());
  };

  const handleBulkReview = () => {
    setBulkDialog(null);
    setSelectedIds(new Set());
  };

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

  // Clear selection on tab change
  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSelectedIds(new Set());
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Alerts
        </h1>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            className={`h-8 text-xs gap-1 ${showFilters ? 'ring-1 ring-primary/30' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {!showFilters && activeFilterCount > 0 && <Badge className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">{activeFilterCount}</Badge>}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Settings2 className="h-3.5 w-3.5" /> Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <p className="text-xs font-semibold mb-2">Show / Hide & Reorder</p>
              <div className="space-y-0.5 mb-2">
                {visibleAlertCols.map((key, index) => {
                  const col = ALERT_COLUMNS.find(c => c.key === key)!;
                  const isAlwaysVisible = 'alwaysVisible' in col && col.alwaysVisible;
                  return (
                    <div
                      key={col.key}
                      draggable
                      onDragStart={() => handleAlertDragStart(index)}
                      onDragEnter={() => handleAlertDragEnter(index)}
                      onDragEnd={handleAlertDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className="flex items-center gap-1.5 text-xs py-1 px-1 rounded-md hover:bg-muted/50 cursor-grab active:cursor-grabbing group"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                      <Checkbox checked={true} onCheckedChange={() => toggleAlertCol(key)} disabled={isAlwaysVisible} className="shrink-0" />
                      <span className="truncate">{col.label}</span>
                    </div>
                  );
                })}
              </div>
              {ALERT_COLUMNS.filter(c => !visibleAlertCols.includes(c.key)).length > 0 && (
                <div className="border-t pt-2 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Hidden</p>
                  {ALERT_COLUMNS.filter(c => !visibleAlertCols.includes(c.key)).map(col => (
                    <div key={col.key} className="flex items-center gap-1.5 text-xs py-1 px-1 rounded-md hover:bg-muted/50">
                      <div className="w-3" />
                      <Checkbox checked={false} onCheckedChange={() => toggleAlertCol(col.key)} />
                      <span className="truncate text-muted-foreground">{col.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <Button variant="ghost" size="sm" className="h-6 text-[11px] w-full" onClick={() => setVisibleAlertCols([...DEFAULT_ALERT_COLUMNS])}>
                  Reset to defaults
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant={groupByCase ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setGroupByCase(!groupByCase)}
          >
            <Layers className="h-3.5 w-3.5" />
            Group by Case
          </Button>
        </div>

        {showFilters && (
          <div className="w-full">
            <FilterBar
              filters={FILTER_DEFS}
              values={filterValues}
              onChange={handleFilterChange}
              onClearAll={() => setFilterValues({ priority: 'all', age: 'all', sort: 'priority' })}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unresolved</p><p className="text-2xl font-bold text-status-unresolved mt-1">{allMatches.filter(m => m.status === 'Unresolved').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Review Required</p><p className="text-2xl font-bold text-status-possible mt-1">{allMatches.filter(m => m.reviewRequired).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">High Priority</p><p className="text-2xl font-bold text-status-unresolved mt-1">{highCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aged 30+ days</p><p className="text-2xl font-bold mt-1">{aged30}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Multi-Alert Cases</p><p className="text-2xl font-bold mt-1">{multiAlertCaseCount}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mb-4 h-auto gap-1 bg-muted p-1 rounded-lg">
          <ResponsiveTabsTrigger
            value="unresolved"
            icon={<Clock className="h-3.5 w-3.5" />}
            label="New (Unresolved)"
            badge={<Badge variant="secondary" className="ml-1 text-[10px]">{unresolvedMatches.length}</Badge>}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md"
          />
          <ResponsiveTabsTrigger
            value="review"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Updated (Review Required)"
            badge={<Badge variant="secondary" className="ml-1 text-[10px]">{reviewRequiredMatches.length}</Badge>}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md"
          />
        </TabsList>

        {/* Bulk action bar */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-md border border-primary/20 animate-fade-in shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, hsl(var(--primary)) 10%, hsl(var(--background)))' }}>
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
        )}

        {['unresolved', 'review'].map(tabKey => (
          <TabsContent key={tabKey} value={tabKey}>
            <Card>
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
                      {groupByCase && <th className="w-8 px-2" />}
                      {visibleAlertCols.map(key => {
                        const col = ALERT_COLUMNS.find(c => c.key === key)!;
                        const widthClass = key === 'priority' || key === 'age' ? 'w-20' : '';
                        return <th key={key} className={`text-left px-4 py-3 font-medium text-muted-foreground ${widthClass}`}>{col.label}</th>;
                      })}
                      {tabKey === 'review' && <th className="text-left px-4 py-3 font-medium text-muted-foreground">What Changed</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeList.length === 0 ? (
                      <tr><td colSpan={1 + (groupByCase ? 1 : 0) + visibleAlertCols.length + (tabKey === 'review' ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">{tabKey === 'unresolved' ? 'All matches have been resolved. 🎉' : 'No reviews pending.'}</td></tr>
                    ) : groupByCase ? (
                      caseGroups.map(group => (
                        <GroupRows key={group.caseId} group={group} isExpanded={expandedCases.has(group.caseId)} onToggle={() => toggleExpanded(group.caseId)} onNavigate={(caseId) => navigate(`/cases/${caseId}?bucket=unresolved`)} showChanges={tabKey === 'review'} visibleCols={visibleAlertCols} selectedIds={selectedIds} onToggleSelect={toggleOne} />
                      ))
                    ) : (
                      activeList.map(m => <AlertRow key={m.id} m={m} onNavigate={(caseId) => navigate(`/cases/${caseId}?bucket=unresolved`)} showChanges={tabKey === 'review'} showGroupCol={false} visibleCols={visibleAlertCols} selected={selectedIds.has(m.id)} onToggleSelect={() => toggleOne(m.id)} />)
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Bulk Resolve Sheet */}
      <Sheet open={bulkDialog === 'resolve'} onOpenChange={v => !v && setBulkDialog(null)}>
        <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Bulk Resolve — {selectedCount} Alerts</SheetTitle>
            <SheetDescription>Apply a resolution to all selected alerts. A mandatory reason is required.</SheetDescription>
          </SheetHeader>

          <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1.5">
            <div className="flex flex-wrap gap-2">
              {Object.entries(selectionSummary.byDataset).map(([ds, count]) => (
                <Badge key={ds} variant="secondary" className="text-[10px]">{ds}: {count}</Badge>
              ))}
              {Object.entries(selectionSummary.byPriority).map(([p, count]) => (
                <Badge key={p} variant="outline" className={`text-[10px] ${priorityColor(p as PriorityLevel)}`}>{p}: {count}</Badge>
              ))}
            </div>
            {selectionSummary.reviewCount > 0 && (
              <div className="flex items-center gap-1 text-status-possible">
                <AlertTriangle className="h-3 w-3" />
                <span>{selectionSummary.reviewCount} require review</span>
              </div>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto border rounded-md">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 sticky top-0">
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Case</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Strength</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Dataset</th>
                </tr>
              </thead>
              <tbody>
                {selectedMatches.map(m => {
                  const c = getCaseById(m.caseId);
                  return (
                    <tr key={m.id} className="border-b">
                      <td className="px-3 py-1.5 text-muted-foreground">{c?.name || m.caseId}</td>
                      <td className="px-3 py-1.5 font-medium">{m.matchedName}</td>
                      <td className="px-3 py-1.5 font-mono">{m.strength}%</td>
                      <td className="px-3 py-1.5"><Badge variant="secondary" className="text-[9px]">{m.dataset}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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

          <div className="border-t" />

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

          <SheetFooter className="mt-auto pt-4 border-t flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!bulkReason.trim()} onClick={handleBulkResolve}>
              Resolve {selectedCount} Alerts
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk Review Sheet */}
      <Sheet open={bulkDialog === 'review'} onOpenChange={v => !v && setBulkDialog(null)}>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mark as Reviewed — {selectedCount} Alerts</SheetTitle>
            <SheetDescription>Confirm that the selected alerts have been reviewed. Their status will remain unchanged.</SheetDescription>
          </SheetHeader>

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
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Case</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Strength</th>
                  <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedMatches.map(m => {
                  const c = getCaseById(m.caseId);
                  return (
                    <tr key={m.id} className="border-b">
                      <td className="px-3 py-1.5 text-muted-foreground">{c?.name || m.caseId}</td>
                      <td className="px-3 py-1.5 font-medium">{m.matchedName}</td>
                      <td className="px-3 py-1.5 font-mono">{m.strength}%</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{m.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Review Comment (required)</Label>
            <Textarea
              value={bulkComment}
              onChange={e => setBulkComment(e.target.value)}
              rows={2}
              placeholder="Review notes..."
              className="text-xs resize-none"
            />
          </div>

          <SheetFooter className="mt-auto pt-4 border-t flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!bulkComment.trim()} onClick={handleBulkReview}>
              Confirm Reviewed
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AlertRow({ m, onNavigate, showChanges, showGroupCol, visibleCols, selected, onToggleSelect }: { m: Match; onNavigate: (caseId: string) => void; showChanges: boolean; showGroupCol: boolean; visibleCols: AlertColumnKey[]; selected: boolean; onToggleSelect: () => void }) {
  const c = getCaseById(m.caseId);
  const days = alertAgeDays(m);
  const caseAlertCount = allMatches.filter(x => x.caseId === m.caseId && (x.status === 'Unresolved' || x.reviewRequired)).length;

  const renderCell = (key: AlertColumnKey) => {
    switch (key) {
      case 'case': return (
        <td key={key} className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{c?.name || m.caseId}</span>
            {caseAlertCount > 1 && <Badge variant="outline" className="text-[10px] gap-0.5"><Layers className="h-2.5 w-2.5" />{caseAlertCount}</Badge>}
          </div>
          <span className="text-[10px] text-muted-foreground">{m.caseId}</span>
        </td>
      );
      case 'matchedName': return (
        <td key={key} className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{m.matchedName}</span>
            {m.updated && <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0">Updated</Badge>}
          </div>
        </td>
      );
      case 'priority': return <td key={key} className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${priorityColor(m.priorityLevel)}`}>{m.priorityLevel}</Badge></td>;
      case 'age': return <td key={key} className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${ageBadgeClass(days)}`}>{ageLabel(days)}</Badge></td>;
      case 'strength': return <td key={key} className="px-4 py-3 font-mono text-xs">{m.strength}%</td>;
      case 'dataset': return <td key={key} className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{m.dataset}</Badge></td>;
      default: return null;
    }
  };

  return (
    <tr className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${m.reviewRequired ? 'bg-status-possible/5' : ''} ${selected ? 'bg-primary/5' : ''}`} onClick={() => onNavigate(m.caseId)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onNavigate(m.caseId)}>
      <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="h-4 w-4" />
      </td>
      {showGroupCol && <td className="w-8 px-2" />}
      {visibleCols.map(renderCell)}
      {showChanges && (
        <td className="px-4 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground cursor-help max-w-[180px] truncate">
                {m.changeLog.length > 0 ? m.changeLog.map(cl => `${cl.field}: ${cl.from}→${cl.to}`).join('; ') : '—'}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {m.changeLog.length > 0 ? (
                <table className="text-xs">
                  <thead><tr><th className="pr-2 text-left">Field</th><th className="pr-2 text-left">From</th><th className="pr-2 text-left">To</th><th className="text-left">Date</th></tr></thead>
                  <tbody>{m.changeLog.map((cl, i) => (<tr key={i}><td className="pr-2">{cl.field}</td><td className="pr-2">{cl.from}</td><td className="pr-2">{cl.to}</td><td>{cl.changedAt}</td></tr>))}</tbody>
                </table>
              ) : <span>No change details</span>}
            </TooltipContent>
          </Tooltip>
        </td>
      )}
    </tr>
  );
}

function GroupRows({ group, isExpanded, onToggle, onNavigate, showChanges, visibleCols, selectedIds, onToggleSelect }: { group: CaseAlertGroup; isExpanded: boolean; onToggle: () => void; onNavigate: (caseId: string) => void; showChanges: boolean; visibleCols: AlertColumnKey[]; selectedIds: Set<string>; onToggleSelect: (id: string) => void }) {
  const colSpan = 1 + visibleCols.length + (showChanges ? 1 : 0);
  return (
    <>
      <tr className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggle}>
        <td className="w-8 px-2 py-2.5">{isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}</td>
        <td colSpan={colSpan} className="px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">{group.caseName}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{group.caseId}</span>
            <Badge variant="outline" className="text-[10px] gap-0.5"><Layers className="h-2.5 w-2.5" />{group.alerts.length} alert{group.alerts.length > 1 ? 's' : ''}</Badge>
            <Badge variant="outline" className={`text-[10px] ${priorityColor(group.highestPriority)}`}>{group.highestPriority}</Badge>
            {group.oldestAge > 30 && <Badge variant="outline" className="text-[10px] border-status-unresolved text-status-unresolved">{group.oldestAge}d oldest</Badge>}
          </div>
        </td>
      </tr>
      {isExpanded && group.alerts.map(m => <AlertRow key={m.id} m={m} onNavigate={onNavigate} showChanges={showChanges} showGroupCol={true} visibleCols={visibleCols} selected={selectedIds.has(m.id)} onToggleSelect={() => onToggleSelect(m.id)} />)}
    </>
  );
}
