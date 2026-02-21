import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCaseById, getMatchesForCase } from '@/data/mock-data';
import { ResultsView } from '@/components/screening/ResultsView';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseData = id ? getCaseById(id) : undefined;
  const matches = id ? getMatchesForCase(id) : [];

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Case not found.</p>
        <Link to="/cases">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Cases</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Cases
      </Link>
      <ResultsView
        matches={matches}
        caseName={caseData.name}
        caseId={caseData.id}
        checkTypes={caseData.checkTypes}
      />
    </div>
  );
}
