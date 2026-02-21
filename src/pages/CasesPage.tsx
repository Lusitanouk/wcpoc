import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Archive, Users, ArrowRightLeft, Download, ToggleRight, AlertTriangle,
  Filter, Settings2, Shield, Newspaper, CreditCard, Save, Trash2, RefreshCw,
  UserPlus
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cases, groups, getGroupById } from '@/data/mock-data';
import { useAppContext } from '@/context/AppContext';
import type { CheckType } from '@/types';

const checkTypeIcon: Record<CheckType, React.ReactNode> = {
  'World-Check': <Shield className="h-3 w-3" />,
  'Media Check': <Newspaper className="h-3 w-3" />,
  'Passport Check': <CreditCard className="h-3 w-3" />,
};

const checkTypeAbbr: Record<CheckType, string> = {
  'World-Check': 'WC',
  'Media Check': 'MC',
  'Passport Check': 'PC',
};

const analysts = ['John Smith', 'Jane Doe', 'Alex Turner', 'Maria Lopez', 'Sam Wilson', 'Unassigned'];

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

function loadColumnSets(): ColumnSet[] {
  try { const raw = localStorage.getItem('wc1-column-sets'); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function saveColumnSets(sets: ColumnSet[]) { localStorage.setItem('wc1-column-sets', JSON.stringify(sets)); }
function loadActiveColumns(): string[] {
  try { const raw = localStorage.getItem('wc1-active-columns'); return raw ? JSON.parse(raw) : DEFAULT_COLUMNS; }
  catch { return DEFAULT_COLUMNS; }
}
function persistActiveColumns(cols: string[]) { localStorage.setItem('wc1-active-columns', JSON.stringify(cols)); }

export default function CasesPage() {
  const navigate = useNavigate();
  const { role } = useAppContext();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadActiveColumns);
  const [columnSets, setColumnSets] = useState<ColumnSet[]>(loadColumnSets);
  const [newSetName, setNewSetName] = useState('');

  // Bulk action dialogs
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkGroup, setBulkGroup] = useState('');

  const activeCases = useMemo(() => cases.filter(c => c.status === 'Active'), []);

  const filtered = useMemo(() => {
    return activeCases.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (groupFilter !== 'all' && c.groupId !== groupFilter) return false;
      return true;
    });
  }, [search, groupFilter, activeCases]);

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
  const isCol = (key: string) => visibleColumns.includes(key);
  const visibleColCount = visibleColumns.length + 1;

  const handleBulkAction = (action: string) => {
    // Mock actions — just clear selection
    setSelectedIds(new Set());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Case Manager</h1>
        {role === 'Supervisor' && (
          <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" /> Team Queue View</Badge>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases..." className="pl-9 h-8 text-sm" />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48 h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="All Groups" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>

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
                  <Checkbox checked={visibleColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
                  {col.label}
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
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setBulkAssignOpen(true)}><UserPlus className="h-3 w-3" /> Assign</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setBulkMoveOpen(true)}><ArrowRightLeft className="h-3 w-3" /> Move</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('rescreen')}><RefreshCw className="h-3 w-3" /> Rescreen</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('ogs')}><ToggleRight className="h-3 w-3" /> OGS</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('archive')}><Archive className="h-3 w-3" /> Archive</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="h-3 w-3" /> Delete</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleBulkAction('export')}><Download className="h-3 w-3" /> Export</Button>
          </div>
        )}
      </div>

      {/* Cases Table */}
      <Card>
        <div className="overflow-x-auto">
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
                <tr><td colSpan={visibleColCount} className="px-4 py-12 text-center text-muted-foreground">No cases found.</td></tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.id}
                    className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${c.mandatoryAction ? 'bg-status-possible/5' : ''}`}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/cases/${c.id}`)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                    </td>
                    {isCol('name') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {c.mandatoryAction && <AlertTriangle className="h-3.5 w-3.5 text-status-possible" />}
                        </div>
                      </td>
                    )}
                    {isCol('id') && <td className="px-4 py-3 font-mono text-xs">{c.id}</td>}
                    {isCol('group') && <td className="px-4 py-3 text-xs">{getGroupById(c.groupId)?.name || '—'}</td>}
                    {isCol('assignee') && (
                      <td className="px-4 py-3 text-xs">
                        <span className={c.assignee === 'Unassigned' ? 'text-muted-foreground italic' : ''}>{c.assignee}</span>
                      </td>
                    )}
                    {isCol('checkTypes') && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.checkTypes.map(ct => (
                            <span key={ct} className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground" title={ct}>
                              {checkTypeIcon[ct]}{checkTypeAbbr[ct]}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    {isCol('entityType') && <td className="px-4 py-3 text-xs">{c.entityType}</td>}
                    {isCol('rating') && (
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] ${
                          c.rating === 'High' ? 'border-destructive text-destructive'
                          : c.rating === 'Medium' ? 'border-amber-500 text-amber-600'
                          : 'border-muted-foreground text-muted-foreground'
                        }`}>{c.rating}</Badge>
                      </td>
                    )}
                    {isCol('lastScreened') && <td className="px-4 py-3 text-xs">{c.lastScreenedAt}</td>}
                    {isCol('ogs') && (
                      <td className="px-4 py-3">
                        <Badge variant={c.ogsEnabled ? 'default' : 'secondary'} className="text-[10px]">{c.ogsEnabled ? 'Active' : 'Off'}</Badge>
                      </td>
                    )}
                    {isCol('createdAt') && <td className="px-4 py-3 text-xs">{c.createdAt}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Bulk Assign ({selectedIds.size} cases)</DialogTitle></DialogHeader>
          <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
            <SelectTrigger><SelectValue placeholder="Select analyst..." /></SelectTrigger>
            <SelectContent>{analysts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { handleBulkAction('assign'); setBulkAssignOpen(false); }}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Move Dialog */}
      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Move {selectedIds.size} cases to group</DialogTitle></DialogHeader>
          <Select value={bulkGroup} onValueChange={setBulkGroup}>
            <SelectTrigger><SelectValue placeholder="Select group..." /></SelectTrigger>
            <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkMoveOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { handleBulkAction('move'); setBulkMoveOpen(false); }}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete {selectedIds.size} cases?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. Are you sure you want to delete the selected cases?</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => { handleBulkAction('delete'); setBulkDeleteOpen(false); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
