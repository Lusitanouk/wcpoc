import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, AlertTriangle, Eye, Clock, ArrowRight, Shield, CheckCircle, XCircle, HelpCircle, User, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cases, allMatches } from '@/data/mock-data';
import { computePriorityScore, priorityLevel, priorityColor } from '@/lib/priority';
import type { PriorityLevel } from '@/types';

const CURRENT_USER = 'Jane Doe';

type PriorityFilter = 'All' | PriorityLevel;

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All');

  const matchesWithPriority = useMemo(() =>
    allMatches.map(m => ({
      ...m,
      priorityScore: computePriorityScore(m),
      priority: priorityLevel(computePriorityScore(m)),
    })),
  []);

  const stats = useMemo(() => {
    const filtered = priorityFilter === 'All'
      ? matchesWithPriority
      : matchesWithPriority.filter(m => m.priority === priorityFilter);

    const myCases = cases.filter(c => c.assignee === CURRENT_USER);
    const totalAlerts = filtered;
    const unresolvedMatches = filtered.filter(m => m.status === 'Unresolved');
    const reviewRequired = cases.filter(c => c.reviewRequiredCount > 0);

    return { myCases, totalAlerts, unresolvedMatches, reviewRequired };
  }, [priorityFilter, matchesWithPriority]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {CURRENT_USER}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="All">All Priorities</SelectItem>
              <SelectItem value="High">High Priority</SelectItem>
              <SelectItem value="Medium">Medium Priority</SelectItem>
              <SelectItem value="Low">Low Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="My Cases"
          value={stats.myCases.length}
          icon={<Briefcase className="h-4 w-4" />}
          onClick={() => navigate('/cases')}
        />
        <SummaryCard
          label="Total Alerts"
          value={stats.totalAlerts.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          onClick={() => navigate('/alerts')}
        />
        <SummaryCard
          label="Unresolved Matches"
          value={stats.unresolvedMatches.length}
          icon={<HelpCircle className="h-4 w-4" />}
          variant="danger"
          onClick={() => navigate('/alerts')}
        />
        <SummaryCard
          label="Review Required"
          value={stats.reviewRequired.length}
          icon={<Eye className="h-4 w-4" />}
          variant="warning"
          onClick={() => navigate('/alerts')}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* My assigned cases */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> My Assigned Cases
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/cases')}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.myCases.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No cases assigned to you.</p>
            ) : (
              stats.myCases.slice(0, 6).map(c => (
                <button
                  key={c.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate(`/cases/${c.id}`)}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.unresolvedCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{c.unresolvedCount} unresolved</Badge>
                    )}
                    {c.mandatoryAction && (
                      <AlertTriangle className="h-3 w-3 text-status-possible" />
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Total Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" /> Total Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/alerts')}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.totalAlerts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No alerts.</p>
            ) : (
              stats.totalAlerts.slice(0, 6).map(m => (
                <button
                  key={m.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate('/alerts')}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{m.matchedName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{m.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${priorityColor(m.priority)}`}>{m.priority}</Badge>
                    <Badge variant={m.status === 'Unresolved' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {m.status}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Unresolved Matches */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-destructive" /> Unresolved Matches
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/alerts')}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.unresolvedMatches.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No unresolved matches.</p>
            ) : (
              stats.unresolvedMatches.slice(0, 6).map(m => (
                <button
                  key={m.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate('/alerts')}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{m.matchedName}</span>
                    <span className="text-xs text-muted-foreground ml-2">{m.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${priorityColor(m.priority)}`}>{m.priority}</Badge>
                    <Badge variant="destructive" className="text-[10px]">Unresolved</Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Review Required */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-status-possible" /> Review Required
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/alerts')}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.reviewRequired.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No cases require review.</p>
            ) : (
              stats.reviewRequired.slice(0, 6).map(c => (
                <button
                  key={c.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  onClick={() => navigate('/alerts')}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.id}</span>
                  </div>
                  <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0">
                    {c.reviewRequiredCount} to review
                  </Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, variant, onClick }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
  onClick: () => void;
}) {
  const colorClass = variant === 'danger'
    ? 'text-destructive'
    : variant === 'warning'
    ? 'text-status-possible'
    : 'text-primary';

  return (
    <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
