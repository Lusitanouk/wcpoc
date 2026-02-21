import { useState, useMemo } from 'react';
import { Search, Filter, X, Paperclip, ExternalLink, Eye, FileText, ToggleRight, Newspaper, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
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

export function MediaCheckResultsView({ result, caseName, caseId }: MediaCheckResultsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [smartFilterOn, setSmartFilterOn] = useState(result.smartFilterEnabled);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'headlines' | 'attached'>('headlines');
  const [selectedArticle, setSelectedArticle] = useState<MediaArticle | null>(null);
  const [articleDrawerOpen, setArticleDrawerOpen] = useState(false);
  const [riskAssignment, setRiskAssignment] = useState<Record<string, MediaRiskLevel>>({});
  const [dateRange, setDateRange] = useState<string>('last2years');

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

  const filteredArticles = useMemo(() => {
    return result.articles
      .filter(a => {
        if (viewMode === 'attached' && !a.attached) return false;
        if (smartFilterOn && !a.smartFilterRelevant) return false;
        if (searchQuery && !a.headline.toLowerCase().includes(searchQuery.toLowerCase()) && !a.snippet.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (topicFilter !== 'all' && !a.topics.includes(topicFilter)) return false;
        if (countryFilter !== 'all' && !a.countries.includes(countryFilter)) return false;
        if (riskFilter !== 'all' && a.riskLevel !== riskFilter) return false;
        if (selectedEntity !== 'all' && a.matchedEntity !== selectedEntity) return false;
        return true;
      })
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  }, [result.articles, viewMode, smartFilterOn, searchQuery, topicFilter, countryFilter, riskFilter, selectedEntity]);

  const openArticle = (article: MediaArticle) => {
    setSelectedArticle(article);
    setArticleDrawerOpen(true);
  };

  const handleRiskAssign = (articleId: string, risk: MediaRiskLevel) => {
    setRiskAssignment(prev => ({ ...prev, [articleId]: risk }));
  };

  return (
    <div>
      {/* Case Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Media Check — {caseName}
          </h1>
          <p className="text-sm text-muted-foreground">Case ID: {caseId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Export Report
          </Button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Articles</p>
            <p className="text-2xl font-bold mt-1">{result.totalArticles.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Review Required</p>
            <p className="text-2xl font-bold mt-1 text-status-possible">{result.reviewRequired.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attached</p>
            <p className="text-2xl font-bold mt-1">{result.attachedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Showing (filtered)</p>
            <p className="text-2xl font-bold mt-1">{filteredArticles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Smart Filter</p>
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={smartFilterOn} onCheckedChange={setSmartFilterOn} />
              <span className="text-sm font-medium">{smartFilterOn ? 'On' : 'Off'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle + Date Range */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode('headlines')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'headlines' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All Matched Articles ({filteredArticles.length})
          </button>
          <button
            onClick={() => setViewMode('attached')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'attached' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Attached Articles ({result.attachedCount})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Search in:</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="last2years">Last 2 years</SelectItem>
              <SelectItem value="older">Older</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1">
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4 animate-fade-in">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Search within Articles</label>
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Keywords..."
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Article Topics</label>
                <Select value={topicFilter} onValueChange={setTopicFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {allTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Country in Articles</label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {allCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Risk Level</label>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="No Risk">No Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setTopicFilter('all'); setCountryFilter('all'); setRiskFilter('all'); }} className="gap-1">
                <X className="h-3 w-3" /> Clear
              </Button>
            </div>
          </CardContent>
        </Card>
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

        {/* Articles List */}
        <Card>
          <div className="divide-y">
            {filteredArticles.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground text-sm">
                No articles match the current filters.
              </div>
            ) : (
              filteredArticles.map(article => (
                <div
                  key={article.id}
                  onClick={() => openArticle(article)}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${article.visited ? 'bg-primary/3' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
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
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Media Resolution section */}
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

      {/* Article Reader Drawer */}
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
