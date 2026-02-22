import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, X, Paperclip, ExternalLink, Eye, FileText, ToggleRight, Newspaper, AlertTriangle, Globe, Tag, Check, HelpCircle, CircleDot, XCircle, CircleOff, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FilterBar, { type FilterDefinition } from '@/components/FilterBar';
import type { MediaCheckResult, MediaArticle, MediaRiskLevel } from '@/types';

interface MediaCheckResultsViewProps {
  result: MediaCheckResult;
  caseName: string;
  caseId: string;
}

const riskColors: Record<MediaRiskLevel, string> = {
  High: 'bg-status-unresolved text-white',
  Medium: 'bg-status-possible text-white',
  Low: 'bg-status-false text-white',
  'No Risk': 'bg-muted text-muted-foreground',
  Unknown: 'bg-status-unknown text-white',
};

type MediaBucket = 'all' | 'attached';

const bucketIcons: Record<MediaBucket, React.ReactNode> = {
  all: <Newspaper className="h-3.5 w-3.5" />,
  attached: <Paperclip className="h-3.5 w-3.5" />,
};

export function MediaCheckResultsView({ result, caseName, caseId }: MediaCheckResultsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [smartFilterOn, setSmartFilterOn] = useState(result.smartFilterEnabled);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [activeBucket, setActiveBucket] = useState<MediaBucket>('all');
  const [hoveredBucket, setHoveredBucket] = useState<MediaBucket | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<MediaArticle | null>(null);
  const [articleDrawerOpen, setArticleDrawerOpen] = useState(false);
  const [riskAssignment, setRiskAssignment] = useState<Record<string, MediaRiskLevel>>({});

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<'attach' | 'detach' | null>(null);
  const [bulkRisk, setBulkRisk] = useState<MediaRiskLevel>('Unknown');
  const [bulkComment, setBulkComment] = useState('');

  const bucketRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [stickyOffsets, setStickyOffsets] = useState({ filter: 0 });

  useEffect(() => {
    const measure = () => {
      const bucketEl = bucketRef.current;
      if (bucketEl) {
        const bucketBottom = bucketEl.offsetHeight - 24;
        setStickyOffsets({ filter: bucketBottom });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [result.articles]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [activeBucket, smartFilterOn, searchQuery, topicFilter, countryFilter, riskFilter, selectedEntity]);

  // Infinite scroll observer
  // Collect all unique topics and countries
  const allTopics = useMemo(() => {
    const set = new Set<string>();
    result.articles.forEach(a => a.topics.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [result.articles]);

  const allCountries = useMemo(() => {
    const set = new Set<string>();
    result.articles.forEach(a => a.countries.forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, [result.articles]);

  const mediaFilterDefs: FilterDefinition[] = useMemo(() => [
    {
      key: 'topic',
      label: 'Topic',
      icon: <Tag className="h-3.5 w-3.5" />,
      options: [
        { value: 'all', label: 'All Topics' },
        ...allTopics.map(t => ({ value: t, label: t })),
      ],
      defaultValue: 'all',
    },
    {
      key: 'country',
      label: 'Country',
      icon: <Globe className="h-3.5 w-3.5" />,
      options: [
        { value: 'all', label: 'All Countries' },
        ...allCountries.map(c => ({ value: c, label: c })),
      ],
      defaultValue: 'all',
    },
    {
      key: 'risk',
      label: 'Risk Level',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      options: [
        { value: 'all', label: 'All Levels' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
        { value: 'No Risk', label: 'No Risk' },
      ],
      defaultValue: 'all',
    },
  ], [allTopics, allCountries]);

  const mediaFilterValues: Record<string, string> = {
    topic: topicFilter,
    country: countryFilter,
    risk: riskFilter,
  };

  const handleMediaFilterChange = (key: string, value: string) => {
    if (key === 'topic') setTopicFilter(value);
    if (key === 'country') setCountryFilter(value);
    if (key === 'risk') setRiskFilter(value);
  };

  const clearAllMediaFilters = () => {
    setTopicFilter('all');
    setCountryFilter('all');
    setRiskFilter('all');
  };

  // Bucket counts
  const allArticlesCount = result.articles.length;
  const attachedArticles = useMemo(() => result.articles.filter(a => a.attached), [result.articles]);
  const attachedCount = attachedArticles.length;

  const bucketCounts: Record<MediaBucket, number> = {
    all: allArticlesCount,
    attached: attachedCount,
  };

  // Stats per bucket
  const getBucketStats = (bucket: MediaBucket) => {
    const articles = bucket === 'attached' ? attachedArticles : result.articles;
    const riskCounts: Record<string, number> = {};
    articles.forEach(a => {
      const risk = riskAssignment[a.id] || a.riskLevel;
      riskCounts[risk] = (riskCounts[risk] || 0) + 1;
    });
    const topicCounts: Record<string, number> = {};
    articles.forEach(a => a.topics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
    const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const reviewCount = articles.filter(a => a.smartFilterRelevant).length;
    return { riskCounts, topTopics, reviewCount, total: articles.length };
  };

  const filteredArticles = useMemo(() => {
    return result.articles
      .filter(a => {
        if (activeBucket === 'attached' && !a.attached) return false;
        if (smartFilterOn && !a.smartFilterRelevant) return false;
        if (searchQuery && !a.headline.toLowerCase().includes(searchQuery.toLowerCase()) && !a.snippet.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (topicFilter !== 'all' && !a.topics.includes(topicFilter)) return false;
        if (countryFilter !== 'all' && !a.countries.includes(countryFilter)) return false;
        if (riskFilter !== 'all' && a.riskLevel !== riskFilter) return false;
        if (selectedEntity !== 'all' && a.matchedEntity !== selectedEntity) return false;
        return true;
      })
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  }, [result.articles, activeBucket, smartFilterOn, searchQuery, topicFilter, countryFilter, riskFilter, selectedEntity]);

  const visibleArticles = useMemo(() => filteredArticles.slice(0, visibleCount), [filteredArticles, visibleCount]);
  const hasMore = visibleCount < filteredArticles.length;

  // Infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 20);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredArticles.length]);

  const openArticle = (article: MediaArticle) => {
    setSelectedArticle(article);
    setArticleDrawerOpen(true);
  };

  const handleRiskAssign = (articleId: string, risk: MediaRiskLevel) => {
    setRiskAssignment(prev => ({ ...prev, [articleId]: risk }));
  };

  // Selection helpers
  const allSelected = filteredArticles.length > 0 && filteredArticles.every(a => selectedIds.has(a.id));
  const someSelected = filteredArticles.some(a => selectedIds.has(a.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredArticles.map(a => a.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectedCount = selectedIds.size;
  const selectedArticles = filteredArticles.filter(a => selectedIds.has(a.id));

  // Bulk summary
  const bulkSummary = useMemo(() => {
    const byRisk: Record<string, number> = {};
    const byTopic: Record<string, number> = {};
    let attachedCount = 0;
    selectedArticles.forEach(a => {
      const risk = riskAssignment[a.id] || a.riskLevel;
      byRisk[risk] = (byRisk[risk] || 0) + 1;
      a.topics.forEach(t => { byTopic[t] = (byTopic[t] || 0) + 1; });
      if (a.attached) attachedCount++;
    });
    return { byRisk, byTopic, attachedCount };
  }, [selectedArticles, riskAssignment]);

  const handleBulkAttach = () => {
    // In real app, would call API to attach articles
    selectedIds.forEach(id => {
      if (bulkRisk !== 'Unknown') {
        setRiskAssignment(prev => ({ ...prev, [id]: bulkRisk }));
      }
    });
    setBulkDialog(null);
    setSelectedIds(new Set());
    setBulkRisk('Unknown');
    setBulkComment('');
  };

  const handleBulkDetach = () => {
    // In real app, would call API to detach articles
    setBulkDialog(null);
    setSelectedIds(new Set());
    setBulkComment('');
  };

  const BUCKETS: MediaBucket[] = ['all', 'attached'];
  const bucketLabels: Record<MediaBucket, string> = { all: 'All Matched', attached: 'Attached' };

  return (
    <div>

      {/* Bucket Tabs */}
      <div ref={bucketRef} className="mb-4 rounded-lg border bg-card sticky -top-6 z-20 group/buckets">
        <div className="flex items-center gap-1 p-1">
          {BUCKETS.map(bucket => (
            <Tooltip key={bucket}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveBucket(bucket)}
                  onMouseEnter={() => setHoveredBucket(bucket)}
                  onMouseLeave={() => setHoveredBucket(null)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all border-b-2 ${
                    activeBucket === bucket
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {bucketIcons[bucket]}
                  <span className="hidden sm:inline">{bucketLabels[bucket]}</span>
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                    {bucketCounts[bucket]}
                  </Badge>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden text-xs">{bucketLabels[bucket]}</TooltipContent>
            </Tooltip>
          ))}
          <div className="ml-auto flex items-center gap-2 pr-2">
            <span className="text-[11px] text-muted-foreground">Smart Filter</span>
            <Switch checked={smartFilterOn} onCheckedChange={setSmartFilterOn} className="scale-75" />
          </div>
        </div>
        {/* Hover stats */}
        {(() => {
          const statsBucket = hoveredBucket || activeBucket;
          const stats = getBucketStats(statsBucket);
          return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 border-t bg-muted/30 text-xs max-h-0 overflow-hidden opacity-0 group-hover/buckets:max-h-20 group-hover/buckets:opacity-100 group-hover/buckets:py-2 transition-all duration-200">
              <span className="font-medium text-foreground">{stats.total} {bucketLabels[statsBucket].toLowerCase()}</span>
              {Object.entries(stats.riskCounts).filter(([level]) => level !== 'Unknown').length > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {Object.entries(stats.riskCounts).filter(([level]) => level !== 'Unknown').map(([level, count], i) => (
                      <span key={level}>
                        {i > 0 ? ', ' : ''}
                        <span className={`font-medium ${level === 'High' ? 'text-destructive' : level === 'Medium' ? 'text-amber-600' : 'text-foreground'}`}>{count}</span>
                        {' '}{level}
                      </span>
                    ))}
                  </span>
                </>
              )}
              {stats.reviewCount > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-status-possible font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {stats.reviewCount} relevant
                  </span>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Filters */}
      <div ref={filterRef} className="flex items-center gap-2 mb-4 flex-wrap sticky z-20 bg-background py-2" style={{ top: `${stickyOffsets.filter}px` }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FilterBar
            filters={mediaFilterDefs}
            values={mediaFilterValues}
            onChange={handleMediaFilterChange}
            onClearAll={clearAllMediaFilters}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-4 rounded-md bg-primary/10 border border-primary/20 animate-fade-in">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex gap-1.5 ml-2">
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => { setBulkRisk('Unknown'); setBulkComment(''); setBulkDialog('attach'); }}>
              <Paperclip className="h-3 w-3" /> Attach {selectedCount === 1 ? 'Article' : 'Articles'}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setBulkComment(''); setBulkDialog('detach'); }}>
              <X className="h-3 w-3" /> Detach
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[240px_1fr] gap-4">
        {/* Matched Entities Sidebar */}
        <Card className="h-fit">
          <CardContent className="p-4 space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">MATCHING ENTITIES</h3>
            <button
              onClick={() => setSelectedEntity('all')}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${selectedEntity === 'all' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
            >
              All ({result.totalArticles.toLocaleString()})
            </button>
            {result.matchedEntities.map(e => (
              <button
                key={e.name}
                onClick={() => setSelectedEntity(e.name)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${selectedEntity === e.name ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
              >
                {e.name} <span className="text-muted-foreground">({e.count})</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Articles List — with select-all header */}
        <Card>
          <div className="px-4 py-2 border-b flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all"
              className="h-4 w-4"
              {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' } : {})}
            />
            <span className="text-xs text-muted-foreground">{filteredArticles.length} articles</span>
          </div>
           <div className="divide-y">
            {filteredArticles.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                No articles match the current filters.
              </div>
            ) : (
              <>
                {visibleArticles.map(article => (
                  <div
                    key={article.id}
                    onClick={() => openArticle(article)}
                    className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${article.visited ? 'bg-primary/3' : ''} ${selectedIds.has(article.id) ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(article.id)}
                        onCheckedChange={() => toggleOne(article.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium leading-snug ${article.visited ? 'text-muted-foreground' : ''}`}>
                          {article.headline}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{article.publishedDate}</span>
                          <span>·</span>
                          <span>{article.publication}</span>
                          <span>·</span>
                          <span>{article.wordCount.toLocaleString()} words</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {article.topics.slice(0, 3).map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge className={`text-[10px] ${riskColors[riskAssignment[article.id] || article.riskLevel]}`}>
                          {riskAssignment[article.id] || article.riskLevel}
                        </Badge>
                        {article.attached && (
                          <Paperclip className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Loading more articles...
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Media Resolution — pinned to bottom */}
      {!hasMore && filteredArticles.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Media Resolution</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Case Rating</Label>
                <Select defaultValue="Unknown">
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="No Risk">No Risk</SelectItem>
                    <SelectItem value="Unknown">Not Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Reason</Label>
                <Input placeholder="Enter reason..." className="h-8 text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Attach Dialog */}
      <Dialog open={bulkDialog === 'attach'} onOpenChange={v => !v && setBulkDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach {selectedCount === 1 ? 'Article' : 'Articles'} — {selectedCount}</DialogTitle>
            <DialogDescription>Attach selected articles to this case with a risk rating.</DialogDescription>
          </DialogHeader>

          {/* Selection summary */}
          <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1.5">
            <div className="flex flex-wrap gap-2">
              {Object.entries(bulkSummary.byRisk).map(([risk, count]) => (
                <Badge key={risk} variant="secondary" className="text-[10px]">{risk}: {count}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(bulkSummary.byTopic).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([topic, count]) => (
                <Badge key={topic} variant="outline" className="text-[10px]">{topic}: {count}</Badge>
              ))}
            </div>
            {bulkSummary.attachedCount > 0 && (
              <div className="flex items-center gap-1 text-primary">
                <Paperclip className="h-3 w-3" />
                <span>{bulkSummary.attachedCount} already attached</span>
              </div>
            )}
          </div>

          {/* Articles being attached */}
          <div className="max-h-40 overflow-y-auto border rounded-md">
            <div className="divide-y">
              {selectedArticles.map(a => (
                <div key={a.id} className="px-3 py-1.5 text-xs flex items-center justify-between gap-2">
                  <span className="font-medium truncate flex-1">{a.headline}</span>
                  <Badge className={`text-[9px] shrink-0 ${riskColors[riskAssignment[a.id] || a.riskLevel]}`}>
                    {riskAssignment[a.id] || a.riskLevel}
                  </Badge>
                  {a.attached && <Paperclip className="h-3 w-3 text-primary shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Risk assignment + comment */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Risk Level (applied to all)</Label>
              <div className="flex gap-1.5">
                {(['High', 'Medium', 'Low', 'No Risk', 'Unknown'] as MediaRiskLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setBulkRisk(level)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                      bulkRisk === level
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {level === 'Unknown' ? 'Keep Current' : level}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comment (required)</Label>
              <Textarea
                value={bulkComment}
                onChange={e => setBulkComment(e.target.value)}
                placeholder="Reason for attaching these articles..."
                className="min-h-[60px] text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!bulkComment.trim()} onClick={handleBulkAttach} className="gap-1">
              <Paperclip className="h-3 w-3" /> Attach {selectedCount === 1 ? 'Article' : 'Articles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Detach Dialog */}
      <Dialog open={bulkDialog === 'detach'} onOpenChange={v => !v && setBulkDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detach {selectedCount === 1 ? 'Article' : 'Articles'} — {selectedCount}</DialogTitle>
            <DialogDescription>Remove selected articles from this case.</DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto border rounded-md">
            <div className="divide-y">
              {selectedArticles.map(a => (
                <div key={a.id} className="px-3 py-1.5 text-xs flex items-center gap-2">
                  <span className="font-medium truncate flex-1">{a.headline}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comment (required)</Label>
            <Textarea
              value={bulkComment}
              onChange={e => setBulkComment(e.target.value)}
              placeholder="Reason for detaching..."
              className="min-h-[60px] text-xs resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button size="sm" variant="destructive" disabled={!bulkComment.trim()} onClick={handleBulkDetach} className="gap-1">
              <X className="h-3 w-3" /> Detach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={articleDrawerOpen} onOpenChange={v => !v && setArticleDrawerOpen(false)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto p-0">
          {selectedArticle && (
            <>
              <SheetHeader className="p-6 pb-4 border-b">
                <SheetTitle className="text-base leading-snug">{selectedArticle.headline}</SheetTitle>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{selectedArticle.publishedDate}</span>
                  <span>·</span>
                  <span>{selectedArticle.publication}</span>
                  <span>·</span>
                  <span>{selectedArticle.wordCount.toLocaleString()} words</span>
                  <span>·</span>
                  <span>{selectedArticle.sourceType}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedArticle.topics.map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </SheetHeader>

              {/* Risk Assessment */}
              <div className="p-6 border-b">
                <h4 className="text-xs font-semibold mb-2">Risk Assessment</h4>
                <div className="flex gap-2">
                  {(['High', 'Medium', 'Low', 'No Risk'] as MediaRiskLevel[]).map(level => (
                    <Button
                      key={level}
                      variant={(riskAssignment[selectedArticle.id] || selectedArticle.riskLevel) === level ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => handleRiskAssign(selectedArticle.id, level)}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Article Body */}
              <div className="p-6 border-b">
                <h4 className="text-xs font-semibold mb-3">Article Content</h4>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {highlightText(selectedArticle.fullText, selectedArticle.highlightedTerms)}
                </div>
              </div>

              {/* Countries */}
              <div className="p-6 border-b">
                <h4 className="text-xs font-semibold mb-2">Countries mentioned</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedArticle.countries.map(c => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>

              {/* Attach/Notes */}
              <div className="p-6 space-y-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <Paperclip className="h-3 w-3" /> {selectedArticle.attached ? 'Detach from Case' : 'Attach to Case'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" /> View Source
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function highlightText(text: string, terms: string[]): React.ReactNode {
  if (!terms.length) return text;
  
  // Simple highlighting - in real app would use more sophisticated approach
  const parts = text.split(new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'));
  
  return parts.map((part, i) => {
    const isHighlighted = terms.some(t => part.toLowerCase() === t.toLowerCase());
    if (isHighlighted) {
      return <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{part}</mark>;
    }
    return part;
  });
}
