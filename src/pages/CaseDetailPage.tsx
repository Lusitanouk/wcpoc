import { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shield, Newspaper, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCaseById, getMatchesForCase } from '@/data/mock-data';
import { generateMediaCheckResult } from '@/data/media-mock-data';
import { generatePassportCheckResult } from '@/data/passport-mock-data';
import { ResultsView } from '@/components/screening/ResultsView';
import { MediaCheckResultsView } from '@/components/screening/MediaCheckResultsView';
import { PassportCheckResultsView } from '@/components/screening/PassportCheckResultsView';
import type { CheckType, MediaCheckResult, PassportCheckResult } from '@/types';

const checkTypeIcons: Record<CheckType, React.ReactNode> = {
  'World-Check': <Shield className="h-3.5 w-3.5" />,
  'Media Check': <Newspaper className="h-3.5 w-3.5" />,
  'Passport Check': <CreditCard className="h-3.5 w-3.5" />,
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const caseData = id ? getCaseById(id) : undefined;
  const matches = id ? getMatchesForCase(id) : [];

  // Active check type tab from URL or default to first
  const activeCheckType = (searchParams.get('check') as CheckType) || caseData?.checkTypes[0] || 'World-Check';

  const setActiveCheckType = (ct: CheckType) => {
    const params: Record<string, string> = { check: ct };
    // Preserve bucket param only for World-Check
    if (ct === 'World-Check') {
      const bucket = searchParams.get('bucket');
      if (bucket) params.bucket = bucket;
    }
    setSearchParams(params, { replace: true });
  };

  // Generate mock results for non-World-Check types (stable per case)
  const mediaResult: MediaCheckResult | null = useMemo(() => {
    if (!caseData || !caseData.checkTypes.includes('Media Check')) return null;
    return generateMediaCheckResult(caseData.id, caseData.name);
  }, [caseData?.id]);

  const passportResult: PassportCheckResult | null = useMemo(() => {
    if (!caseData || !caseData.checkTypes.includes('Passport Check')) return null;
    return generatePassportCheckResult(caseData.id, {
      givenName: caseData.name.split(' ')[0] || '',
      lastName: caseData.name.split(' ').slice(1).join(' ') || '',
      gender: 'Male',
      issuingState: 'USA',
      nationality: 'USA',
      dob: '1975-06-15',
      documentType: 'Passport',
      identificationNumber: `P${Math.floor(Math.random() * 900000000 + 100000000)}`,
      dateOfExpiry: '2028-06-15',
    });
  }, [caseData?.id]);

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

      {/* Case-level check type tabs */}
      {caseData.checkTypes.length > 1 && (
        <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
          {caseData.checkTypes.map(ct => (
            <button
              key={ct}
              onClick={() => setActiveCheckType(ct)}
              className={`flex items-center gap-1.5 flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeCheckType === ct
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {checkTypeIcons[ct]}
              {ct}
            </button>
          ))}
        </div>
      )}

      {/* World-Check: resolution buckets + match triage */}
      {activeCheckType === 'World-Check' && (
        <ResultsView
          matches={matches}
          caseName={caseData.name}
          caseId={caseData.id}
          checkTypes={['World-Check']}
        />
      )}

      {/* Media Check: article-based screening */}
      {activeCheckType === 'Media Check' && mediaResult && (
        <MediaCheckResultsView
          result={mediaResult}
          caseName={caseData.name}
          caseId={caseData.id}
        />
      )}

      {/* Passport Check: MRZ verification */}
      {activeCheckType === 'Passport Check' && passportResult && (
        <PassportCheckResultsView
          result={passportResult}
          caseName={caseData.name}
          caseId={caseData.id}
        />
      )}
    </div>
  );
}
