import { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Newspaper, CreditCard, User, MapPin, Calendar, Hash,
  Edit, UserPlus, ArrowRightLeft, Archive, Trash2, RefreshCw, ToggleRight,
  ChevronDown, MessageSquare, Send, Clock, FileText, Activity, AlertTriangle,
  ChevronUp, LayoutDashboard, ChevronRight, ChevronLeft, Eye, Info, Download, PanelRightOpen, PanelRightClose,
  Building2, Ship, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getCaseById, getMatchesForCase, getGroupById, groups, cases, updateCase, updateMatch, recalcCaseCounts } from '@/data/mock-data';
import { generateMediaCheckResult } from '@/data/media-mock-data';
import { generatePassportCheckResult } from '@/data/passport-mock-data';
import { ResultsView } from '@/components/screening/ResultsView';
import { MediaCheckResultsView } from '@/components/screening/MediaCheckResultsView';
import { PassportCheckResultsView } from '@/components/screening/PassportCheckResultsView';
import type { CheckType, MediaCheckResult, PassportCheckResult, CaseAuditEvent, AuditEventType, AuditEventDetails, RiskLevel, EntityType } from '@/types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { exportCasePdf, exportMatchesToCsv } from '@/lib/export';

// ─── Constants ───────────────────────────────────────────────
const checkTypeIcons: Record<CheckType, React.ReactNode> = {
  'Watchlists': <Shield className="h-3.5 w-3.5" />,
  'Adverse Media': <Newspaper className="h-3.5 w-3.5" />,
  'Passport Check': <CreditCard className="h-3.5 w-3.5" />,
};

const entityTypeIcon: Record<EntityType, React.ReactNode> = {
  'Individual': <User className="h-5 w-5 text-primary" />,
  'Organisation': <Building2 className="h-5 w-5 text-primary" />,
  'Vessel': <Ship className="h-5 w-5 text-primary" />,
  'Unspecified': <HelpCircle className="h-5 w-5 text-primary" />,
};

const analysts = ['John Smith', 'Jane Doe', 'Alex Turner', 'Maria Lopez', 'Sam Wilson'];

const auditTypeIcon: Record<AuditEventType, React.ReactNode> = {
  note: <MessageSquare className="h-3 w-3" />,
  assign: <UserPlus className="h-3 w-3" />,
  move: <ArrowRightLeft className="h-3 w-3" />,
  edit: <Edit className="h-3 w-3" />,
  rescreen: <RefreshCw className="h-3 w-3" />,
  ogs_toggle: <ToggleRight className="h-3 w-3" />,
  archive: <Archive className="h-3 w-3" />,
  status_change: <Shield className="h-3 w-3" />,
  created: <FileText className="h-3 w-3" />,
};

const auditTypeLabel: Record<AuditEventType, string> = {
  note: 'Note', assign: 'Assignment', move: 'Group Move', edit: 'Edit',
  rescreen: 'Rescreen', ogs_toggle: 'OGS', archive: 'Archive',
  status_change: 'Resolution', created: 'Created',
};

type CaseTab = 'summary' | CheckType;
const AUDIT_PAGE_SIZE = 20;

