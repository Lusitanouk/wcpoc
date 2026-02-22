import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Download, Filter, Calendar, BarChart3, PieChart,
  Table2, Plus, X, GripVertical, Play, Clock, Star, Search,
  ChevronRight, Eye, Copy, Trash2, Settings2, ArrowUpDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { ResponsiveTabsTrigger } from '@/components/ui/responsive-tabs-trigger';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import FilterBar, { type FilterDefinition } from '@/components/FilterBar';

// ─── Types ────────────────────────────────────────────────────
interface StandardReport {
  id: string;
  name: string;
  description: string;
  category: 'screening' | 'compliance' | 'audit' | 'risk';
  format: string[];
  lastRun?: string;
  scheduled?: string;
  starred?: boolean;
}

interface CustomReport {
  id: string;
  name: string;
  description: string;
  fields: string[];
  filters: Record<string, string>;
  createdAt: string;
  lastRun?: string;
  author: string;
}

type ReportField = {
  id: string;
  label: string;
  group: string;
};

// ─── Mock Data ────────────────────────────────────────────────
const STANDARD_REPORTS: StandardReport[] = [
  { id: 'sr-1', name: 'Screening Summary', description: 'Overview of all screening activity including match counts, resolution rates, and turnaround times.', category: 'screening', format: ['PDF', 'CSV', 'XLSX'], lastRun: '2025-01-15 09:30', scheduled: 'Weekly', starred: true },
  { id: 'sr-2', name: 'Case Audit Report', description: 'Detailed audit trail for all case actions, assignments, and status changes.', category: 'audit', format: ['PDF', 'CSV'], lastRun: '2025-01-14 14:00', starred: true },
  { id: 'sr-3', name: 'Match Resolution Report', description: 'Breakdown of match resolutions by status, risk level, analyst, and time period.', category: 'compliance', format: ['PDF', 'CSV', 'XLSX'], lastRun: '2025-01-13 11:15' },
  { id: 'sr-4', name: 'OGS Status Report', description: 'Ongoing screening status with upcoming and overdue re-screening schedules.', category: 'screening', format: ['PDF', 'CSV'], lastRun: '2025-01-12 08:45', scheduled: 'Daily' },
  { id: 'sr-5', name: 'Risk Distribution Analysis', description: 'Distribution of risk ratings across entity types, groups, and datasets.', category: 'risk', format: ['PDF', 'XLSX'], lastRun: '2025-01-10 16:20' },
  { id: 'sr-6', name: 'Analyst Performance', description: 'Analyst workload metrics including cases assigned, resolved, and average resolution time.', category: 'compliance', format: ['PDF', 'CSV'] },
  { id: 'sr-7', name: 'Sanctions Exposure Summary', description: 'Summary of sanctions hits by jurisdiction, list type, and entity.', category: 'risk', format: ['PDF', 'CSV', 'XLSX'], starred: true },
  { id: 'sr-8', name: 'PEP Monitoring Report', description: 'Politically exposed persons monitoring with status changes and new matches.', category: 'risk', format: ['PDF'] },
  { id: 'sr-9', name: 'Batch Screening Report', description: 'Results and statistics from batch screening uploads.', category: 'screening', format: ['CSV', 'XLSX'], lastRun: '2025-01-11 10:00' },
  { id: 'sr-10', name: 'Regulatory Compliance Summary', description: 'Compliance metrics for regulatory reporting requirements.', category: 'compliance', format: ['PDF'], scheduled: 'Monthly' },
];

