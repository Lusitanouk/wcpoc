import { useState, useMemo } from 'react';
import { Check, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { groups, allMatches } from '@/data/mock-data';
import { generateMediaCheckResult } from '@/data/media-mock-data';
import { generatePassportCheckResult } from '@/data/passport-mock-data';
import { ResultsView } from '@/components/screening/ResultsView';
import { MediaCheckResultsView } from '@/components/screening/MediaCheckResultsView';
import { PassportCheckResultsView } from '@/components/screening/PassportCheckResultsView';
import { PassportCheckForm } from '@/components/screening/PassportCheckForm';
import type { ScreeningConfig, ScreeningData, CheckType, EntityType, Match, PassportData, MediaCheckResult, PassportCheckResult } from '@/types';

const steps = ['Configure', 'Enter Data', 'Results'];

const defaultConfig: ScreeningConfig = {
  groupId: groups[0].id,
  mode: 'Single',
  entityType: 'Individual',
  checkTypes: ['World-Check'],
  ogsEnabled: false,
};

const defaultData: ScreeningData = {
  name: '',
  nameTransposition: false,
  caseId: '',
  autoGenerateId: true,
  dob: '',
  gender: '',
  nationality: '',
  country: '',
  idType: '',
  idNumber: '',
};

const defaultPassportData: PassportData = {
  givenName: '',
  lastName: '',
  gender: '',
  issuingState: '',
  nationality: '',
  dob: '',
  documentType: 'Passport',
  identificationNumber: '',
  dateOfExpiry: '',
};

export default function ScreenPage() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<ScreeningConfig>(defaultConfig);
  const [data, setData] = useState<ScreeningData>(defaultData);
  const [passportData, setPassportData] = useState<PassportData>(defaultPassportData);
  const [showCustomFields, setShowCustomFields] = useState(false);

  const selectedGroup = groups.find(g => g.id === config.groupId);

  const hasWorldCheck = config.checkTypes.includes('World-Check');
  const hasMediaCheck = config.checkTypes.includes('Media Check');
  const hasPassportCheck = config.checkTypes.includes('Passport Check');
  const passportOnly = hasPassportCheck && !hasWorldCheck && !hasMediaCheck;

  // When Passport Check is selected, force entity type to Individual
  const handleCheckTypeToggle = (ct: CheckType) => {
    setConfig(c => {
      const newTypes = c.checkTypes.includes(ct)
        ? c.checkTypes.filter(t => t !== ct)
        : [...c.checkTypes, ct];
      // Passport Check only works for Individual
      if (ct === 'Passport Check' && !c.checkTypes.includes(ct)) {
        return { ...c, checkTypes: newTypes, entityType: 'Individual' };
      }
      return { ...c, checkTypes: newTypes };
    });
  };

  // Simulated results
  const simulatedResults: Match[] = useMemo(() => {
    if (step !== 2) return [];
    const subset = allMatches
      .slice(0, Math.floor(Math.random() * 10) + 5)
      .map((m, i) => ({ ...m, caseId: data.caseId || `WC-NEW-${Date.now()}`, checkType: config.checkTypes[i % config.checkTypes.length] }));
    return subset;
  }, [step]);

  const mediaResult: MediaCheckResult | null = useMemo(() => {
    if (step !== 2 || !hasMediaCheck) return null;
    const cid = data.caseId || `WC-NEW-${Date.now()}`;
    return generateMediaCheckResult(cid, data.name || passportData.givenName + ' ' + passportData.lastName);
  }, [step]);

  const passportResult: PassportCheckResult | null = useMemo(() => {
    if (step !== 2 || !hasPassportCheck) return null;
    const cid = data.caseId || `WC-NEW-${Date.now()}`;
    return generatePassportCheckResult(cid, passportData);
  }, [step]);

  const canProceedStep0 = config.groupId && config.checkTypes.length > 0;
  const canProceedStep1 = passportOnly
    ? passportData.givenName.trim().length > 0 && passportData.lastName.trim().length > 0 && passportData.identificationNumber.trim().length > 0
    : data.name.trim().length > 0;

  // Determine which results tabs to show
  const [activeResultTab, setActiveResultTab] = useState<string>('');

  const resultTabs = useMemo(() => {
    const tabs: string[] = [];
    if (hasWorldCheck) tabs.push('World-Check');
    if (hasMediaCheck) tabs.push('Media Check');
    if (hasPassportCheck) tabs.push('Passport Check');
    return tabs;
  }, [hasWorldCheck, hasMediaCheck, hasPassportCheck]);

  const currentResultTab = activeResultTab || resultTabs[0] || '';
  const caseId = data.caseId || `WC-NEW-${Date.now()}`;
  const caseName = passportOnly ? `${passportData.givenName} ${passportData.lastName}` : data.name;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                  ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
              )}
              {s}
            </button>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 0: Configure */}
      {step === 0 && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6 space-y-6">
            <h2 className="text-lg font-semibold">Screening Configuration</h2>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={config.groupId} onValueChange={v => setConfig(c => ({ ...c, groupId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={config.mode} onValueChange={v => setConfig(c => ({ ...c, mode: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single Screening</SelectItem>
                    <SelectItem value="Batch">Batch Screening</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select
                  value={config.entityType}
                  onValueChange={v => setConfig(c => ({ ...c, entityType: v as EntityType }))}
                  disabled={hasPassportCheck}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Individual', 'Organisation', 'Vessel', 'Unspecified'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasPassportCheck && (
                  <p className="text-[10px] text-muted-foreground">Passport Check requires Individual entity type</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Check Types</Label>
                <div className="flex flex-col gap-2 pt-1">
                  {(['World-Check', 'Media Check', 'Passport Check'] as CheckType[]).map(ct => (
                    <label key={ct} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={config.checkTypes.includes(ct)}
                        onCheckedChange={() => handleCheckTypeToggle(ct)}
                      />
                      {ct}
                      {ct === 'Media Check' && (
                        <Badge variant="secondary" className="text-[10px]">Articles</Badge>
                      )}
                      {ct === 'Passport Check' && (
                        <Badge variant="secondary" className="text-[10px]">MRZ Verify</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <Label className="text-sm font-medium">Ongoing Screening (OGS)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Frequency: {selectedGroup?.ongoingFrequency || 'N/A'} (configured at group level)
                </p>
              </div>
              <Switch checked={config.ogsEnabled} onCheckedChange={v => setConfig(c => ({ ...c, ogsEnabled: v }))} />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!canProceedStep0}>
                Next: Enter Data <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Enter Data */}
      {step === 1 && (
        <Card className="animate-fade-in">
          <CardContent className="pt-6 space-y-6">
            <h2 className="text-lg font-semibold">Enter Screening Data</h2>

            {/* Show check type badges */}
            <div className="flex gap-2">
              {config.checkTypes.map(ct => (
                <Badge key={ct} variant="outline" className="text-xs">{ct}</Badge>
              ))}
            </div>

            {/* Standard screening fields (World-Check / Media Check) */}
            {(hasWorldCheck || hasMediaCheck) && (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={data.name}
                      onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                      placeholder="Enter full name..."
                    />
                  </div>

                  {config.entityType === 'Individual' && (
                    <div className="space-y-2 flex items-end gap-2">
                      <div className="flex items-center gap-2 pb-2">
                        <Switch
                          checked={data.nameTransposition}
                          onCheckedChange={v => setData(d => ({ ...d, nameTransposition: v }))}
                        />
                        <Label className="text-sm">Name Transposition</Label>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Case ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={data.autoGenerateId ? '' : data.caseId}
                        onChange={e => setData(d => ({ ...d, caseId: e.target.value }))}
                        placeholder={data.autoGenerateId ? 'Auto-generated' : 'Enter Case ID...'}
                        disabled={data.autoGenerateId}
                      />
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Switch
                          checked={data.autoGenerateId}
                          onCheckedChange={v => setData(d => ({ ...d, autoGenerateId: v }))}
                        />
                        Auto
                      </label>
                    </div>
                  </div>
                </div>

                {/* Secondary Identifiers */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Secondary Identifiers</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Date of Birth</Label>
                      <Input type="date" value={data.dob} onChange={e => setData(d => ({ ...d, dob: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Gender</Label>
                      <Select value={data.gender} onValueChange={v => setData(d => ({ ...d, gender: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Nationality</Label>
                      <Input value={data.nationality} onChange={e => setData(d => ({ ...d, nationality: e.target.value }))} placeholder="e.g. US" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Country / Location</Label>
                      <Input value={data.country} onChange={e => setData(d => ({ ...d, country: e.target.value }))} placeholder="e.g. United States" />
                    </div>
                    {hasMediaCheck && (
                      <div className="space-y-2">
                        <Label className="text-xs">Place of Birth</Label>
                        <Input placeholder="e.g. New York" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Fields */}
                <button
                  onClick={() => setShowCustomFields(!showCustomFields)}
                  className="text-sm text-primary hover:underline"
                >
                  {showCustomFields ? '▼' : '▶'} Custom Fields
                </button>
                {showCustomFields && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted animate-fade-in">
                    <div className="space-y-2">
                      <Label className="text-xs">ID Type</Label>
                      <Input value={data.idType} onChange={e => setData(d => ({ ...d, idType: e.target.value }))} placeholder="e.g. Passport" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">ID Number</Label>
                      <Input value={data.idNumber} onChange={e => setData(d => ({ ...d, idNumber: e.target.value }))} placeholder="e.g. AB123456" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Passport Check Form */}
            {hasPassportCheck && (
              <div className={`${hasWorldCheck || hasMediaCheck ? 'mt-4 pt-4 border-t' : ''}`}>
                <PassportCheckForm data={passportData} onChange={setPassportData} />
              </div>
            )}

            {/* Media Check link to primary case */}
            {hasMediaCheck && hasWorldCheck && (
              <div className="p-4 rounded-lg bg-muted">
                <Label className="text-xs font-medium">Link to Primary Case (optional)</Label>
                <Input placeholder="Enter Case ID or Name..." className="mt-2" />
                <p className="text-[10px] text-muted-foreground mt-1">Link this Media Check to an existing World-Check case</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => { setStep(2); setActiveResultTab(''); }} disabled={!canProceedStep1}>
                <Search className="h-4 w-4 mr-1" /> Screen Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Results */}
      {step === 2 && (
        <div className="animate-fade-in">
          {/* Check type tabs if multiple */}
          {resultTabs.length > 1 && (
            <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
              {resultTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveResultTab(tab)}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    currentResultTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Render appropriate results view */}
          {currentResultTab === 'World-Check' && (
            <ResultsView
              matches={simulatedResults.filter(m => m.checkType === 'World-Check')}
              caseName={caseName}
              caseId={caseId}
              checkTypes={['World-Check']}
            />
          )}

          {currentResultTab === 'Media Check' && mediaResult && (
            <MediaCheckResultsView
              result={mediaResult}
              caseName={caseName}
              caseId={caseId}
            />
          )}

          {currentResultTab === 'Passport Check' && passportResult && (
            <PassportCheckResultsView
              result={passportResult}
              caseName={caseName}
              caseId={caseId}
            />
          )}
        </div>
      )}
    </div>
  );
}
