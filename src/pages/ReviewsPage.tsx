import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cases, allMatches, getCaseById } from '@/data/mock-data';

export default function ReviewsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('unresolved');

  const unresolvedMatches = allMatches.filter(m => m.status === 'Unresolved');
  const reviewRequiredMatches = allMatches.filter(m => m.reviewRequired);

  const casesWithMandatory = cases.filter(c => c.mandatoryAction);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-status-possible" />
          Reviews
        </h1>
        <Badge variant="secondary" className="text-xs">
          {casesWithMandatory.length} cases with mandatory actions
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unresolved Matches</p>
            <p className="text-2xl font-bold text-status-unresolved mt-1">{unresolvedMatches.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Review Required</p>
            <p className="text-2xl font-bold text-status-possible mt-1">{reviewRequiredMatches.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Mandatory Action Cases</p>
            <p className="text-2xl font-bold mt-1">{casesWithMandatory.length}</p>
          </CardContent>
        </Card>
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

        <TabsContent value="unresolved">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Matched Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Strength</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dataset</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Identifiers</th>
                  </tr>
                </thead>
                <tbody>
                  {unresolvedMatches.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">All matches have been resolved. 🎉</td></tr>
                  ) : (
                    unresolvedMatches.map(m => {
                      const c = getCaseById(m.caseId);
                      return (
                        <tr
                          key={m.id}
                          className="border-b cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => navigate(`/cases/${m.caseId}`)}
                          tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' && navigate(`/cases/${m.caseId}`)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium">{c?.name || m.caseId}</span>
                            <span className="text-xs text-muted-foreground ml-2">{m.caseId}</span>
                          </td>
                          <td className="px-4 py-3 font-medium">{m.matchedName}</td>
                          <td className="px-4 py-3 font-mono text-xs">{m.strength}%</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px]">{m.dataset}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {[m.identifiers.nationality, m.identifiers.dob].filter(Boolean).join(' · ') || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Matched Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Strength</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRequiredMatches.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No reviews pending.</td></tr>
                  ) : (
                    reviewRequiredMatches.map(m => {
                      const c = getCaseById(m.caseId);
                      return (
                        <tr
                          key={m.id}
                          className="border-b cursor-pointer hover:bg-muted/30 transition-colors bg-status-possible/5"
                          onClick={() => navigate(`/cases/${m.caseId}`)}
                          tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' && navigate(`/cases/${m.caseId}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-status-possible" />
                              <span className="font-medium">{c?.name || m.caseId}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{m.matchedName}</span>
                              <Badge className="text-[10px] bg-status-possible/15 text-status-possible border-0">Updated</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{m.strength}%</td>
                          <td className="px-4 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs">{m.reviewRequiredReasons.length} reason(s)</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="text-xs space-y-0.5">
                                  {m.reviewRequiredReasons.map((r, i) => <li key={i}>• {r}</li>)}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