const CUSTOM_REPORTS: CustomReport[] = [
  { id: 'cr-1', name: 'High Risk Unresolved Matches', description: 'All unresolved matches with High priority across sanctions datasets', fields: ['Case ID', 'Entity Name', 'Match Name', 'Strength', 'Dataset', 'Priority'], filters: { status: 'Unresolved', priority: 'High' }, createdAt: '2025-01-05', lastRun: '2025-01-14', author: 'John Smith' },
  { id: 'cr-2', name: 'Weekly OGS Changes', description: 'Cases with updated matches requiring re-review from OGS', fields: ['Case ID', 'Entity Name', 'Review Required', 'Change Type', 'Date'], filters: { reviewRequired: 'true', period: 'Last 7 days' }, createdAt: '2024-12-20', lastRun: '2025-01-15', author: 'Sarah Chen' },
];

const AVAILABLE_FIELDS: ReportField[] = [
  { id: 'case_id', label: 'Case ID', group: 'Case' },
  { id: 'entity_name', label: 'Entity Name', group: 'Case' },
  { id: 'entity_type', label: 'Entity Type', group: 'Case' },
  { id: 'group', label: 'Group', group: 'Case' },
  { id: 'status', label: 'Case Status', group: 'Case' },
  { id: 'assignee', label: 'Assignee', group: 'Case' },
  { id: 'created_at', label: 'Created Date', group: 'Case' },
  { id: 'rating', label: 'Risk Rating', group: 'Case' },
  { id: 'match_name', label: 'Match Name', group: 'Match' },
  { id: 'match_strength', label: 'Match Strength', group: 'Match' },
  { id: 'match_status', label: 'Match Status', group: 'Match' },
  { id: 'match_dataset', label: 'Dataset', group: 'Match' },
  { id: 'match_risk', label: 'Risk Level', group: 'Match' },
  { id: 'match_priority', label: 'Priority', group: 'Match' },
  { id: 'resolution_reason', label: 'Resolution Reason', group: 'Resolution' },
  { id: 'resolved_by', label: 'Resolved By', group: 'Resolution' },
  { id: 'resolved_at', label: 'Resolved Date', group: 'Resolution' },
  { id: 'review_required', label: 'Review Required', group: 'Resolution' },
  { id: 'ogs_status', label: 'OGS Status', group: 'Screening' },
  { id: 'last_screened', label: 'Last Screened', group: 'Screening' },
  { id: 'check_types', label: 'Check Types', group: 'Screening' },
  { id: 'screening_mode', label: 'Screening Mode', group: 'Screening' },
];

const FIELD_GROUPS = [...new Set(AVAILABLE_FIELDS.map(f => f.group))];

const categoryColors: Record<string, string> = {
  screening: 'bg-primary/10 text-primary',
  compliance: 'bg-status-positive/15 text-status-positive',
  audit: 'bg-status-possible/15 text-status-possible',
  risk: 'bg-destructive/10 text-destructive',
};

const categoryIcons: Record<string, React.ReactNode> = {
  screening: <Search className="h-4 w-4" />,
  compliance: <FileText className="h-4 w-4" />,
  audit: <Clock className="h-4 w-4" />,
  risk: <BarChart3 className="h-4 w-4" />,
};

