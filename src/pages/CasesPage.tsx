import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Archive, Users, ArrowRightLeft, Download, ToggleRight, AlertTriangle,
  Filter, Settings2, Shield, Newspaper, CreditCard, Save, Trash2, RefreshCw,
  UserPlus, X, SlidersHorizontal, Briefcase
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cases, groups, getGroupById } from '@/data/mock-data';
import { useAppContext } from '@/context/AppContext';
import type { CheckType, RiskLevel, EntityType } from '@/types';

// Constants, types, helpers
const riskLevels: RiskLevel[] = ['High', 'Medium', 'Low', 'None'];
const entityTypes: EntityType[] = ['Individual', 'Organisation', 'Vessel', 'Unspecified'];
const checkTypes: CheckType[] = ['World-Check', 'Media Check', 'Passport Check'];

const formatDate = (date: string) => {
  const d = new Date(date);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const riskLevelColor: Record<RiskLevel, string> = {
  High: 'text-red-500',
  Medium: 'text-yellow-500',
  Low: 'text-green-500',
  None: 'text-gray-500',
};
const entityTypeLabels: Record<EntityType, string> = {
  Individual: 'Individual',
  Organisation: 'Organisation',
  Vessel: 'Vessel',
  Unspecified: 'Unspecified',
};
const checkTypeLabels: Record<CheckType, string> = {
  'World-Check': 'World-Check',
  'Media Check': 'Media Check',
  'Passport Check': 'Passport Check',
};
const checkTypeIcon: Record<CheckType, React.ReactNode> = {
  'World-Check': <Shield className="h-3 w-3" />,
  'Media Check': <Newspaper className="h-3 w-3" />,
  'Passport Check': <CreditCard className="h-3 w-3" />,
};
const checkTypeAbbr: Record<CheckType, string> = { 'World-Check': 'WC', 'Media Check': 'MC', 'Passport Check': 'PC' };
const analysts = ['John Smith', 'Jane Doe', 'Alex Turner', 'Maria Lopez', 'Sam Wilson', 'Unassigned'];
const allCheckTypes: CheckType[] = ['World-Check', 'Media Check', 'Passport Check'];
const allRatings: RiskLevel[] = ['High', 'Medium', 'Low', 'None'];
const allEntityTypes: EntityType[] = ['Individual', 'Organisation', 'Vessel', 'Unspecified'];

interface CaseFilters {
  search: string;
  groupId: string;
  assignee: string;
  rating: string;
  entityType: string;
  checkType: string;
  ogs: string;
}
interface SavedFilter { name: string; filters: CaseFilters; }

const EMPTY_FILTERS: CaseFilters = { search: '', groupId: 'all', assignee: 'all', rating: 'all', entityType: 'all', checkType: 'all', ogs: 'all' };

function loadSavedFilters(): SavedFilter[] {
  try { const raw = localStorage.getItem('wc1-saved-filters'); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function persistSavedFilters(f: SavedFilter[]) { localStorage.setItem('wc1-saved-filters', JSON.stringify(f)); }

interface ColumnDef { key: string; label: string; defaultVisible: boolean; }
const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Case Name', defaultVisible: true },
  { key: 'id', label: 'ID', defaultVisible: true },
  { key: 'group', label: 'Group', defaultVisible: true },
  { key: 'assignee', label: 'Assignee', defaultVisible: true },
  { key: 'checkTypes', label: 'Check Types', defaultVisible: true },
  { key: 'entityType', label: 'Entity Type', defaultVisible: false },
  { key: 'rating', label: 'Risk Rating', defaultVisible: true },
  { key: 'lastScreened', label: 'Last Screened', defaultVisible: true },
  { key: 'ogs', label: 'OGS', defaultVisible: true },
  { key: 'createdAt', label: 'Created', defaultVisible: false },
];
interface ColumnSet { name: string; columns: string[]; }
const DEFAULT_COLUMNS = ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);

function loadColumnSets(): ColumnSet[] { try { const r = localStorage.getItem('wc1-column-sets'); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveColumnSets(s: ColumnSet[]) { localStorage.setItem('wc1-column-sets', JSON.stringify(s)); }
function loadActiveColumns(): string[] { try { const r = localStorage.getItem('wc1-active-columns'); return r ? JSON.parse(r) : DEFAULT_COLUMNS; } catch { return DEFAULT_COLUMNS; } }
function persistActiveColumns(c: string[]) { localStorage.setItem('wc1-active-columns', JSON.stringify(c)); }

function filtersActive(f: CaseFilters): number {
  let count = 0;
  if (f.groupId !== 'all') count++;
  if (f.assignee !== 'all') count++;
  if (f.rating !== 'all') count++;
  if (f.entityType !== 'all') count++;
  if (f.checkType !== 'all') count++;
  if (f.ogs !== 'all') count++;
  return count;
}

export default function CasesPage() {
  const navigate = useNavigate();
  const { role } = useAppContext();
  const [filters, setFilters] = useState<CaseFilters>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadActiveColumns);
  const [columnSets, setColumnSets] = useState<ColumnSet[]>(loadColumnSets);
  const [newSetName, setNewSetName] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [newFilterName, setNewFilterName] = useState('');

  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkComment, setBulkComment] = useState('');

  const activeCases = useMemo(() => cases.filter(c => c.status === 'Active'), []);

  const filtered = useMemo(() => {
    return activeCases.filter(c => {
      if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase()) && !c.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.groupId !== 'all' && c.groupId !== filters.groupId) return false;
      if (filters.assignee !== 'all' && c.assignee !== filters.assignee) return false;
      if (filters.rating !== 'all' && c.rating !== filters.rating) return false;
      if (filters.entityType !== 'all' && c.entityType !== filters.entityType) return false;
      if (filters.checkType !== 'all' && !c.checkTypes.includes(filters.checkType as CheckType)) return false;
      if (filters.ogs === 'active' && !c.ogsWorldCheck && !c.ogsMediaCheck) return false;
      if (filters.ogs === 'off' && (c.ogsWorldCheck || c.ogsMediaCheck)) return false;
      return true;
    });
  }, [filters, activeCases]);

  const setFilter = (key: keyof CaseFilters, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const activeFilterCount = filtersActive(filters);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };
  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns(prev => { const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]; persistActiveColumns(next); return next; });
  }, []);
  const applyColumnSet = (set: ColumnSet) => { setVisibleColumns(set.columns); persistActiveColumns(set.columns); };
  const saveCurrentAsSet = () => {
    if (!newSetName.trim()) return;
    const updated = [...columnSets.filter(s => s.name !== newSetName.trim()), { name: newSetName.trim(), columns: visibleColumns }];
    setColumnSets(updated); saveColumnSets(updated); setNewSetName('');
  };
  const deleteColumnSet = (name: string) => { const updated = columnSets.filter(s => s.name !== name); setColumnSets(updated); saveColumnSets(updated); };

  const saveCurrentFilter = () => {
    if (!newFilterName.trim()) return;
    const updated = [...savedFilters.filter(s => s.name !== newFilterName.trim()), { name: newFilterName.trim(), filters: { ...filters } }];
    setSavedFilters(updated); persistSavedFilters(updated); setNewFilterName('');
  };
  const deleteFilter = (name: string) => { const updated = savedFilters.filter(s => s.name !== name); setSavedFilters(updated); persistSavedFilters(updated); };

  const isCol = (key: string) => visibleColumns.includes(key);
  const visibleColCount = visibleColumns.length + 1;
  const handleBulkAction = (action?: string) => {
    const count = selectedIds.size;
    setSelectedIds(new Set());
    if (action) {
      toast.success(`${action} — ${count} case${count !== 1 ? 's' : ''} updated`);
    }
  };

  const uniqueAssignees = useMemo(() => [...new Set(activeCases.map(c => c.assignee))].sort(), [activeCases]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Case Manager</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{filtered.length} / {activeCases.length} cases</Badge>
          {role === 'Supervisor' && <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" /> Team Queue</Badge>}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {showFilters ? 'Hide' : 'Filters'}
          {activeFilterCount > 0 && <Badge className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">{activeFilterCount}</Badge>}
        </Button>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Search cases..." className="pl-9 h-8 text-sm" />
        </div>

        {/* Column Customisation */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Settings2 className="h-3.5 w-3.5" /> Columns</Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <p className="text-xs font-semibold mb-2">Show / Hide Columns</p>
            <div className="space-y-1.5 mb-3">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={visibleColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} />{col.label}
                </label>
              ))}
            </div>
            <div className="border-t pt-2">
              <p className="text-xs font-semibold mb-1.5">Column Sets</p>
              {columnSets.length > 0 && (
                <div className="space-y-1 mb-2">
                  {columnSets.map(set => (
                    <div key={set.name} className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] flex-1 justify-start px-2" onClick={() => applyColumnSet(set)}>{set.name}</Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteColumnSet(set.name)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <Input value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="Set name..." className="h-7 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && saveCurrentAsSet()} />
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={saveCurrentAsSet} disabled={!newSetName.trim()}><Save className="h-3 w-3" /></Button>
              </div>
            </div>
            <div className="border-t pt-2 mt-2">
              <Button variant="ghost" size="sm" className="h-6 text-[11px] w-full" onClick={() => { setVisibleColumns(DEFAULT_COLUMNS); persistActiveColumns(DEFAULT_COLUMNS); }}>Reset to defaults</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setBulkAssignOpen(true)}><UserPlus className="h-3 w-3" /> Assign</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setBulkMoveOpen(true)}><ArrowRightLeft className="h-3 w-3" /> Move</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('Re-screen queued')}><RefreshCw className="h-3 w-3" /> Rescreen</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('OGS toggled')}><ToggleRight className="h-3 w-3" /> OGS</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('Archived')}><Archive className="h-3 w-3" /> Archive</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="h-3 w-3" /> Delete</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('Export started')}><Download className="h-3 w-3" /> Export</Button>
          </div>
        )}
      </div>

      <Card>
        <div className="flex">
          {showFilters && (
            <div className="w-[220px] shrink-0 border-r p-4 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-0.5" onClick={() => setFilters(EMPTY_FILTERS)}>
                    <X className="h-2.5 w-2.5" /> Clear
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Group</label>
                <Select value={filters.groupId} onValueChange={v => setFilter('groupId', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Assignee</label>
                <Select value={filters.assignee} onValueChange={v => setFilter('assignee', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {uniqueAssignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Risk Rating</label>
                <Select value={filters.rating} onValueChange={v => setFilter('rating', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    {allRatings.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Entity Type</label>
                <Select value={filters.entityType} onValueChange={v => setFilter('entityType', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {allEntityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Check Type</label>
                <Select value={filters.checkType} onValueChange={v => setFilter('checkType', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Checks</SelectItem>
                    {allCheckTypes.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">OGS Status</label>
                <Select value={filters.ogs} onValueChange={v => setFilter('ogs', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Saved Filters */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Saved Filters</p>
                {savedFilters.length > 0 && (
                  <div className="space-y-1">
                    {savedFilters.map(sf => (
                      <div key={sf.name} className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] flex-1 justify-start px-2" onClick={() => setFilters(sf.filters)}>{sf.name}</Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteFilter(sf.name)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <Input value={newFilterName} onChange={e => setNewFilterName(e.target.value)} placeholder="Filter name..." className="h-7 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && saveCurrentFilter()} />
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={saveCurrentFilter} disabled={!newFilterName.trim()}><Save className="h-3 w-3" /></Button>
                </div>
              </div>

              {/* Active filter chips */}
              {activeFilterCount > 0 && (
                <div className="border-t pt-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Active</p>
                  <div className="flex flex-wrap gap-1">
                    {filters.groupId !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        {getGroupById(filters.groupId)?.name}
                        <button onClick={() => setFilter('groupId', 'all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                    {filters.assignee !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        {filters.assignee}
                        <button onClick={() => setFilter('assignee', 'all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                    {filters.rating !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        {filters.rating}
                        <button onClick={() => setFilter('rating', 'all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                    {filters.entityType !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        {filters.entityType}
                        <button onClick={() => setFilter('entityType', 'all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                    {filters.checkType !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        {filters.checkType}
                        <button onClick={() => setFilter('checkType', 'all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                    {filters.ogs !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1">
                        OGS: {filters.ogs}
                        <button onClick={() => setFilter('ogs', 'all')}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                  {isCol('name') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case Name</th>}
                  {isCol('id') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>}
                  {isCol('group') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Group</th>}
                  {isCol('assignee') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assignee</th>}
                  {isCol('checkTypes') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check Types</th>}
                  {isCol('entityType') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity Type</th>}
                  {isCol('rating') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>}
                  {isCol('lastScreened') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Screened</th>}
                  {isCol('ogs') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">OGS</th>}
                  {isCol('createdAt') && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={visibleColCount} className="px-4 py-12 text-center text-muted-foreground">No cases match your filters.</td></tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${c.mandatoryAction ? 'bg-status-possible/5' : ''}`}
                      onClick={() => navigate(`/cases/${c.id}`)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate(`/cases/${c.id}`)}>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></td>
                      {isCol('name') && <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="font-medium">{c.name}</span>{c.mandatoryAction && <AlertTriangle className="h-3.5 w-3.5 text-status-possible" />}</div></td>}
                      {isCol('id') && <td className="px-4 py-3 font-mono text-xs">{c.id}</td>}
                      {isCol('group') && <td className="px-4 py-3 text-xs">{getGroupById(c.groupId)?.name || '—'}</td>}
                      {isCol('assignee') && <td className="px-4 py-3 text-xs"><span className={c.assignee === 'Unassigned' ? 'text-muted-foreground italic' : ''}>{c.assignee}</span></td>}
                      {isCol('checkTypes') && <td className="px-4 py-3"><div className="flex items-center gap-1">{c.checkTypes.map(ct => (<span key={ct} className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground" title={ct}>{checkTypeIcon[ct]}{checkTypeAbbr[ct]}</span>))}</div></td>}
                      {isCol('entityType') && <td className="px-4 py-3 text-xs">{c.entityType}</td>}
                      {isCol('rating') && <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] ${c.rating === 'High' ? 'border-destructive text-destructive' : c.rating === 'Medium' ? 'border-amber-500 text-amber-600' : 'border-muted-foreground text-muted-foreground'}`}>{c.rating}</Badge></td>}
                      {isCol('lastScreened') && <td className="px-4 py-3 text-xs">{c.lastScreenedAt}</td>}
                      {isCol('ogs') && <td className="px-4 py-3"><div className="flex gap-1">{c.ogsWorldCheck && <Badge variant="default" className="text-[10px]">WC</Badge>}{c.ogsMediaCheck && <Badge variant="default" className="text-[10px]">MC</Badge>}{!c.ogsWorldCheck && !c.ogsMediaCheck && <Badge variant="secondary" className="text-[10px]">Off</Badge>}</div></td>}
                      {isCol('createdAt') && <td className="px-4 py-3 text-xs">{c.createdAt}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Bulk Dialogs */}
      <Dialog open={bulkAssignOpen} onOpenChange={v => { setBulkAssignOpen(v); if (!v) { setBulkAssignee(''); setBulkComment(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Assign — {selectedIds.size} Cases</DialogTitle>
            <DialogDescription>Reassign the selected cases to a different analyst</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign To</label>
              <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select analyst..." /></SelectTrigger>
                <SelectContent>{analysts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label>
              <Textarea value={bulkComment} onChange={e => setBulkComment(e.target.value)} placeholder="Reason for reassignment..." className="min-h-[60px] text-xs resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!bulkAssignee} onClick={() => { handleBulkAction('Assigned'); setBulkAssignOpen(false); setBulkComment(''); }}>Assign {selectedIds.size} Cases</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkMoveOpen} onOpenChange={v => { setBulkMoveOpen(v); if (!v) { setBulkGroup(''); setBulkComment(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Group — {selectedIds.size} Cases</DialogTitle>
            <DialogDescription>Move the selected cases to a different screening group</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Group</label>
              <Select value={bulkGroup} onValueChange={setBulkGroup}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select group..." /></SelectTrigger>
                <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label>
              <Textarea value={bulkComment} onChange={e => setBulkComment(e.target.value)} placeholder="Reason for move..." className="min-h-[60px] text-xs resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkMoveOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!bulkGroup} onClick={() => { handleBulkAction('Moved'); setBulkMoveOpen(false); setBulkComment(''); }}>Move {selectedIds.size} Cases</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={v => { setBulkDeleteOpen(v); if (!v) setBulkComment(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Cases</DialogTitle>
            <DialogDescription>This action cannot be undone. All screening data and matches will be permanently removed.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (required)</label>
            <Textarea value={bulkComment} onChange={e => setBulkComment(e.target.value)} placeholder="Reason for deletion..." className="min-h-[60px] text-xs resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={!bulkComment.trim()} onClick={() => { handleBulkAction('Deleted'); setBulkDeleteOpen(false); setBulkComment(''); }}>Delete {selectedIds.size} Cases</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
