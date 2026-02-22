import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ChevronDown, ChevronRight, ArrowUpDown, Calendar, Layers, BarChart3, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cases, allMatches, getCaseById } from '@/data/mock-data';
import { priorityColor } from '@/lib/priority';
import FilterBar, { type FilterDefinition } from '@/components/FilterBar';
import type { Match, PriorityLevel } from '@/types';

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

export default function AlertsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('unresolved');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ priority: 'all', age: 'all', sort: 'priority' });
  const [groupByCase, setGroupByCase] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Alerts
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {!showFilters && activeFilterCount > 0 && <Badge className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">{activeFilterCount}</Badge>}
          </Button>
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
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <div className="mb-4">
          <FilterBar
            filters={FILTER_DEFS}
            values={filterValues}
            onChange={handleFilterChange}
            onClearAll={() => setFilterValues({ priority: 'all', age: 'all', sort: 'priority' })}
          />
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unresolved</p><p className="text-2xl font-bold text-status-unresolved mt-1">{allMatches.filter(m => m.status === 'Unresolved').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Review Required</p><p className="text-2xl font-bold text-status-possible mt-1">{allMatches.filter(m => m.reviewRequired).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">High Priority</p><p className="text-2xl font-bold text-status-unresolved mt-1">{highCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aged 30+ days</p><p className="text-2xl font-bold mt-1">{aged30}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Multi-Alert Cases</p><p className="text-2xl font-bold mt-1">{multiAlertCaseCount}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="unresolved" className="gap-1">
            <Clock className="h-3.5 w-3.5" /> New (Unresolved)
            <Badge variant="secondary" className="ml-1 text-[10px]">{unresolvedMatches.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Updated (Review Required)
            <Badge variant="secondary" className="ml-1 text-[10px]">{reviewRequiredMatches.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {['unresolved', 'review'].map(tabKey => (
          <TabsContent key={tabKey} value={tabKey}>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {groupByCase && <th className="w-8 px-2" />}
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Matched Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Priority</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Age</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Strength</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dataset</th>
                      {tabKey === 'review' && <th className="text-left px-4 py-3 font-medium text-muted-foreground">What Changed</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeList.length === 0 ? (
                      <tr><td colSpan={groupByCase ? 8 : 7} className="px-4 py-12 text-center text-muted-foreground">{tabKey === 'unresolved' ? 'All matches have been resolved. 🎉' : 'No reviews pending.'}</td></tr>
                    ) : groupByCase ? (
                      caseGroups.map(group => (
                        <GroupRows key={group.caseId} group={group} isExpanded={expandedCases.has(group.caseId)} onToggle={() => toggleExpanded(group.caseId)} onNavigate={(caseId) => navigate(`/cases/${caseId}?bucket=unresolved`)} showChanges={tabKey === 'review'} />
                      ))
                    ) : (
                      activeList.map(m => <AlertRow key={m.id} m={m} onNavigate={(caseId) => navigate(`/cases/${caseId}?bucket=unresolved`)} showChanges={tabKey === 'review'} showGroupCol={false} />)
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AlertRow({ m, onNavigate, showChanges, showGroupCol }: { m: Match; onNavigate: (caseId: string) => void; showChanges: boolean; showGroupCol: boolean; }) {
  const c = getCaseById(m.caseId);
  const days = alertAgeDays(m);
  const caseAlertCount = allMatches.filter(x => x.caseId === m.caseId && (x.status === 'Unresolved' || x.reviewRequired)).length;

  return (
    <tr className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${m.reviewRequired ? 'bg-status-possible/5' : ''}`} onClick={() => onNavigate(m.caseId)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onNavigate(m.caseId)}>
      {showGroupCol && <td className="w-8 px-2" />}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{c?.name || m.caseId}</span>
          {caseAlertCount > 1 && <Badge variant="outline" className="text-[10px] gap-0.5"><Layers className="h-2.5 w-2.5" />{caseAlertCount}</Badge>}
        </div>
        <span className="text-[10px] text-muted-foreground">{m.caseId}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{m.matchedName}</span>
          {m.updated && <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0">Updated</Badge>}
        </div>
      </td>
      <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${priorityColor(m.priorityLevel)}`}>{m.priorityLevel}</Badge></td>
      <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${ageBadgeClass(days)}`}>{ageLabel(days)}</Badge></td>
      <td className="px-4 py-3 font-mono text-xs">{m.strength}%</td>
      <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{m.dataset}</Badge></td>
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

function GroupRows({ group, isExpanded, onToggle, onNavigate, showChanges }: { group: CaseAlertGroup; isExpanded: boolean; onToggle: () => void; onNavigate: (caseId: string) => void; showChanges: boolean; }) {
  const colSpan = showChanges ? 7 : 6;
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
      {isExpanded && group.alerts.map(m => <AlertRow key={m.id} m={m} onNavigate={onNavigate} showChanges={showChanges} showGroupCol={true} />)}
    </>
  );
}
