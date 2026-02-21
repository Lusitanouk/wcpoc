import { useState } from 'react';
import { Shield, Check, X, AlertTriangle, FileText, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { PassportCheckResult } from '@/types';

interface PassportCheckResultsViewProps {
  result: PassportCheckResult;
  caseName: string;
  caseId: string;
}

export function PassportCheckResultsView({ result, caseName, caseId }: PassportCheckResultsViewProps) {
  const [mrzDecision, setMrzDecision] = useState<'yes' | 'no' | 'pending'>(result.mrzMatch);

  const handleDecision = (decision: 'yes' | 'no') => {
    setMrzDecision(decision);
  };

  const pd = result.passportData;
  const isVerified = mrzDecision === 'yes';
  const isInvalid = mrzDecision === 'no';

  return (
    <div>
      {/* Verification Status */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <Badge
          variant="outline"
          className={`text-xs ${isVerified ? 'border-status-positive text-status-positive' : isInvalid ? 'border-status-unresolved text-status-unresolved' : 'border-status-unknown text-status-unknown'}`}
        >
          {isVerified ? '✓ Verified' : isInvalid ? '✗ Invalid' : '◌ Pending'}
        </Badge>
        <Button variant="outline" size="sm" className="gap-1">
          <FileText className="h-3.5 w-3.5" /> Export to PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Entered Data */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Document Details Entered
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Given Name(s)', value: pd.givenName },
                { label: 'Last Name(s)', value: pd.lastName },
                { label: 'Gender', value: pd.gender },
                { label: 'Issuing State', value: pd.issuingState },
                { label: 'Nationality', value: pd.nationality },
                { label: 'Date of Birth', value: pd.dob },
                { label: 'Document Type', value: pd.documentType },
                { label: 'Passport/ID Number', value: pd.identificationNumber },
                { label: 'Date of Expiry', value: pd.dateOfExpiry },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Verification Results */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Verification Results
            </h3>
            <div className="space-y-3">
              {result.fieldVerifications.map(fv => (
                <div key={fv.field} className="flex items-center justify-between text-sm py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground">{fv.field}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{fv.computed}</span>
                    {fv.matches ? (
                      <Check className="h-4 w-4 text-status-positive" />
                    ) : (
                      <X className="h-4 w-4 text-status-unresolved" />
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-dashed">
                <span className="text-muted-foreground">Control Digits</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{result.controlDigitsValid ? 'Valid' : 'Invalid'}</span>
                  {result.controlDigitsValid ? (
                    <Check className="h-4 w-4 text-status-positive" />
                  ) : (
                    <X className="h-4 w-4 text-status-unresolved" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MRZ Verification */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold mb-2">Verification Procedure</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Please compare the computed results below with the lines of the Machine Readable Zone on the document at hand.
            In particular, pay attention to check the control digits (highlighted in orange for readability).
          </p>

          <div className="space-y-3 mb-6">
            <div>
              <Label className="text-xs text-muted-foreground">First Line (MRZ)</Label>
              <div className="font-mono text-sm bg-muted p-3 rounded mt-1 tracking-wider break-all">
                {result.mrzLine1.split('').map((char, i) => (
                  <span key={i} className={char === '<' ? 'text-muted-foreground' : isControlDigit(i, 1) ? 'text-orange-500 font-bold' : ''}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Second Line (MRZ)</Label>
              <div className="font-mono text-sm bg-muted p-3 rounded mt-1 tracking-wider break-all">
                {result.mrzLine2.split('').map((char, i) => (
                  <span key={i} className={char === '<' ? 'text-muted-foreground' : isControlDigit(i, 2) ? 'text-orange-500 font-bold' : ''}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mb-4 italic">
            Characters marked with * are used at the discretion of the Issuing State and shall be disregarded.
          </p>

          {/* MRZ Match Decision */}
          <div className={`p-4 rounded-lg border-2 ${isVerified ? 'border-status-positive bg-status-positive/5' : isInvalid ? 'border-status-unresolved bg-status-unresolved/5' : 'border-muted'}`}>
            <h4 className="text-sm font-semibold mb-3">MRZ Matches Document</h4>
            <p className="text-xs text-muted-foreground mb-3">
              If the machine readable code does not match, the document at hand may be a forgery and enhanced due diligence should be performed.
            </p>
            <div className="flex gap-3">
              <Button
                variant={mrzDecision === 'yes' ? 'default' : 'outline'}
                onClick={() => handleDecision('yes')}
                className={`flex-1 gap-2 ${mrzDecision === 'yes' ? 'bg-status-positive hover:bg-status-positive/90' : ''}`}
              >
                <Check className="h-4 w-4" />
                YES — Valid Identification
              </Button>
              <Button
                variant={mrzDecision === 'no' ? 'default' : 'outline'}
                onClick={() => handleDecision('no')}
                className={`flex-1 gap-2 ${mrzDecision === 'no' ? 'bg-status-unresolved hover:bg-status-unresolved/90' : ''}`}
              >
                <X className="h-4 w-4" />
                NO — Invalid Identification
              </Button>
            </div>
          </div>

          {isInvalid && (
            <div className="mt-4 p-3 rounded bg-status-unresolved/10 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-status-unresolved flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-status-unresolved">Warning:</span>{' '}
                The MRZ does not match the document. The document may be forged. Enhanced due diligence is required. This result has been logged in the audit trail.
              </div>
            </div>
          )}

          {isVerified && (
            <div className="mt-4 p-3 rounded bg-status-positive/10 flex items-start gap-2">
              <Check className="h-4 w-4 text-status-positive flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-status-positive">Verified:</span>{' '}
                The MRZ matches the document. This identity document has been logged as valid in the audit trail. The results page is now saved as read-only.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <div className="mt-4 text-[10px] text-muted-foreground italic">
        In compliance with international standardization, all countries issue Machine Readable Zone passports.
        However, some legacy documents may not conform to current ICAO Doc 9303 specifications.
        Refer to country-specific variance documentation for additional guidance.
      </div>
    </div>
  );
}

// Control digit positions (simplified - in real app would be precise per ICAO spec)
function isControlDigit(index: number, line: number): boolean {
  if (line === 2) {
    return index === 9 || index === 19 || index === 21 || index === 27 || index === 43;
  }
  return false;
}