// ─── Verbose Event Detail ────────────────────────────────────
function AuditEventDetailView({ details, type }: { details: AuditEventDetails; type: AuditEventType }) {
  if (type === 'rescreen' || type === 'created') {
    return (
      <div className="mt-1.5 p-2 rounded bg-muted/60 text-[11px] space-y-1.5">
        <div className="flex gap-3 text-muted-foreground">
          <span>Found: <span className="text-foreground font-medium">{details.matchesFound}</span></span>
          <span>Updated: <span className="text-foreground font-medium">{details.matchesUpdated}</span></span>
          <span>Auto-remediated: <span className="text-foreground font-medium">{details.matchesAutoRemediated}</span></span>
        </div>
        {details.matchDetails && details.matchDetails.length > 0 && (
          <div className="border-t border-border/50 pt-1.5 space-y-1">
            {details.matchDetails.map(m => (
              <div key={m.matchId} className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground w-14 shrink-0">{m.matchId}</span>
                <span className="truncate flex-1">{m.matchedName}</span>
                <span className="text-muted-foreground">{m.strength}%</span>
                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                  m.action === 'new' ? 'border-blue-500 text-blue-600'
                  : m.action === 'updated' ? 'border-amber-500 text-amber-600'
                  : m.action === 'auto_remediated' ? 'border-green-500 text-green-600'
                  : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {m.action === 'auto_remediated' ? 'auto-rem.' : m.action === 'no_change' ? 'unchanged' : m.action}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (type === 'edit' || type === 'status_change') {
    return (
      <div className="mt-1.5 p-2 rounded bg-muted/60 text-[11px] flex items-center gap-2">
        {details.fieldChanged && <span className="text-muted-foreground">{details.fieldChanged}:</span>}
        <span className="line-through text-muted-foreground">{details.previousValue}</span>
        <span>→</span>
        <span className="font-medium text-foreground">{details.newValue}</span>
      </div>
    );
  }
  return null;
}

// ─── Audit Trail Component (paginated) ──────────────────────
function AuditTrailPanel({
  allEvents,
  localEvents,
  onAddNote,
}: {
  allEvents: CaseAuditEvent[];
  localEvents: CaseAuditEvent[];
  onAddNote: (text: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | AuditEventType>('all');
  const [visibleCount, setVisibleCount] = useState(AUDIT_PAGE_SIZE);
  const [newNote, setNewNote] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEvent = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const merged = useMemo(() => {
    const combined = [...allEvents, ...localEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter === 'all') return combined;
    return combined.filter(e => e.type === filter);
  }, [allEvents, localEvents, filter]);

  const visible = merged.slice(0, visibleCount);
  const hasMore = visibleCount < merged.length;
  const totalCount = allEvents.length + localEvents.length;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote('');
  };

  return (
    <div className="p-3 sm:p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Audit Trail
        </h3>
        <Badge variant="secondary" className="text-[10px]">{totalCount} events</Badge>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(['all', 'note', 'assign', 'edit', 'rescreen', 'status_change', 'move'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setVisibleCount(AUDIT_PAGE_SIZE); }}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All' : auditTypeLabel[f]}
          </button>
        ))}
      </div>

      {/* Timeline with load-more */}
      <ScrollArea className="h-[350px] xl:h-[450px]">
        <div className="space-y-0">
          {visible.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">No matching events.</p>
          )}
          {visible.map((event, idx) => {
            const hasDetails = !!event.details;
            const isExpanded = expandedEvents.has(event.id);
            return (
              <div key={event.id} className="relative pl-6 pb-3">
                {idx < visible.length - 1 && (
                  <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                )}
                <div className={`absolute left-0 top-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                  event.type === 'created' ? 'bg-primary text-primary-foreground'
                  : event.type === 'status_change' ? 'bg-status-positive/20 text-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}>
                  {auditTypeIcon[event.type]}
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">{event.author}</span>
                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{event.createdAt}</span>
                    {hasDetails && (
                      <button
                        onClick={() => toggleEvent(event.id)}
                        className="ml-auto flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                      >
                        <Info className="h-2.5 w-2.5" />
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5">{event.text}</p>
                  {event.comment && (
                    <div className="mt-1 p-1.5 rounded bg-muted/50 text-muted-foreground italic text-[11px]">
                      "{event.comment}"
                    </div>
                  )}
                  {hasDetails && isExpanded && (
                    <AuditEventDetailView details={event.details!} type={event.type} />
                  )}
                </div>
              </div>
            );
          })}
          {hasMore && (
            <div className="pt-1 pb-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-muted-foreground"
                onClick={() => setVisibleCount(c => c + AUDIT_PAGE_SIZE)}
              >
                Load {Math.min(AUDIT_PAGE_SIZE, merged.length - visibleCount)} more of {merged.length - visibleCount} remaining
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add note */}
      <div className="border-t pt-3 mt-2">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note or comment..."
          className="min-h-[60px] text-xs mb-2 resize-none"
          rows={2}
        />
        <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={handleAddNote} disabled={!newNote.trim()}>
          <Send className="h-3 w-3" /> Add Note
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const caseData = useMemo(() => id ? getCaseById(id) : undefined, [id, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => id ? getMatchesForCase(id) : [], [id, version]);

  // Case-level navigation
  const caseIndex = caseData ? cases.findIndex(c => c.id === caseData.id) : -1;
  const hasPrevCase = caseIndex > 0;
  const hasNextCase = caseIndex >= 0 && caseIndex < cases.length - 1;
  const goToCase = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? caseIndex - 1 : caseIndex + 1;
    if (newIndex >= 0 && newIndex < cases.length) {
      navigate(`/cases/${cases[newIndex].id}`);
    }
  };

  // Tab from URL: 'summary' or a CheckType
  // Default to first check type with action required if no tab specified
  const activeTab = useMemo((): CaseTab => {
    if (searchParams.has('tab')) return searchParams.get('tab') === 'summary' ? 'summary' : searchParams.get('tab') as CheckType;
    if (!caseData?.mandatoryAction) return 'summary';
    const wcAction = matches.some(m => m.reviewRequired || m.status === 'Unresolved');
    if (wcAction && caseData.checkTypes.includes('Watchlists')) return 'Watchlists';
    if (caseData.checkTypes.includes('Adverse Media')) return 'Adverse Media';
    if (caseData.checkTypes.includes('Passport Check')) return 'Passport Check';
    return 'summary';
  }, [searchParams, caseData, matches]);

  const setActiveTab = (tab: CaseTab) => {
    const params: Record<string, string> = { tab };
    if (tab !== 'summary' && tab !== 'Adverse Media' && tab !== 'Passport Check') {
      const bucket = searchParams.get('bucket');
      if (bucket) params.bucket = bucket;
    }
    setSearchParams(params, { replace: true });
  };

  // Legacy: support ?check= param
  const legacyCheck = searchParams.get('check');
  const effectiveTab = legacyCheck && !searchParams.has('tab') ? legacyCheck as CheckType : activeTab;

  // Workflow dialogs
  const [editDialog, setEditDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [moveDialog, setMoveDialog] = useState(false);
  const [rescreenDialog, setRescreenDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [ratingDialog, setRatingDialog] = useState(false);
  const [newRating, setNewRating] = useState<RiskLevel>(caseData?.rating || 'Low');
  const [ratingHistory, setRatingHistory] = useState<{ from: string; to: string; comment: string; author: string; date: string }[]>([]);
  const [ogsDialog, setOgsDialog] = useState(false);
  const [ogsWcLocal, setOgsWcLocal] = useState(caseData?.ogsWorldCheck ?? false);
  const [ogsMcLocal, setOgsMcLocal] = useState(caseData?.ogsMediaCheck ?? false);
  const [actionComment, setActionComment] = useState('');
  const [localAuditEvents, setLocalAuditEvents] = useState<CaseAuditEvent[]>([]);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  // Controlled state for dialogs
  const [editAssignee, setEditAssignee] = useState(caseData?.assignee || '');
  const [editGroupId, setEditGroupId] = useState(caseData?.groupId || '');
  const [editName, setEditName] = useState(caseData?.name || '');
  const [editEntityType, setEditEntityType] = useState<EntityType>(caseData?.entityType || 'Individual');
  const [editDob, setEditDob] = useState(caseData?.screeningData?.dob || '');
  const [editGender, setEditGender] = useState(caseData?.screeningData?.gender || '');
  const [editNationality, setEditNationality] = useState(caseData?.screeningData?.nationality || '');
  const [editCountry, setEditCountry] = useState(caseData?.screeningData?.country || '');
  const [editIdType, setEditIdType] = useState(caseData?.screeningData?.idType || '');
  const [editIdNumber, setEditIdNumber] = useState(caseData?.screeningData?.idNumber || '');

  const addAuditEvent = (type: AuditEventType, text: string, comment?: string) => {
    setLocalAuditEvents(prev => [...prev, {
      id: `audit-${Date.now()}`,
      type, author: 'Current User', text,
      comment: comment || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    }]);
  };

  const handleActionWithComment = (type: AuditEventType, text: string, closeDialog: () => void) => {
    addAuditEvent(type, text, actionComment || undefined);
    setActionComment('');
    closeDialog();
  };

  const mediaResult: MediaCheckResult | null = useMemo(() => {
    if (!caseData || !caseData.checkTypes.includes('Adverse Media')) return null;
    return generateMediaCheckResult(caseData.id, caseData.name);
  }, [caseData?.id]);

  const passportResult: PassportCheckResult | null = useMemo(() => {
    if (!caseData || !caseData.checkTypes.includes('Passport Check')) return null;
    return generatePassportCheckResult(caseData.id, {
      givenName: caseData.name.split(' ')[0] || '',
      lastName: caseData.name.split(' ').slice(1).join(' ') || '',
      gender: 'Male', issuingState: 'USA', nationality: 'USA', dob: '1975-06-15',
      documentType: 'Passport',
      identificationNumber: `P${Math.floor(Math.random() * 900000000 + 100000000)}`,
      dateOfExpiry: '2028-06-15',
    });
  }, [caseData?.id]);

  const actionCheckTypes = useMemo(() => {
    if (!caseData) return [];
    const types: string[] = [];
    if (matches.some(m => m.reviewRequired || m.status === 'Unresolved')) types.push('WL');
    if (caseData.checkTypes.includes('Adverse Media')) types.push('AM');
    if (caseData.checkTypes.includes('Passport Check')) types.push('PC');
    return types;
  }, [matches, caseData]);

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Case not found.</p>
        <Link to="/cases"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Cases</Button></Link>
      </div>
    );
  }

  const group = getGroupById(caseData.groupId);
  const sd = caseData.screeningData;
  const wcMatches = matches.length;
  const highRiskMatches = matches.filter(m => m.riskLevel === 'High').length;
  const allTabs: CaseTab[] = ['summary', ...caseData.checkTypes];

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-3">
        <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Cases
        </Link>
        {cases.length > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!hasPrevCase} onClick={() => goToCase('prev')}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground font-mono px-1">{caseIndex + 1}/{cases.length}</span>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!hasNextCase} onClick={() => goToCase('next')}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Case Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
            {entityTypeIcon[caseData.entityType]}
          </div>
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-lg sm:text-xl font-bold truncate">{caseData.name}</h1>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 cursor-pointer hover:opacity-80 transition-opacity gap-1 ${
                caseData.rating === 'High' ? 'border-destructive text-destructive'
                : caseData.rating === 'Medium' ? 'border-amber-500 text-amber-600'
                : 'border-muted-foreground text-muted-foreground'
              }`}
              onClick={() => { setActionComment(''); setRatingDialog(true); }}
            >
              {caseData.rating === 'None' ? 'Not Rated' : `${caseData.rating} Risk`}
              <Edit className="h-2.5 w-2.5" />
            </Badge>
            {caseData.mandatoryAction && (
              <Badge variant="destructive" className="text-[10px] shrink-0 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Action Required
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{caseData.id}</span>
            <span className="hidden sm:inline">•</span>
            <span className="group/grp inline-flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => { setActionComment(''); setMoveDialog(true); }}>
              {group?.name || '—'}
              <Edit className="h-2.5 w-2.5 opacity-0 group-hover/grp:opacity-100 transition-opacity" />
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="group/assign inline-flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => { setActionComment(''); setAssignDialog(true); }}>
              Assigned: <span className="text-foreground font-medium">{caseData.assignee}</span>
              <Edit className="h-2.5 w-2.5 opacity-0 group-hover/assign:opacity-100 transition-opacity" />
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="group/ogs inline-flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => { setOgsWcLocal(caseData.ogsWorldCheck); setOgsMcLocal(caseData.ogsMediaCheck); setActionComment(''); setOgsDialog(true); }}>
              OGS: <span className={caseData.ogsWorldCheck || caseData.ogsMediaCheck ? 'text-foreground font-medium' : ''}>
                {caseData.ogsWorldCheck && caseData.ogsMediaCheck ? 'WL + AM' : caseData.ogsWorldCheck ? 'WL' : caseData.ogsMediaCheck ? 'AM' : 'Off'}
              </span>
              <Edit className="h-2.5 w-2.5 opacity-0 group-hover/ogs:opacity-100 transition-opacity" />
            </span>
          </div>
        </div>
        </div>

        <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 shrink-0">
                  <Download className="h-3.5 w-3.5" /> <span className="hidden md:inline">Export</span> <ChevronDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="md:hidden text-xs">Export</TooltipContent>
            </Tooltip>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => exportCasePdf(caseData, matches)}>
              <FileText className="h-3.5 w-3.5 mr-2" /> Case Report (PDF)
            </DropdownMenuItem>
            {matches.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportMatchesToCsv(matches, caseData.name)}>
                  <FileText className="h-3.5 w-3.5 mr-2" /> All Matches CSV ({matches.length})
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => setAuditDrawerOpen(v => !v)}>
              {auditDrawerOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">Audit / Notes</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="md:hidden text-xs">Audit / Notes</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 shrink-0">
              <span className="hidden md:inline">Actions</span> <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => { setActionComment(''); setEditDialog(true); }}><Edit className="h-3.5 w-3.5 mr-2" /> Edit Case</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActionComment(''); setAssignDialog(true); }}><UserPlus className="h-3.5 w-3.5 mr-2" /> Reassign</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActionComment(''); setMoveDialog(true); }}><ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Move Group</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setActionComment(''); setRescreenDialog(true); }}><RefreshCw className="h-3.5 w-3.5 mr-2" /> Rescreen</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActionComment(''); setOgsDialog(true); }}><ToggleRight className="h-3.5 w-3.5 mr-2" /> Ongoing Screening</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setActionComment(''); setArchiveDialog(true); }}><Archive className="h-3.5 w-3.5 mr-2" /> Archive</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => { setActionComment(''); setDeleteDialog(true); }}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* ── Tabs: Summary + Check Types ── */}
      <div className="inline-flex gap-1 mb-4 p-1 bg-muted rounded-lg overflow-x-auto">
        {allTabs.map(tab => {
          const isActive = effectiveTab === tab;
          const icon = tab === 'summary'
            ? <LayoutDashboard className="h-3.5 w-3.5" />
            : checkTypeIcons[tab as CheckType];
          const label = tab === 'summary' ? 'Summary' : tab;
          const shortLabel = tab === 'summary' ? 'Summary'
            : tab === 'Watchlists' ? 'WL'
            : tab === 'Adverse Media' ? 'AM' : 'PC';
          // Count of items requiring action
          const actionCount = tab === 'Watchlists'
            ? matches.filter(m => m.reviewRequired || m.status === 'Unresolved').length
            : tab === 'Adverse Media'
            ? (mediaResult?.reviewRequired ?? 0)
            : tab === 'Passport Check'
            ? (passportResult?.verificationStatus === 'pending' ? 1 : 0)
            : 0;
          return (
            <Tooltip key={tab}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 min-w-0 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                  {actionCount > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px] shrink-0">
                      {actionCount}
                    </Badge>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden text-xs">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* ── SUMMARY TAB ── */}
      {effectiveTab === 'summary' && (
        <div className="space-y-4">
            {/* Combined risk & resolution strip */}
            {/* Combined risk & resolution strip */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {/* Rating card with edit action */}
              <Card className="p-2.5 text-center col-span-1 relative group">
                <span className="text-[10px] text-muted-foreground block">Rating</span>
                <div className={`text-base font-bold ${
                  caseData.rating === 'High' ? 'text-destructive'
                  : caseData.rating === 'Medium' ? 'text-amber-600'
                  : 'text-foreground'
                }`}>{caseData.rating === 'None' ? 'Not Rated' : caseData.rating}</div>
                <button
                  onClick={() => { setActionComment(''); setRatingDialog(true); }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                  title="Edit rating"
                >
                  <Edit className="h-3 w-3 text-muted-foreground" />
                </button>
              </Card>
              {/* Matches card - click through to World-Check */}
              <Card
                className="p-2.5 text-center col-span-1 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => { setActiveTab('Watchlists'); }}
                >
                <span className="text-[10px] text-muted-foreground block">Matches</span>
                <div className="text-base font-bold">{wcMatches}</div>
                {highRiskMatches > 0 && <span className="text-[9px] text-destructive">{highRiskMatches} high</span>}
              </Card>
              {/* Resolution bucket cards - click through to WC tab with bucket */}
              {([
                { label: 'Unres.', bucket: 'unresolved', count: caseData.unresolvedCount, cls: 'status-unresolved' },
                { label: 'Pos.', bucket: 'positive', count: caseData.positiveCount, cls: 'status-positive' },
                { label: 'Poss.', bucket: 'possible', count: caseData.possibleCount, cls: 'status-possible' },
                { label: 'False', bucket: 'false', count: caseData.falseCount, cls: 'status-false' },
                { label: 'Unk.', bucket: 'unknown', count: caseData.unknownCount, cls: 'status-unknown' },
              ] as const).map(b => (
                <Card
                  key={b.label}
                  className="p-2.5 text-center col-span-1 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSearchParams({ tab: 'Watchlists', bucket: b.bucket }, { replace: true })}
                >
                  <span className="text-[10px] text-muted-foreground block">{b.label}</span>
                  <div className={`text-base font-bold ${b.cls}`}>{b.count}</div>
                </Card>
              ))}
            </div>

            {/* Screening Data & Identifiers */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Screening Data
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5 text-xs">
                {sd.dob && <div><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> DOB</span><span className="font-medium block mt-0.5">{sd.dob}</span></div>}
                {sd.gender && <div><span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Gender</span><span className="font-medium block mt-0.5">{sd.gender}</span></div>}
                {sd.nationality && <div><span className="text-muted-foreground">Nationality</span><span className="font-medium block mt-0.5">{sd.nationality}</span></div>}
                {sd.country && <div><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Country</span><span className="font-medium block mt-0.5">{sd.country}</span></div>}
              </div>
              {(sd.idType || sd.secondaryIdType) && (
                <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {sd.idType && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div><span className="text-muted-foreground text-[11px]">{sd.idType}</span><span className="font-medium font-mono block">{sd.idNumber || '—'}</span></div>
                    </div>
                  )}
                  {sd.secondaryIdType && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div><span className="text-muted-foreground text-[11px]">{sd.secondaryIdType}</span><span className="font-medium font-mono block">{sd.secondaryIdNumber || '—'}</span></div>
                    </div>
                  )}
                </div>
              )}
              {sd.customFields && Object.keys(sd.customFields).length > 0 && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                  {Object.entries(sd.customFields).map(([key, val]) => (
                    <div key={key}><span className="text-muted-foreground">{key}</span><span className="font-medium block mt-0.5">{val}</span></div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
                <span>Created: {caseData.createdAt}</span>
                <span>Screened: {caseData.lastScreenedAt}</span>
                <span>Mode: {caseData.mode}</span>
                <span>OGS WL: {caseData.ogsWorldCheck ? group?.ongoingFrequency : 'Off'}</span>
                <span>OGS AM: {caseData.ogsMediaCheck ? group?.ongoingFrequency : 'Off'}</span>
              </div>
            </Card>

            {/* Active Checks - compact row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {caseData.checkTypes.map(ct => (
                <button
                  key={ct}
                  onClick={() => setActiveTab(ct)}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {checkTypeIcons[ct]}
                    <div>
                      <span className="text-sm font-medium">{ct}</span>
                      {ct === 'Watchlists' && <span className="text-[11px] text-muted-foreground block">{wcMatches} matches</span>}
                      {ct === 'Adverse Media' && mediaResult && <span className="text-[11px] text-muted-foreground block">{mediaResult.totalArticles} articles</span>}
                      {ct === 'Passport Check' && passportResult && (
                        <span className={`text-[11px] block ${passportResult.verificationStatus === 'verified' ? 'status-positive' : 'status-unresolved'}`}>
                          {passportResult.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ── CHECK TYPE TABS ── */}
      {effectiveTab !== 'summary' && (
        <div className="min-w-0">
          {effectiveTab === 'Watchlists' && (
            <ResultsView matches={matches} caseName={caseData.name} caseId={caseData.id} checkTypes={['Watchlists']} screeningData={caseData.screeningData} onMatchUpdated={refresh} />
          )}
          {effectiveTab === 'Adverse Media' && mediaResult && (
            <MediaCheckResultsView result={mediaResult} caseName={caseData.name} caseId={caseData.id} />
          )}
          {effectiveTab === 'Passport Check' && passportResult && (
            <PassportCheckResultsView result={passportResult} caseName={caseData.name} caseId={caseData.id} />
          )}
        </div>
      )}

      {/* ── Audit Trail Drawer ── */}
      <Sheet open={auditDrawerOpen} onOpenChange={setAuditDrawerOpen}>
        <SheetContent className="w-[380px] sm:w-[420px] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm">Audit Trail</SheetTitle>
          </SheetHeader>
          <div className="p-0">
            <AuditTrailPanel
              allEvents={caseData.auditTrail}
              localEvents={localAuditEvents}
              onAddNote={(text) => addAuditEvent('note', 'Added note', text)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── ACTION DIALOGS ── */}
      <Dialog open={assignDialog} onOpenChange={v => { setAssignDialog(v); if (v) setEditAssignee(caseData.assignee); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reassign Case</DialogTitle><DialogDescription>Select a new analyst for {caseData.name}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Select value={editAssignee} onValueChange={setEditAssignee}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{analysts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label><Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Reason for reassignment..." className="min-h-[60px] text-xs resize-none" /></div>
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setAssignDialog(false)}>Cancel</Button><Button size="sm" onClick={() => { updateCase(caseData.id, { assignee: editAssignee }); handleActionWithComment('assign', `Reassigned to ${editAssignee}`, () => setAssignDialog(false)); refresh(); }}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialog} onOpenChange={v => { setMoveDialog(v); if (v) setEditGroupId(caseData.groupId); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Move to Group</DialogTitle><DialogDescription>Move {caseData.name} to a different screening group</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Select value={editGroupId} onValueChange={setEditGroupId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label><Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Reason for moving..." className="min-h-[60px] text-xs resize-none" /></div>
          </div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setMoveDialog(false)}>Cancel</Button><Button size="sm" onClick={() => { const newGroup = getGroupById(editGroupId); updateCase(caseData.id, { groupId: editGroupId }); handleActionWithComment('move', `Moved to ${newGroup?.name || editGroupId}`, () => setMoveDialog(false)); refresh(); }}>Move</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescreenDialog} onOpenChange={setRescreenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rescreen Case</DialogTitle><DialogDescription>Initiate a manual rescreen for {caseData.name}</DialogDescription></DialogHeader>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label><Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Reason for rescreening..." className="min-h-[60px] text-xs resize-none" /></div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setRescreenDialog(false)}>Cancel</Button><Button size="sm" onClick={() => handleActionWithComment('rescreen', 'Manual rescreen initiated', () => setRescreenDialog(false))}>Rescreen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveDialog} onOpenChange={setArchiveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Archive Case</DialogTitle><DialogDescription>This will remove the case from active screening</DialogDescription></DialogHeader>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label><Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Reason for archiving..." className="min-h-[60px] text-xs resize-none" /></div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setArchiveDialog(false)}>Cancel</Button><Button size="sm" onClick={() => { updateCase(caseData.id, { status: 'Archived' }); handleActionWithComment('archive', 'Case archived', () => setArchiveDialog(false)); navigate('/cases'); }}>Archive</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Delete Case</DialogTitle><DialogDescription>This action cannot be undone</DialogDescription></DialogHeader>
          <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (required)</label><Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Reason for deletion..." className="min-h-[60px] text-xs resize-none" /></div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setDeleteDialog(false)}>Cancel</Button><Button variant="destructive" size="sm" disabled={!actionComment.trim()} onClick={() => { updateCase(caseData.id, { status: 'Deleted' }); handleActionWithComment('archive', 'Case deleted', () => setDeleteDialog(false)); navigate('/cases'); }}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog} onOpenChange={v => { setEditDialog(v); if (v && caseData) { setEditName(caseData.name); setEditEntityType(caseData.entityType); setEditDob(sd.dob || ''); setEditGender(sd.gender || ''); setEditNationality(sd.nationality || ''); setEditCountry(sd.country || ''); setEditIdType(sd.idType || ''); setEditIdNumber(sd.idNumber || ''); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Case</DialogTitle><DialogDescription>Update case screening data and identifiers</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Case Name</label><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Entity Type</label><Select value={editEntityType} onValueChange={v => setEditEntityType(v as EntityType)}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{(['Individual', 'Organisation', 'Vessel', 'Unspecified'] as const).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">DOB</label><Input value={editDob} onChange={e => setEditDob(e.target.value)} className="h-8 text-sm" type="date" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label><Select value={editGender} onValueChange={setEditGender}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Nationality</label><Input value={editNationality} onChange={e => setEditNationality(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Country</label><Input value={editCountry} onChange={e => setEditCountry(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Primary ID Type</label><Input value={editIdType} onChange={e => setEditIdType(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Primary ID Number</label><Input value={editIdNumber} onChange={e => setEditIdNumber(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div className="mt-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label><Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Describe what was changed..." className="min-h-[60px] text-xs resize-none" /></div>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setEditDialog(false)}>Cancel</Button><Button size="sm" onClick={() => { updateCase(caseData.id, { name: editName, entityType: editEntityType, screeningData: { ...caseData.screeningData, dob: editDob || undefined, gender: editGender || undefined, nationality: editNationality || undefined, country: editCountry || undefined, idType: editIdType || undefined, idNumber: editIdNumber || undefined } }); handleActionWithComment('edit', 'Case details updated', () => setEditDialog(false)); refresh(); }}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Edit Dialog */}
      <Dialog open={ratingDialog} onOpenChange={(open) => { setRatingDialog(open); if (open) setNewRating(caseData.rating); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Case Rating</DialogTitle>
            <DialogDescription>Change the risk rating for {caseData.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">New Rating</label>
              <div className="flex gap-2">
                {(['High', 'Medium', 'Low', 'None'] as RiskLevel[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setNewRating(r)}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium border transition-all ${
                      newRating === r
                        ? r === 'High' ? 'bg-destructive text-destructive-foreground border-destructive'
                          : r === 'Medium' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (required)</label>
              <Textarea
                value={actionComment}
                onChange={e => setActionComment(e.target.value)}
                placeholder="Reason for rating change..."
                className="min-h-[60px] text-xs resize-none"
              />
            </div>

            {/* Historical rating changes */}
            {ratingHistory.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Rating History</label>
                <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                  {ratingHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-[11px]">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="line-through text-muted-foreground">{h.from}</span>
                          <span>→</span>
                          <span className={`font-medium ${h.to === 'High' ? 'text-destructive' : h.to === 'Medium' ? 'text-amber-600' : 'text-foreground'}`}>{h.to}</span>
                          <span className="text-muted-foreground ml-auto shrink-0">{h.date}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground">{h.author}</span>: {h.comment}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRatingDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!actionComment.trim() || newRating === caseData.rating}
              onClick={() => {
                const oldRating = caseData.rating;
                updateCase(caseData.id, { rating: newRating });
                setRatingHistory(prev => [{
                  from: oldRating,
                  to: newRating,
                  comment: actionComment,
                  author: 'Current User',
                  date: new Date().toISOString().split('T')[0],
                }, ...prev]);
                addAuditEvent('edit', `Rating changed from ${oldRating} to ${newRating}`, actionComment);
                setActionComment('');
                setRatingDialog(false);
                refresh();
              }}
            >
              Update Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OGS Dialog */}
      <Dialog open={ogsDialog} onOpenChange={setOgsDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ongoing Screening</DialogTitle>
            <DialogDescription>Configure OGS monitoring for {caseData.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <span className="text-sm font-medium">Watchlists</span>
                  <span className="text-[11px] text-muted-foreground block">Sanctions, PEP & watchlist monitoring</span>
                </div>
                <Switch checked={ogsWcLocal} onCheckedChange={setOgsWcLocal} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <span className="text-sm font-medium">Adverse Media</span>
                  <span className="text-[11px] text-muted-foreground block">Adverse media monitoring</span>
                </div>
                <Switch checked={ogsMcLocal} onCheckedChange={setOgsMcLocal} />
              </div>
            </div>
            {group?.ongoingFrequency && (
              <p className="text-[11px] text-muted-foreground">Frequency: <span className="font-medium text-foreground">{group.ongoingFrequency}</span></p>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Comment (optional)</label>
              <Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="Reason for change..." className="min-h-[60px] text-xs resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOgsDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              const changes: string[] = [];
              if (ogsWcLocal !== caseData.ogsWorldCheck) changes.push(`OGS Watchlists ${ogsWcLocal ? 'enabled' : 'disabled'}`);
              if (ogsMcLocal !== caseData.ogsMediaCheck) changes.push(`OGS Adverse Media ${ogsMcLocal ? 'enabled' : 'disabled'}`);
              updateCase(caseData.id, { ogsWorldCheck: ogsWcLocal, ogsMediaCheck: ogsMcLocal });
              if (changes.length > 0) addAuditEvent('ogs_toggle', changes.join(', '), actionComment || undefined);
              setActionComment('');
              setOgsDialog(false);
              refresh();
            }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
