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
import { Separator } from '@/components/ui/separator';
import { groups, allMatches } from '@/data/mock-data';
import { generateMediaCheckResult } from '@/data/media-mock-data';
import { generatePassportCheckResult } from '@/data/passport-mock-data';
import { ResultsView } from '@/components/screening/ResultsView';
import { MediaCheckResultsView } from '@/components/screening/MediaCheckResultsView';
import { PassportCheckResultsView } from '@/components/screening/PassportCheckResultsView';
import { PassportCheckForm } from '@/components/screening/PassportCheckForm';
import type { ScreeningConfig, ScreeningData, CheckType, EntityType, Match, PassportData, MediaCheckResult, PassportCheckResult } from '@/types';

const steps = ['Configure & Enter Data', 'Results'];

const defaultConfig: ScreeningConfig = {
  groupId: groups[0].id,
  mode: 'Single',
  entityType: 'Individual',
  checkTypes: ['World-Check'],
  ogsWorldCheck: false,
  ogsMediaCheck: false,
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
      if (ct === 'Passport Check' && !c.checkTypes.includes(ct)) {
        return { ...c, checkTypes: newTypes, entityType: 'Individual' };
      }
      return { ...c, checkTypes: newTypes };
    });
  };

  // Simulated results
  const simulatedResults: Match[] = useMemo(() => {
    if (step !== 1) return [];
    const subset = allMatches
      .slice(0, Math.floor(Math.random() * 10) + 5)
      .map((m, i) => ({ ...m, caseId: data.caseId || `WC-NEW-${Date.now()}`, checkType: config.checkTypes[i % config.checkTypes.length] }));
    return subset;
  }, [step]);

  const mediaResult: MediaCheckResult | null = useMemo(() => {
    if (step !== 1 || !hasMediaCheck) return null;
    const cid = data.caseId || `WC-NEW-${Date.now()}`;
    return generateMediaCheckResult(cid, data.name || passportData.givenName + ' ' + passportData.lastName);
  }, [step]);

  const passportResult: PassportCheckResult | null = useMemo(() => {
    if (step !== 1 || !hasPassportCheck) return null;
    const cid = data.caseId || `WC-NEW-${Date.now()}`;
    return generatePassportCheckResult(cid, passportData);
  }, [step]);

  const canScreen = config.groupId && config.checkTypes.length > 0 && (
    passportOnly
      ? passportData.givenName.trim().length > 0 && passportData.lastName.trim().length > 0 && passportData.identificationNumber.trim().length > 0
      : data.name.trim().length > 0
  );

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

      {/* Step 0: Configure & Enter Data (merged) */}
      {step === 0 && (
        <div className="animate-fade-in space-y-6">
          {/* Configuration Section */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <h2 className="text-lg font-semibold">Screening Configuration</h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Group</Label>
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
                  <Label className="text-xs">Mode</Label>
                  <Select value={config.mode} onValueChange={v => setConfig(c => ({ ...c, mode: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single Screening</SelectItem>
                      <SelectItem value="Batch">Batch Screening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Entity Type</Label>
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
                    <p className="text-[10px] text-muted-foreground">Passport Check requires Individual</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Check Types</Label>
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    {(['World-Check', 'Media Check', 'Passport Check'] as CheckType[]).map(ct => (
                      <label key={ct} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={config.checkTypes.includes(ct)}
                          onCheckedChange={() => handleCheckTypeToggle(ct)}
                        />
                        <span className="text-xs">{ct}</span>
                        {ct === 'Media Check' && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Articles</Badge>
                        )}
                        {ct === 'Passport Check' && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">MRZ</Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* OGS - compact inline */}
              <div className="flex items-center gap-6 p-3 rounded-lg bg-muted text-xs">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-medium">OGS</Label>
                  <span className="text-muted-foreground">({selectedGroup?.ongoingFrequency || 'N/A'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={config.ogsWorldCheck} onCheckedChange={v => setConfig(c => ({ ...c, ogsWorldCheck: v }))} />
                  <span>World-Check</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={config.ogsMediaCheck} onCheckedChange={v => setConfig(c => ({ ...c, ogsMediaCheck: v }))} />
                  <span>Media Check</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Entry Section */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Screening Data</h2>
                <div className="flex gap-1.5">
                  {config.checkTypes.map(ct => (
                    <Badge key={ct} variant="outline" className="text-[10px]">{ct}</Badge>
                  ))}
                </div>
              </div>

              {/* Standard screening fields (World-Check / Media Check) */}
              {(hasWorldCheck || hasMediaCheck) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Name *</Label>
                      <Input
                        value={data.name}
                        onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                        placeholder="Enter full name..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Case ID</Label>
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

                  {config.entityType === 'Individual' && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={data.nameTransposition}
                        onCheckedChange={v => setData(d => ({ ...d, nameTransposition: v }))}
                      />
                      <Label className="text-xs">Name Transposition</Label>
                    </div>
                  )}

                  {/* Secondary Identifiers - collapsible-style compact row */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-muted-foreground">Secondary Identifiers</h3>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Date of Birth</Label>
                        <Input type="date" value={data.dob} onChange={e => setData(d => ({ ...d, dob: e.target.value }))} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Gender</Label>
                        <Select value={data.gender} onValueChange={v => setData(d => ({ ...d, gender: v }))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Nationality</Label>
                        <Input value={data.nationality} onChange={e => setData(d => ({ ...d, nationality: e.target.value }))} placeholder="e.g. US" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Country / Location</Label>
                        <Input value={data.country} onChange={e => setData(d => ({ ...d, country: e.target.value }))} placeholder="e.g. United States" className="h-8 text-xs" />
                      </div>
                      {hasMediaCheck && (
                        <div className="space-y-1">
                          <Label className="text-[10px]">Place of Birth</Label>
                          <Input placeholder="e.g. New York" className="h-8 text-xs" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Custom Fields */}
                  <button
                    onClick={() => setShowCustomFields(!showCustomFields)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showCustomFields ? '▼' : '▶'} Custom Fields
                  </button>
                  {showCustomFields && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted animate-fade-in">
                      <div className="space-y-1">
                        <Label className="text-[10px]">ID Type</Label>
                        <Input value={data.idType} onChange={e => setData(d => ({ ...d, idType: e.target.value }))} placeholder="e.g. Passport" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">ID Number</Label>
                        <Input value={data.idNumber} onChange={e => setData(d => ({ ...d, idNumber: e.target.value }))} placeholder="e.g. AB123456" className="h-8 text-xs" />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Passport Check Form */}
              {hasPassportCheck && (
                <div className={`${hasWorldCheck || hasMediaCheck ? 'pt-4 border-t' : ''}`}>
                  <PassportCheckForm data={passportData} onChange={setPassportData} />
                </div>
              )}

              {/* Media Check link to primary case */}
              {hasMediaCheck && hasWorldCheck && (
                <div className="p-3 rounded-lg bg-muted">
                  <Label className="text-[10px] font-medium">Link to Primary Case (optional)</Label>
                  <Input placeholder="Enter Case ID or Name..." className="mt-1.5 h-8 text-xs" />
                  <p className="text-[9px] text-muted-foreground mt-1">Link this Media Check to an existing World-Check case</p>
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => { setStep(1); setActiveResultTab(''); }} disabled={!canScreen} size="lg">
                  <Search className="h-4 w-4 mr-2" /> Screen Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Results */}
      {step === 1 && (
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
