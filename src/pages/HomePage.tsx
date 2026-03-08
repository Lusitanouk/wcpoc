import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase, AlertTriangle, Eye, HelpCircle, ArrowRight, CheckCircle,
  XCircle, User, Filter, Bot, ShieldCheck, Clock, Zap, TrendingUp,
  ThumbsUp, ThumbsDown, Pencil, Timer, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cases, allMatches, getCaseById, updateMatch, recalcCaseCounts } from '@/data/mock-data';
import { computePriorityScore, priorityLevel, priorityColor } from '@/lib/priority';
import { useAppContext } from '@/context/AppContext';
import type { PriorityLevel, Match, MatchStatus, RiskLevel, CheckerDecision } from '@/types';

const CURRENT_USER = 'Jane Doe';

type PriorityFilter = 'All' | PriorityLevel;

// ─── Checker metrics helpers ──────────────────────────────────

/** Days between two ISO date strings */
function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function useCheckerStats(pendingMatches: Match[]) {
  return useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    // Matches that have been reviewed (have a checkerReview)
    const reviewed = allMatches.filter(m => m.checkerReview);

    const decidedToday = reviewed.filter(m => m.checkerReview!.createdAt === today);

    // Average turnaround: maker createdAt → checker createdAt
    const turnaroundDays = reviewed
      .filter(m => m.makerDecision?.createdAt && m.checkerReview?.createdAt)
      .map(m => daysBetween(m.makerDecision!.createdAt, m.checkerReview!.createdAt));
    const avgTurnaround = turnaroundDays.length
      ? Math.round((turnaroundDays.reduce((s, v) => s + v, 0) / turnaroundDays.length) * 10) / 10
      : null;

    // Decision breakdown from reviewed
    const decisionCounts = { Accepted: 0, Amended: 0, Rejected: 0 };
    reviewed.forEach(m => {
      const d = m.checkerReview!.decision;
      if (d in decisionCounts) decisionCounts[d as CheckerDecision]++;
    });

    // Agentic vs human split in pending queue
    const agenticPending = pendingMatches.filter(m => m.makerDecision?.makerType === 'Agentic').length;

    return { pendingCount: pendingMatches.length, decidedToday: decidedToday.length, avgTurnaround, decisionCounts, agenticPending };
  }, [pendingMatches]);
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useAppContext();
  const isChecker = role === 'Checker';
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All');

  const matchesWithPriority = useMemo(() =>
    allMatches.map(m => ({
      ...m,
      priorityScore: computePriorityScore(m),
      priority: priorityLevel(computePriorityScore(m)),
    })),
  []);

  // Pending checker review queue — sorted by priority desc
  const pendingMatches = useMemo(() =>
    allMatches
      .filter(m => m.pendingCheckerReview && !m.checkerReview)
      .sort((a, b) => b.priorityScore - a.priorityScore),
  []);

  const checkerStats = useCheckerStats(pendingMatches);

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
        {!isChecker && (
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
        )}
      </div>

      {/* ══ CHECKER DASHBOARD ══ */}
      {isChecker ? (
        <CheckerDashboard
          stats={checkerStats}
          pendingMatches={pendingMatches}
          onNavigateAlerts={() => navigate('/alerts')}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

// ─── Checker Dashboard ────────────────────────────────────────

interface CheckerDashboardProps {
  stats: ReturnType<typeof useCheckerStats>;
  pendingMatches: Match[];
  onNavigateAlerts: () => void;
}

function CheckerDashboard({ stats, pendingMatches, onNavigateAlerts }: CheckerDashboardProps) {
  const navigate = useNavigate();
  const [quickDecisions, setQuickDecisions] = useState<Record<string, CheckerDecision | 'pending'>>({});

  const handleQuickDecision = (match: Match, decision: CheckerDecision) => {
    const now = new Date().toISOString().split('T')[0];
    setQuickDecisions(prev => ({ ...prev, [match.id]: decision }));
    updateMatch(match.id, {
      pendingCheckerReview: false,
      checkerReview: {
        author: CURRENT_USER,
        decision,
        reason: decision === 'Accepted' ? 'Quick accepted from dashboard' : 'Quick rejected from dashboard',
        createdAt: now,
      },
      ...(decision === 'Rejected' ? { status: 'Unresolved' as MatchStatus } : {}),
    });
    recalcCaseCounts(match.caseId);
  };

  const queueItems = pendingMatches.filter(m => !quickDecisions[m.id]);
  const decidedInSession = Object.keys(quickDecisions).length;

  const { pendingCount, decidedToday, avgTurnaround, decisionCounts, agenticPending } = stats;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CheckerKpi
          label="Pending Approvals"
          value={queueItems.length}
          subtext={agenticPending > 0 ? `${agenticPending} agentic` : undefined}
          icon={<ShieldCheck className="h-4 w-4" />}
          variant={queueItems.length > 10 ? 'danger' : queueItems.length > 5 ? 'warning' : 'default'}
          onClick={onNavigateAlerts}
        />
        <CheckerKpi
          label="Avg. Turnaround"
          value={avgTurnaround !== null ? `${avgTurnaround}d` : '—'}
          subtext="maker → checker"
          icon={<Timer className="h-4 w-4" />}
          variant="default"
        />
        <CheckerKpi
          label="Decided Today"
          value={decidedToday + decidedInSession}
          subtext={decidedInSession > 0 ? `+${decidedInSession} this session` : undefined}
          icon={<Activity className="h-4 w-4" />}
          variant="default"
        />
        <CheckerKpi
          label="Decision Split"
          value={`${decisionCounts.Accepted}A / ${decisionCounts.Amended}Am / ${decisionCounts.Rejected}R`}
          subtext="accepted / amended / rejected"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="default"
        />
      </div>

      {/* Quick-action queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick-Action Queue
              {queueItems.length > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 rounded-full">{queueItems.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onNavigateAlerts}>
              Full Pending Approval view <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {queueItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <CheckCircle className="h-8 w-8 text-status-positive/60" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs">No pending approvals in the queue.</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2 border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                <span>Match / Case</span>
                <span className="w-16 text-center">Priority</span>
                <span className="w-14 text-center">Dataset</span>
                <span className="w-14 text-center">Maker</span>
                <span className="w-20 text-center">Proposed</span>
                <span className="w-20 text-right pr-1">Actions</span>
              </div>
              <div className="divide-y">
                {queueItems.slice(0, 10).map(m => {
                  const caseObj = getCaseById(m.caseId);
                  const isAgentic = m.makerDecision?.makerType === 'Agentic';
                  const proposed = m.makerDecision?.status ?? m.status;
                  const proposedRisk = m.makerDecision?.riskLevel ?? m.riskLevel;

                  const proposedColor =
                    proposed === 'Positive' ? 'text-status-unresolved' :
                    proposed === 'Possible' ? 'text-status-possible' :
                    proposed === 'False' ? 'text-status-positive' :
                    'text-muted-foreground';

                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors"
                    >
                      {/* Match / Case */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            className="text-sm font-medium truncate hover:underline text-left"
                            onClick={() => navigate('/alerts')}
                          >
                            {m.matchedName}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground truncate">{caseObj?.name ?? m.caseId}</span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-[10px] text-muted-foreground">{m.id}</span>
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="w-16 flex justify-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${priorityColor(m.priorityLevel)}`}>
                          {m.priorityLevel}
                        </Badge>
                      </div>

                      {/* Dataset */}
                      <div className="w-14 flex justify-center">
                        <span className="text-[10px] text-muted-foreground truncate">{m.dataset}</span>
                      </div>

                      {/* Maker type */}
                      <div className="w-14 flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`flex items-center gap-1 text-[10px] font-medium ${isAgentic ? 'text-primary' : 'text-muted-foreground'}`}>
                              {isAgentic ? <Bot className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
                              {isAgentic ? 'Bot' : 'Human'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {isAgentic ? 'Agentic resolution — verify carefully' : `Made by ${m.makerDecision?.author ?? 'analyst'}`}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Proposed resolution */}
                      <div className="w-20 flex flex-col items-center gap-0.5">
                        <span className={`text-[11px] font-semibold ${proposedColor}`}>{proposed}</span>
                        <span className="text-[10px] text-muted-foreground">{proposedRisk}</span>
                      </div>

                      {/* Quick actions */}
                      <div className="w-20 flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-status-positive hover:bg-status-positive/10"
                              onClick={() => handleQuickDecision(m, 'Accepted')}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Accept</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-status-possible hover:bg-status-possible/10"
                              onClick={() => navigate('/alerts')}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Amend (opens record)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => handleQuickDecision(m, 'Rejected')}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Reject</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pendingMatches.length > 10 && (
                <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Showing 10 of {queueItems.length} pending — sorted by priority
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onNavigateAlerts}>
                    See all <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Session decisions log */}
      {decidedInSession > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span><strong className="text-foreground">{decidedInSession}</strong> decision{decidedInSession !== 1 ? 's' : ''} made this session</span>
                <span className="text-xs">·</span>
                <span className="text-xs">{Object.values(quickDecisions).filter(d => d === 'Accepted').length} accepted</span>
                <span className="text-xs">·</span>
                <span className="text-xs">{Object.values(quickDecisions).filter(d => d === 'Rejected').length} rejected</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onNavigateAlerts}>
                View in Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────

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

function CheckerKpi({ label, value, subtext, icon, variant, onClick }: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
  onClick?: () => void;
}) {
  const valColor = variant === 'danger'
    ? 'text-destructive'
    : variant === 'warning'
    ? 'text-status-possible'
    : 'text-foreground';

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${valColor}`}>{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
