import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Search, Upload, Shield, Newspaper, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { groups, allMatches } from '@/data/mock-data';
import { generateMediaCheckResult } from '@/data/media-mock-data';
import { generatePassportCheckResult } from '@/data/passport-mock-data';
import { ResultsView } from '@/components/screening/ResultsView';
import { MediaCheckResultsView } from '@/components/screening/MediaCheckResultsView';
import { PassportCheckResultsView } from '@/components/screening/PassportCheckResultsView';
import { PassportCheckForm } from '@/components/screening/PassportCheckForm';
import type { ScreeningConfig, ScreeningData, CheckType, EntityType, Match, PassportData, MediaCheckResult, PassportCheckResult, IdentificationDocument } from '@/types';
import { CountryMultiSelect, COUNTRIES } from '@/components/screening/CountryMultiSelect';
import { BatchUpload, type BatchRecord } from '@/components/screening/BatchUpload';

const steps = ['Configure & Enter Data', 'Results'];

const defaultConfig: ScreeningConfig = {
  groupId: groups[0].id,
  mode: 'Single',
  entityType: 'Individual',
  checkTypes: ['Watchlists'],
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
  nationalities: [],
  countries: [],
  placeOfBirth: [],
  idType: '',
  idNumber: '',
  identificationDocuments: [],
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
  const [batchRecords, setBatchRecords] = useState<BatchRecord[]>([]);

  const selectedGroup = groups.find(g => g.id === config.groupId);

  const hasWorldCheck = config.checkTypes.includes('Watchlists');
  const hasMediaCheck = config.checkTypes.includes('Adverse Media');
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
      .map((m, i) => ({ ...m, caseId: data.caseId || `WL-NEW-${Date.now()}`, checkType: config.checkTypes[i % config.checkTypes.length] }));
    return subset;
  }, [step]);

  const mediaResult: MediaCheckResult | null = useMemo(() => {
    if (step !== 1 || !hasMediaCheck) return null;
    const cid = data.caseId || `WL-NEW-${Date.now()}`;
    return generateMediaCheckResult(cid, data.name || passportData.givenName + ' ' + passportData.lastName);
  }, [step]);

  const passportResult: PassportCheckResult | null = useMemo(() => {
    if (step !== 1 || !hasPassportCheck) return null;
    const cid = data.caseId || `WL-NEW-${Date.now()}`;
    return generatePassportCheckResult(cid, passportData);
  }, [step]);

  const isBatch = config.mode === 'Batch';

  const canScreen = config.groupId && config.checkTypes.length > 0 && (
    isBatch
      ? batchRecords.length > 0
      : passportOnly
        ? passportData.givenName.trim().length > 0 && passportData.lastName.trim().length > 0 && passportData.identificationNumber.trim().length > 0
        : data.name.trim().length > 0
  );

  // Determine which results tabs to show
  const [activeResultTab, setActiveResultTab] = useState<string>('');

  const resultTabs = useMemo(() => {
    const tabs: string[] = [];
    if (hasWorldCheck) tabs.push('Watchlists');
    if (hasMediaCheck) tabs.push('Adverse Media');
    if (hasPassportCheck) tabs.push('Passport Check');
    return tabs;
  }, [hasWorldCheck, hasMediaCheck, hasPassportCheck]);

  const currentResultTab = activeResultTab || resultTabs[0] || '';
  const caseId = data.caseId || `WL-NEW-${Date.now()}`;
  const caseName = passportOnly ? `${passportData.givenName} ${passportData.lastName}` : data.name;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold flex items-center gap-2 mb-6">
        <Search className="h-5 w-5 text-primary" /> New Screening
      </h1>
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
        <div className="animate-fade-in grid grid-cols-[220px_1fr] gap-4">
          {/* Left sidebar — single-click selectors */}
          <div className="space-y-5">
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Group */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Group</Label>
                  <Select value={config.groupId} onValueChange={v => setConfig(c => ({ ...c, groupId: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Mode */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Mode</Label>
                  <div className="flex flex-col gap-1">
                    {(['Single', 'Batch'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setConfig(c => ({ ...c, mode: m }))}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors border text-left ${
                          config.mode === m
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {m === 'Single' ? 'Single Screening' : 'Batch Screening'}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Entity Type */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Entity Type</Label>
                  <div className="flex flex-col gap-1">
                    {(['Individual', 'Organisation', 'Vessel', 'Unspecified'] as EntityType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => !hasPassportCheck && setConfig(c => ({ ...c, entityType: t }))}
                        disabled={hasPassportCheck && t !== 'Individual'}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors border text-left ${
                          config.entityType === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : hasPassportCheck && t !== 'Individual'
                            ? 'bg-muted/30 text-muted-foreground/40 border-transparent cursor-not-allowed'
                            : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {hasPassportCheck && (
                    <p className="text-[10px] text-muted-foreground">Passport Check requires Individual</p>
                  )}
                </div>

                <Separator />

                {/* Check Types */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Check Types</Label>
                  <div className="flex flex-col gap-1.5">
                    {(['Watchlists', 'Adverse Media', 'Passport Check'] as CheckType[]).map(ct => (
                      <label key={ct} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={config.checkTypes.includes(ct)}
                          onCheckedChange={() => handleCheckTypeToggle(ct)}
                        />
                        <span>{ct}</span>
                        {ct === 'Adverse Media' && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Articles</Badge>
                        )}
                        {ct === 'Passport Check' && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">MRZ</Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* OGS */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                    OGS <span className="font-normal">({selectedGroup?.ongoingFrequency || 'N/A'})</span>
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={config.ogsWorldCheck} onCheckedChange={v => setConfig(c => ({ ...c, ogsWorldCheck: v }))} />
                      <span className="text-xs">Watchlists</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={config.ogsMediaCheck} onCheckedChange={v => setConfig(c => ({ ...c, ogsMediaCheck: v }))} />
                      <span className="text-xs">Adverse Media</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right side — Data Entry */}
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

              {/* Batch mode: file upload */}
              {isBatch && (
                <BatchUpload
                  records={batchRecords}
                  onRecordsLoaded={setBatchRecords}
                  onClear={() => setBatchRecords([])}
                />
              )}

              {/* Single mode: Standard screening fields */}
              {!isBatch && (hasWorldCheck || hasMediaCheck) && (
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

                  {/* Secondary Identifiers */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-muted-foreground">Secondary Identifiers</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {config.entityType !== 'Organisation' && (
                        <div className="space-y-1">
                          <Label className="text-[10px]">Date of Birth</Label>
                          <Input type="date" value={data.dob} onChange={e => setData(d => ({ ...d, dob: e.target.value }))} className="h-8 text-xs" />
                        </div>
                      )}
                      {config.entityType !== 'Organisation' && (
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
                      )}
                      {config.entityType !== 'Organisation' && (
                        <div className="space-y-1">
                          <Label className="text-[10px]">Citizenship <span className="text-muted-foreground">(up to 3)</span></Label>
                          <CountryMultiSelect
                            value={data.nationalities}
                            onChange={v => setData(d => ({ ...d, nationalities: v }))}
                            max={3}
                            placeholder="Select citizenship..."
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-[10px]">{config.entityType === 'Organisation' ? 'Registered Country' : 'Country / Location'} <span className="text-muted-foreground">(up to 3)</span></Label>
                        <CountryMultiSelect
                          value={data.countries}
                          onChange={v => setData(d => ({ ...d, countries: v }))}
                          max={3}
                          placeholder={config.entityType === 'Organisation' ? 'Select country...' : 'Select country/location...'}
                        />
                      </div>
                      {hasMediaCheck && config.entityType !== 'Organisation' && (
                        <div className="space-y-1">
                          <Label className="text-[10px]">Place of Birth <span className="text-muted-foreground">(up to 3)</span></Label>
                          <CountryMultiSelect
                            value={data.placeOfBirth}
                            onChange={v => setData(d => ({ ...d, placeOfBirth: v }))}
                            max={3}
                            placeholder="Select place of birth..."
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Identification Documents */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-muted-foreground">Identification Documents</h3>
                      {data.identificationDocuments.length < 3 && data.identificationDocuments.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => setData(d => ({
                            ...d,
                            identificationDocuments: [...d.identificationDocuments, { type: '', number: '', country: '' }]
                          }))}
                        >
                          + Add Document
                        </Button>
                      )}
                    </div>
                    {data.identificationDocuments.length === 0 && (
                      <button
                        onClick={() => setData(d => ({
                          ...d,
                          identificationDocuments: [{ type: '', number: '', country: '' }]
                        }))}
                        className="w-full border border-dashed rounded-md py-3 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        + Add Identification Document
                      </button>
                    )}
                    {data.identificationDocuments.map((doc, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Document Type</Label>
                          <Select
                            value={doc.type}
                            onValueChange={v => setData(d => {
                              const docs = [...d.identificationDocuments];
                              docs[idx] = { ...docs[idx], type: v };
                              return { ...d, identificationDocuments: docs };
                            })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Passport">Passport</SelectItem>
                              <SelectItem value="National ID">National ID</SelectItem>
                              <SelectItem value="Driving License">Driving License</SelectItem>
                              <SelectItem value="Tax ID">Tax ID</SelectItem>
                              <SelectItem value="Company Registration">Company Registration</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Document Number</Label>
                          <Input
                            value={doc.number}
                            onChange={e => setData(d => {
                              const docs = [...d.identificationDocuments];
                              docs[idx] = { ...docs[idx], number: e.target.value };
                              return { ...d, identificationDocuments: docs };
                            })}
                            placeholder="e.g. AB123456"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Issuing Country</Label>
                          <CountryMultiSelect
                            value={doc.country ? [doc.country] : []}
                            onChange={v => setData(d => {
                              const docs = [...d.identificationDocuments];
                              docs[idx] = { ...docs[idx], country: v[0] || '' };
                              return { ...d, identificationDocuments: docs };
                            })}
                            max={1}
                            placeholder="Select..."
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setData(d => ({
                            ...d,
                            identificationDocuments: d.identificationDocuments.filter((_, i) => i !== idx)
                          }))}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Passport Check Form */}
              {!isBatch && hasPassportCheck && (
                <div className={`${hasWorldCheck || hasMediaCheck ? 'pt-4 border-t' : ''}`}>
                  <PassportCheckForm data={passportData} onChange={setPassportData} />
                </div>
              )}

              {/* Media Check link to primary case */}
              {hasMediaCheck && hasWorldCheck && (
                <div className="p-3 rounded-lg bg-muted">
                  <Label className="text-[10px] font-medium">Link to Primary Case (optional)</Label>
                  <Input placeholder="Enter Case ID or Name..." className="mt-1.5 h-8 text-xs" />
                  <p className="text-[9px] text-muted-foreground mt-1">Link this Adverse Media check to an existing Watchlists case</p>
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => { setStep(1); setActiveResultTab(''); }} disabled={!canScreen} size="lg">
                  <Search className="h-4 w-4 mr-2" /> {isBatch ? `Screen ${batchRecords.length} Records` : 'Screen Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Results */}
      {step === 1 && (
        <div className="animate-fade-in">
          {/* Case link banner */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border bg-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{caseName}</p>
              <p className="text-xs text-muted-foreground font-mono">{caseId}</p>
            </div>
            <Link to={`/cases/${caseId}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Open Case
              </Button>
            </Link>
          </div>
          {resultTabs.length > 1 && (
            <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg">
              {resultTabs.map(tab => {
                const icon = tab === 'Watchlists' ? <Shield className="h-3.5 w-3.5" />
                  : tab === 'Adverse Media' ? <Newspaper className="h-3.5 w-3.5" />
                  : <CreditCard className="h-3.5 w-3.5" />;
                return (
                  <Tooltip key={tab}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveResultTab(tab)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          currentResultTab === tab
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                      >
                        {icon}
                        <span className="hidden sm:inline">{tab}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="sm:hidden text-xs">{tab}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Render appropriate results view */}
          {currentResultTab === 'Watchlists' && (
            <ResultsView
              matches={simulatedResults.filter(m => m.checkType === 'Watchlists')}
              caseName={caseName}
              caseId={caseId}
              checkTypes={['Watchlists']}
            />
          )}

          {currentResultTab === 'Adverse Media' && mediaResult && (
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
