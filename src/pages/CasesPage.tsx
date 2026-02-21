import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, Users, ArrowRightLeft, Download, ToggleRight, AlertTriangle, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cases, groups, getGroupById } from '@/data/mock-data';
import { useAppContext } from '@/context/AppContext';

const bucketLabels: { key: 'unresolvedCount' | 'positiveCount' | 'possibleCount' | 'falseCount' | 'unknownCount'; label: string; color: string }[] = [
  { key: 'unresolvedCount', label: 'U', color: 'bg-status-unresolved' },
  { key: 'positiveCount', label: 'P', color: 'bg-status-positive' },
  { key: 'possibleCount', label: 'Po', color: 'bg-status-possible' },
  { key: 'falseCount', label: 'F', color: 'bg-status-false' },
  { key: 'unknownCount', label: 'Unk', color: 'bg-status-unknown' },
];

export default function CasesPage() {
  const navigate = useNavigate();
  const { role } = useAppContext();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return cases.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (groupFilter !== 'all' && c.groupId !== groupFilter) return false;
      return true;
    });
  }, [search, groupFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Case Manager</h1>
        {role === 'Supervisor' && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" /> Team Queue View
          </Badge>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Users className="h-3 w-3" /> Assign</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Archive className="h-3 w-3" /> Archive</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><ArrowRightLeft className="h-3 w-3" /> Move Group</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><ToggleRight className="h-3 w-3" /> OGS</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Download className="h-3 w-3" /> Export</Button>
          </div>
        )}
      </div>

      {/* Cases Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Group</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Buckets</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Screened</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">OGS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No cases found. Try adjusting your search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.id}
                    className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${
                      c.mandatoryAction ? 'bg-status-possible/5' : ''
                    }`}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/cases/${c.id}`)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.mandatoryAction && <AlertTriangle className="h-3.5 w-3.5 text-status-possible" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{c.entityType}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                    <td className="px-4 py-3 text-xs">{getGroupById(c.groupId)?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {bucketLabels.map(bl => {
                          const count = c[bl.key];
                          if (count === 0) return null;
                          return (
                            <span
                              key={bl.key}
                              className={`inline-flex items-center justify-center h-5 min-w-[24px] px-1 rounded text-[10px] font-medium text-primary-foreground ${bl.color}`}
                              title={`${bl.label}: ${count}`}
                            >
                              {bl.label}{count}
                            </span>
                          );
                        })}
                        {bucketLabels.every(bl => c[bl.key] === 0) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{c.lastScreenedAt}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.ogsEnabled ? 'default' : 'secondary'} className="text-[10px]">
                        {c.ogsEnabled ? 'Active' : 'Off'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