// ─── Component ────────────────────────────────────────────────
export default function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('standard');
  const [showFilters, setShowFilters] = useState(false);
  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    category: 'all', format: 'all', scheduled: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');

  const reportFilterDefs: FilterDefinition[] = [
    { key: 'category', label: 'Category', icon: <BarChart3 className="h-3 w-3" />, defaultValue: 'all', options: [{ value: 'all', label: 'All Categories' }, { value: 'screening', label: 'Screening' }, { value: 'compliance', label: 'Compliance' }, { value: 'audit', label: 'Audit' }, { value: 'risk', label: 'Risk' }] },
    { key: 'format', label: 'Format', icon: <FileText className="h-3 w-3" />, defaultValue: 'all', options: [{ value: 'all', label: 'All Formats' }, { value: 'PDF', label: 'PDF' }, { value: 'CSV', label: 'CSV' }, { value: 'XLSX', label: 'Excel' }] },
    { key: 'scheduled', label: 'Schedule', icon: <Clock className="h-3 w-3" />, defaultValue: 'all', options: [{ value: 'all', label: 'All' }, { value: 'scheduled', label: 'Scheduled Only' }, { value: 'on-demand', label: 'On-demand Only' }] },
  ];

  // Report builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderName, setBuilderName] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderFields, setBuilderFields] = useState<string[]>([]);
  const [builderFieldSearch, setBuilderFieldSearch] = useState('');
  const [builderFilterStatus, setBuilderFilterStatus] = useState('all');
  const [builderFilterDataset, setBuilderFilterDataset] = useState('all');
  const [builderFilterPeriod, setBuilderFilterPeriod] = useState('all');
  const [builderFilterPriority, setBuilderFilterPriority] = useState('all');

  // Preview dialog
  const [previewReport, setPreviewReport] = useState<StandardReport | null>(null);

  const filterCategory = filterValues.category || 'all';
  const filterFormat = filterValues.format || 'all';
  const filterScheduled = filterValues.scheduled || 'all';

  // Filtered standard reports
  const filteredReports = useMemo(() => {
    return STANDARD_REPORTS.filter(r => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (filterFormat !== 'all' && !r.format.includes(filterFormat)) return false;
      if (filterScheduled === 'scheduled' && !r.scheduled) return false;
      if (filterScheduled === 'on-demand' && r.scheduled) return false;
      if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase()) && !r.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [filterCategory, filterFormat, filterScheduled, searchQuery]);

  const starredReports = filteredReports.filter(r => r.starred);
  const otherReports = filteredReports.filter(r => !r.starred);
  const activeFilterCount = Object.entries(filterValues).filter(([, v]) => v !== 'all').length;

  const addBuilderField = (fieldId: string) => {
    if (!builderFields.includes(fieldId)) setBuilderFields(prev => [...prev, fieldId]);
  };
  const removeBuilderField = (fieldId: string) => setBuilderFields(prev => prev.filter(f => f !== fieldId));
  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setBuilderFields(prev => {
      const idx = prev.indexOf(fieldId);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };
  const resetBuilder = () => {
    setBuilderName(''); setBuilderDescription(''); setBuilderFields([]); setBuilderFieldSearch('');
    setBuilderFilterStatus('all'); setBuilderFilterDataset('all'); setBuilderFilterPeriod('all'); setBuilderFilterPriority('all');
  };
  const availableFieldsFiltered = AVAILABLE_FIELDS.filter(f =>
    !builderFieldSearch || f.label.toLowerCase().includes(builderFieldSearch.toLowerCase()) || f.group.toLowerCase().includes(builderFieldSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate, schedule, and export compliance reports</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { resetBuilder(); setBuilderOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> New Custom Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 h-auto gap-1 bg-muted p-1 rounded-lg">
          <ResponsiveTabsTrigger
            value="standard"
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Standard Reports"
            badge={<Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[9px]">{STANDARD_REPORTS.length}</Badge>}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md"
          />
          <ResponsiveTabsTrigger
            value="custom"
            icon={<Settings2 className="h-3.5 w-3.5" />}
            label="Custom Reports"
            badge={<Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[9px]">{CUSTOM_REPORTS.length}</Badge>}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md"
          />
        </TabsList>

        {/* ═══════ Standard Reports ═══════ */}
        <TabsContent value="standard">
          <div className="flex items-center gap-2 mb-4">
            {showFilters && (
              <div className="min-w-0">
                <FilterBar
                  filters={reportFilterDefs}
                  values={filterValues}
                  onChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
                  onClearAll={() => setFilterValues({ category: 'all', format: 'all', scheduled: 'all' })}
                />
              </div>
            )}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1 ml-auto shrink-0"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {!showFilters && activeFilterCount > 0 && <Badge className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">{activeFilterCount}</Badge>}
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              {/* Starred section */}
              {starredReports.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-status-possible fill-status-possible" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Starred</span>
                  </div>
                  {starredReports.map(report => (
                    <ReportRow key={report.id} report={report} onPreview={() => setPreviewReport(report)} />
                  ))}
                </>
              )}

              {/* All reports */}
              {otherReports.length > 0 && (
                <>
                  {starredReports.length > 0 && (
                    <div className="px-4 py-2 bg-muted/30 border-b border-t flex items-center gap-1.5">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">All Reports</span>
                    </div>
                  )}
                  {otherReports.map(report => (
                    <ReportRow key={report.id} report={report} onPreview={() => setPreviewReport(report)} />
                  ))}
                </>
              )}

              {filteredReports.length === 0 && (
                <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No reports match the current filters.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ═══════ Custom Reports ═══════ */}
        <TabsContent value="custom">
          <div className="space-y-4">
            {/* Custom reports list */}
            {CUSTOM_REPORTS.length > 0 ? (
              <div className="space-y-3">
                {CUSTOM_REPORTS.map(cr => (
                  <Card key={cr.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-primary shrink-0" />
                            <h3 className="text-sm font-semibold truncate">{cr.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cr.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cr.fields.map(f => (
                              <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            {Object.entries(cr.filters).map(([k, v]) => (
                              <span key={k} className="flex items-center gap-1">
                                <Filter className="h-2.5 w-2.5" /> {k}: <span className="font-medium text-foreground">{v}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <Play className="h-3 w-3" /> Run
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <Download className="h-3 w-3" /> Export
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-[10px] text-muted-foreground text-right">
                            <span>By {cr.author}</span>
                            {cr.lastRun && <span className="ml-2">· Last run {cr.lastRun}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Settings2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">No custom reports yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a custom report to get started</p>
                  <Button size="sm" className="mt-4 gap-1.5" onClick={() => { resetBuilder(); setBuilderOpen(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Create Report
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { resetBuilder(); setBuilderOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> New Custom Report
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════ Report Preview Dialog ═══════ */}
      <Dialog open={!!previewReport} onOpenChange={v => !v && setPreviewReport(null)}>
        <DialogContent className="sm:max-w-lg">
          {previewReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {categoryIcons[previewReport.category]}
                  {previewReport.name}
                </DialogTitle>
                <DialogDescription>{previewReport.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-md bg-muted/50">
                    <span className="text-muted-foreground block mb-0.5">Category</span>
                    <Badge className={`text-[10px] ${categoryColors[previewReport.category]}`}>{previewReport.category}</Badge>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <span className="text-muted-foreground block mb-0.5">Available Formats</span>
                    <div className="flex gap-1 mt-0.5">
                      {previewReport.format.map(f => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <span className="text-muted-foreground block mb-0.5">Last Run</span>
                    <span className="font-medium">{previewReport.lastRun || 'Never'}</span>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50">
                    <span className="text-muted-foreground block mb-0.5">Schedule</span>
                    <span className="font-medium">{previewReport.scheduled || 'On-demand'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Date Range</Label>
                  <div className="flex gap-2">
                    <Input type="date" className="h-8 text-xs flex-1" defaultValue="2025-01-01" />
                    <span className="text-xs text-muted-foreground self-center">to</span>
                    <Input type="date" className="h-8 text-xs flex-1" defaultValue="2025-01-15" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Export Format</Label>
                  <Select defaultValue={previewReport.format[0]}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {previewReport.format.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setPreviewReport(null)}>Cancel</Button>
                <Button size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Generate Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════ Report Builder Dialog ═══════ */}
      <Dialog open={builderOpen} onOpenChange={v => !v && setBuilderOpen(false)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Custom Report Builder
            </DialogTitle>
            <DialogDescription>Configure fields, filters, and output for your custom report.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Name & Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Report Name</Label>
                <Input
                  value={builderName}
                  onChange={e => setBuilderName(e.target.value)}
                  placeholder="e.g. High-Risk Sanctions Matches"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  value={builderDescription}
                  onChange={e => setBuilderDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <Separator />

            {/* Field Selection */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Report Columns</h4>
              <div className="grid grid-cols-[1fr_1fr] gap-4">
                {/* Available fields */}
                <div className="border rounded-md">
                  <div className="px-3 py-2 bg-muted/30 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Available Fields</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{AVAILABLE_FIELDS.length - builderFields.length}</Badge>
                    </div>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        value={builderFieldSearch}
                        onChange={e => setBuilderFieldSearch(e.target.value)}
                        placeholder="Search fields..."
                        className="pl-7 h-6 text-[11px]"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-2">
                      {FIELD_GROUPS.map(group => {
                        const groupFields = availableFieldsFiltered.filter(f => f.group === group && !builderFields.includes(f.id));
                        if (groupFields.length === 0) return null;
                        return (
                          <div key={group}>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">{group}</p>
                            {groupFields.map(f => (
                              <button
                                key={f.id}
                                onClick={() => addBuilderField(f.id)}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors text-left"
                              >
                                <Plus className="h-3 w-3 text-muted-foreground" />
                                <span>{f.label}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Selected fields */}
                <div className="border rounded-md">
                  <div className="px-3 py-2 bg-muted/30 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Selected Columns</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{builderFields.length}</Badge>
                    </div>
                    {builderFields.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setBuilderFields([])}>
                        Clear
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="p-2">
                      {builderFields.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          Click fields on the left to add columns
                        </div>
                      ) : (
                        builderFields.map((fieldId, idx) => {
                          const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
                          if (!field) return null;
                          return (
                            <div key={fieldId} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 group">
                              <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-xs flex-1">{field.label}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0">{field.group}</Badge>
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => moveField(fieldId, 'up')} disabled={idx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                                  <ArrowUpDown className="h-2.5 w-2.5" />
                                </button>
                                <button onClick={() => removeBuilderField(fieldId)} className="p-0.5 text-muted-foreground hover:text-destructive">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <Separator />

            {/* Filters */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Report Filters</h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Match Status</Label>
                  <Select value={builderFilterStatus} onValueChange={setBuilderFilterStatus}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Unresolved">Unresolved</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                      <SelectItem value="Possible">Possible</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dataset</Label>
                  <Select value={builderFilterDataset} onValueChange={setBuilderFilterDataset}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Datasets</SelectItem>
                      <SelectItem value="Sanctions">Sanctions</SelectItem>
                      <SelectItem value="PEP">PEP</SelectItem>
                      <SelectItem value="Law Enforcement">Law Enforcement</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time Period</Label>
                  <Select value={builderFilterPeriod} onValueChange={setBuilderFilterPeriod}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select value={builderFilterPriority} onValueChange={setBuilderFilterPriority}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setBuilderOpen(false)}>Cancel</Button>
            <Button size="sm" className="gap-1.5" disabled={!builderName.trim() || builderFields.length === 0}>
              <Play className="h-3.5 w-3.5" /> Save & Run Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Report Row Sub-component ─────────────────────────────────
function ReportRow({ report, onPreview }: { report: StandardReport; onPreview: () => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b hover:bg-muted/20 transition-colors group cursor-pointer" onClick={onPreview}>
      <div className={`h-8 w-8 rounded flex items-center justify-center shrink-0 ${categoryColors[report.category]}`}>
        {categoryIcons[report.category]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{report.name}</span>
          {report.starred && <Star className="h-3 w-3 text-status-possible fill-status-possible shrink-0" />}
          {report.scheduled && (
            <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
              <Clock className="h-2.5 w-2.5" /> {report.scheduled}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{report.description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {report.format.map(f => (
          <Badge key={f} variant="secondary" className="text-[9px] px-1.5">{f}</Badge>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground w-28 text-right shrink-0">
        {report.lastRun ? report.lastRun : <span className="italic">Never run</span>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); }}>
          <Play className="h-3 w-3" /> Run
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); }}>
          <Download className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
