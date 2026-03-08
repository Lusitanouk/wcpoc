import type { Group, Case, Match, Dataset, MatchStatus, RiskLevel, CheckType, EntityType, ChangeLogEntry, WhyMatchedField, MatchFieldResult, CaseNote, CaseAuditEvent, AuditEventType, AuditMatchDetail, AuditEventDetails, ResolutionHistoryEntry, PriorityLevel, MakerDecision, MakerType } from '@/types';
import { computePriorityScore, priorityLevel } from '@/lib/priority';

// ─── Reference Data ──────────────────────────────────────────

export const groups: Group[] = [
  { id: 'g1', name: 'Default Screening Group', ongoingFrequency: 'Daily' },
  { id: 'g2', name: 'Enhanced Due Diligence', ongoingFrequency: 'Weekly' },
  { id: 'g3', name: 'PEP Monitoring', ongoingFrequency: 'Monthly' },
  { id: 'g4', name: 'Sanctions Only', ongoingFrequency: 'Daily' },
];

const analysts = ['John Smith', 'Jane Doe', 'Alex Turner', 'Maria Lopez', 'Sam Wilson'];

const reviewReasons = ['Profile updated', 'New alias added', 'Status change', 'New source added', 'Category reclassified', 'Sanctions list updated'];
const changeFields = ['Category', 'Nationality', 'Secondary ID', 'Alias', 'PEP Status', 'Sanctions List'];
const noteTexts = [
  'Initial screening completed. No immediate red flags.',
  'Escalated for supervisor review due to high match strength.',
  'Client provided additional documentation — re-screening advised.',
  'OGS alert triggered — new sanctions list entry detected.',
  'Case reassigned from previous analyst.',
  'Reviewed media articles — no adverse findings.',
  'Passport verification pending — document quality low.',
  'Moved to EDD group for enhanced monitoring.',
];
const keywords = ['Terrorism', 'Money Laundering', 'Fraud', 'Corruption', 'Drug Trafficking', 'Arms Dealing', 'Tax Evasion', 'Cybercrime'];
const countries = ['United States', 'United Kingdom', 'Russia', 'China', 'Germany', 'France', 'Saudi Arabia', 'UAE', 'Japan', 'Brazil'];
const nationalities = ['US', 'UK', 'RU', 'CN', 'DE', 'FR', 'SA', 'AE', 'JP', 'BR', 'IN', 'TR', 'IR', 'SY', 'KP'];

// ─── Utility ─────────────────────────────────────────────────

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(start: string, end: string) {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().split('T')[0];
}

// ─── Deterministic Case + Match Definitions ──────────────────

interface CaseDef {
  name: string;
  entityType: EntityType;
  groupId: string;
  status: 'Active' | 'Archived' | 'Deleted';
  mode: 'Single' | 'Batch';
  checkTypes: CheckType[];
  ogsWorldCheck: boolean;
  ogsMediaCheck: boolean;
  rating: RiskLevel;
  assignee: string;
  screeningData: Case['screeningData'];
  matches: MatchDef[];
}

interface MatchDef {
  matchedName: string;
  aliases: string[];
  strength: number;
  dataset: Dataset;
  status: MatchStatus;
  riskLevel: RiskLevel;
  updated: boolean;
  reviewRequired: boolean;
  reviewRequiredReasons: string[];
  whyMatched: WhyMatchedField[];
  matchStrengthExplanation: string;
  identifiers: Match['identifiers'];
  recordData: Match['recordData'];
}

// Helper to create why-matched fields for individuals
function wmIndividual(
  caseName: string, matchName: string, strength: number,
  opts: { dobInput?: string; dobMatch?: string; dobResult?: MatchFieldResult; natInput?: string; natMatch?: string; natResult?: MatchFieldResult; countryInput?: string; countryMatch?: string; countryResult?: MatchFieldResult; idInput?: string; idMatch?: string; idResult?: MatchFieldResult }
): { whyMatched: WhyMatchedField[]; matchStrengthExplanation: string } {
  const nameResult: MatchFieldResult = strength >= 85 ? 'match' : strength >= 65 ? 'partial' : 'mismatch';
  const fields: WhyMatchedField[] = [
    { field: 'Name', result: nameResult, detail: nameResult === 'match' ? 'Exact name match' : nameResult === 'partial' ? 'Close name variant' : 'Weak name similarity', inputValue: caseName, matchedValue: matchName },
  ];
  if (opts.dobResult) fields.push({ field: 'DOB', result: opts.dobResult, detail: opts.dobResult === 'match' ? 'Exact DOB match' : opts.dobResult === 'partial' ? 'Year of birth matches' : opts.dobResult === 'mismatch' ? 'DOB does not match' : 'DOB not available', inputValue: opts.dobInput || '—', matchedValue: opts.dobMatch || '—' });
  if (opts.natResult) fields.push({ field: 'Nationality', result: opts.natResult, detail: opts.natResult === 'match' ? 'Nationality matches' : opts.natResult === 'partial' ? 'Region matches' : opts.natResult === 'mismatch' ? 'Different nationality' : 'Nationality not provided', inputValue: opts.natInput || '—', matchedValue: opts.natMatch || '—' });
  if (opts.countryResult) fields.push({ field: 'Country', result: opts.countryResult, detail: opts.countryResult === 'match' ? 'Country matches' : opts.countryResult === 'partial' ? 'Region overlap' : opts.countryResult === 'mismatch' ? 'Different country' : 'Country not available', inputValue: opts.countryInput || '—', matchedValue: opts.countryMatch || '—' });
  if (opts.idResult) fields.push({ field: 'ID Number', result: opts.idResult, detail: opts.idResult === 'match' ? 'ID number matches' : 'ID not available for comparison', inputValue: opts.idInput || '—', matchedValue: opts.idMatch || '—' });
  const matchingFields = fields.filter(f => f.result === 'match').map(f => f.field);
  const explanation = matchingFields.length >= 2 ? `Strong due to ${matchingFields.join(' + ').toLowerCase()} match` : matchingFields.length === 1 ? `Moderate - ${matchingFields[0].toLowerCase()} matches but other fields unconfirmed` : `Weak match - primarily based on name similarity`;
  return { whyMatched: fields, matchStrengthExplanation: explanation };
}

function wmOrg(caseName: string, matchName: string, strength: number, opts: { jurisdictionInput?: string; jurisdictionMatch?: string; jurisdictionResult?: MatchFieldResult; regNoInput?: string; regNoMatch?: string; regNoResult?: MatchFieldResult; countryInput?: string; countryMatch?: string; countryResult?: MatchFieldResult }): { whyMatched: WhyMatchedField[]; matchStrengthExplanation: string } {
  const nameResult: MatchFieldResult = strength >= 85 ? 'match' : strength >= 65 ? 'partial' : 'mismatch';
  const fields: WhyMatchedField[] = [
    { field: 'Entity Name', result: nameResult, detail: nameResult === 'match' ? 'Exact name match' : nameResult === 'partial' ? 'Close name variant' : 'Weak name similarity', inputValue: caseName, matchedValue: matchName },
  ];
  if (opts.jurisdictionResult) fields.push({ field: 'Jurisdiction', result: opts.jurisdictionResult, detail: opts.jurisdictionResult === 'match' ? 'Jurisdiction matches' : opts.jurisdictionResult === 'partial' ? 'Region overlap' : opts.jurisdictionResult === 'mismatch' ? 'Different jurisdiction' : 'Jurisdiction not available', inputValue: opts.jurisdictionInput || '—', matchedValue: opts.jurisdictionMatch || '—' });
  if (opts.regNoResult) fields.push({ field: 'Registration No.', result: opts.regNoResult, detail: opts.regNoResult === 'match' ? 'Registration number matches' : 'Registration number not available', inputValue: opts.regNoInput || '—', matchedValue: opts.regNoMatch || '—' });
  if (opts.countryResult) fields.push({ field: 'Country', result: opts.countryResult, detail: opts.countryResult === 'match' ? 'Country matches' : opts.countryResult === 'mismatch' ? 'Different country' : 'Country not available', inputValue: opts.countryInput || '—', matchedValue: opts.countryMatch || '—' });
  const matchingFields = fields.filter(f => f.result === 'match').map(f => f.field);
  const explanation = matchingFields.length >= 2 ? `Strong due to ${matchingFields.join(' + ').toLowerCase()} match` : matchingFields.length === 1 ? `Moderate - ${matchingFields[0].toLowerCase()} matches but other fields unconfirmed` : `Weak match - primarily based on name similarity`;
  return { whyMatched: fields, matchStrengthExplanation: explanation };
}

function wmVessel(caseName: string, matchName: string, strength: number, opts: { imoInput?: string; imoMatch?: string; imoResult?: MatchFieldResult; flagInput?: string; flagMatch?: string; flagResult?: MatchFieldResult; countryInput?: string; countryMatch?: string; countryResult?: MatchFieldResult }): { whyMatched: WhyMatchedField[]; matchStrengthExplanation: string } {
  const nameResult: MatchFieldResult = strength >= 85 ? 'match' : strength >= 65 ? 'partial' : 'mismatch';
  const fields: WhyMatchedField[] = [
    { field: 'Vessel Name', result: nameResult, detail: nameResult === 'match' ? 'Exact name match' : nameResult === 'partial' ? 'Close name variant' : 'Weak name similarity', inputValue: caseName, matchedValue: matchName },
  ];
  if (opts.imoResult) fields.push({ field: 'IMO Number', result: opts.imoResult, detail: opts.imoResult === 'match' ? 'IMO number matches' : opts.imoResult === 'partial' ? 'Partial IMO match' : opts.imoResult === 'mismatch' ? 'Different IMO number' : 'IMO not available', inputValue: opts.imoInput || '—', matchedValue: opts.imoMatch || '—' });
  if (opts.flagResult) fields.push({ field: 'Flag State', result: opts.flagResult, detail: opts.flagResult === 'match' ? 'Flag state matches' : opts.flagResult === 'partial' ? 'Region overlap' : opts.flagResult === 'mismatch' ? 'Different flag state' : 'Flag state not available', inputValue: opts.flagInput || '—', matchedValue: opts.flagMatch || '—' });
  if (opts.countryResult) fields.push({ field: 'Country', result: opts.countryResult, detail: opts.countryResult === 'match' ? 'Country matches' : opts.countryResult === 'mismatch' ? 'Different country' : 'Country not available', inputValue: opts.countryInput || '—', matchedValue: opts.countryMatch || '—' });
  const matchingFields = fields.filter(f => f.result === 'match').map(f => f.field);
  const explanation = matchingFields.length >= 2 ? `Strong due to ${matchingFields.join(' + ').toLowerCase()} match` : matchingFields.length === 1 ? `Moderate - ${matchingFields[0].toLowerCase()} matches but other fields unconfirmed` : `Weak match - primarily based on name similarity`;
  return { whyMatched: fields, matchStrengthExplanation: explanation };
}

// ─── Helper generators (audit, notes, resolution, changelog) ─

function generateNotes(caseId: string): CaseNote[] {
  const count = randInt(0, 4);
  return Array.from({ length: count }, (_, i) => ({
    id: `${caseId}-note-${i}`,
    author: rand(analysts),
    text: rand(noteTexts),
    createdAt: randDate('2024-06-01', '2025-02-15'),
  }));
}

function generateChangeLog(isReviewReq: boolean): ChangeLogEntry[] {
  if (!isReviewReq) return [];
  return Array.from({ length: randInt(1, 3) }, () => ({
    field: rand(changeFields),
    from: rand(['Active', 'PEP Class 1', 'US', 'None', 'Category A']),
    to: rand(['Inactive', 'PEP Class 2', 'RU', 'Listed', 'Category B']),
    changedAt: randDate('2025-01-01', '2025-02-15'),
  }));
}

const resolutionReasons = [
  'No matching identifiers found — cleared as false positive.',
  'Confirmed match against sanctions list entry.',
  'Partial name match only — insufficient evidence to confirm.',
  'Entity confirmed via secondary ID verification.',
  'Auto-remediated: record removed from source list.',
  'Reviewed and confirmed as possible match pending further info.',
  'Duplicate entry — already resolved under separate case.',
];

function generateResolutionHistory(currentStatus: MatchStatus, currentRisk: RiskLevel): ResolutionHistoryEntry[] {
  const statuses: MatchStatus[] = ['Positive', 'Possible', 'False', 'Unknown'];
  const riskLevels: RiskLevel[] = ['High', 'Medium', 'Low', 'None'];
  const count = randInt(1, 4);
  const entries: ResolutionHistoryEntry[] = [];
  for (let i = 0; i < count; i++) {
    const isLatest = i === 0;
    entries.push({
      id: `rh-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      status: isLatest ? currentStatus : rand(statuses),
      riskLevel: isLatest ? currentRisk : rand(riskLevels),
      reason: rand(resolutionReasons),
      comment: Math.random() > 0.4 ? rand(noteTexts) : undefined,
      author: rand(analysts),
      createdAt: randDate(isLatest ? '2025-01-15' : '2024-06-01', isLatest ? '2025-02-15' : '2025-01-14'),
    });
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const auditEventTemplates: { type: AuditEventType; text: string }[] = [
  { type: 'created', text: 'Case created' },
  { type: 'assign', text: 'Assigned to {analyst}' },
  { type: 'move', text: 'Moved from Default Screening Group to Enhanced Due Diligence' },
  { type: 'rescreen', text: 'Manual rescreen initiated' },
  { type: 'ogs_toggle', text: 'OGS enabled' },
  { type: 'edit', text: 'Nationality updated from US to UK' },
  { type: 'status_change', text: 'Match WL-M3 resolved as False' },
  { type: 'note', text: 'Added note' },
  { type: 'rescreen', text: 'OGS scheduled rescreen completed' },
  { type: 'assign', text: 'Reassigned from {analyst} to {analyst2}' },
];

function generateScreeningDetails(): AuditEventDetails {
  const allNames = ['Ahmad Al-Rashid', 'Elena Volkov', 'Carlos Mendoza', 'Yuki Tanaka', 'James Morrison'];
  const allStatuses: MatchStatus[] = ['Positive', 'Possible', 'False', 'Unknown', 'Unresolved'];
  const allDatasets: Dataset[] = ['Sanctions', 'PEP', 'Law Enforcement', 'Other'];
  const matchCount = randInt(2, 6);
  const actions: AuditMatchDetail['action'][] = ['new', 'updated', 'auto_remediated', 'no_change'];
  const matchDetails: AuditMatchDetail[] = Array.from({ length: matchCount }, (_, i) => ({
    matchId: `WL-M${i + 1}`,
    matchedName: rand(allNames),
    strength: randInt(30, 99),
    status: rand(allStatuses),
    action: rand(actions),
    dataset: rand(allDatasets),
  }));
  return {
    matchesFound: matchCount,
    matchesUpdated: matchDetails.filter(m => m.action === 'updated').length,
    matchesAutoRemediated: matchDetails.filter(m => m.action === 'auto_remediated').length,
    matchDetails,
  };
}

function generateEditDetails(): AuditEventDetails {
  const field = rand(changeFields);
  return {
    fieldChanged: field,
    previousValue: rand(['Active', 'PEP Class 1', 'US', 'None']),
    newValue: rand(['Inactive', 'PEP Class 2', 'RU', 'Listed']),
  };
}

function generateAuditTrail(caseId: string, createdAt: string): CaseAuditEvent[] {
  const allStatuses: MatchStatus[] = ['Positive', 'Possible', 'False', 'Unknown', 'Unresolved'];
  const events: CaseAuditEvent[] = [
    { id: `${caseId}-audit-0`, type: 'created', author: 'System', text: 'Case created and initial screening completed', details: generateScreeningDetails(), createdAt },
  ];
  const count = randInt(15, 60);
  for (let i = 1; i <= count; i++) {
    const tmpl = rand(auditEventTemplates.filter(t => t.type !== 'created'));
    const author = tmpl.type === 'rescreen' ? 'System' : rand(analysts);
    const text = tmpl.text.replace('{analyst}', rand(analysts)).replace('{analyst2}', rand(analysts));
    const hasComment = Math.random() > 0.6;
    let details: AuditEventDetails | undefined;
    if (tmpl.type === 'rescreen') details = generateScreeningDetails();
    else if (tmpl.type === 'edit') details = generateEditDetails();
    else if (tmpl.type === 'status_change') details = { fieldChanged: 'Status', previousValue: rand(allStatuses), newValue: rand(allStatuses) };
    events.push({
      id: `${caseId}-audit-${i}`,
      type: tmpl.type,
      author,
      text,
      comment: hasComment ? rand(noteTexts) : undefined,
      details,
      createdAt: randDate(createdAt, '2025-02-20'),
    });
  }
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Case Definitions ────────────────────────────────────────

const caseDefs: CaseDef[] = [
  // ═══ INDIVIDUALS ═══
  // 1. High-risk sanctioned individual — all matches confirmed positive
  {
    name: 'Ahmad Al-Rashid', entityType: 'Individual', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'High', assignee: 'John Smith',
    screeningData: { dob: '1975-06-15', gender: 'Male', nationality: 'SA', country: 'Saudi Arabia', idType: 'Passport', idNumber: 'P482916375' },
    matches: [
      { matchedName: 'Ahmed Al Rashid', aliases: ['Ahmed Al-Rasheed', 'A. Rashid'], strength: 95, dataset: 'Sanctions', status: 'Positive', riskLevel: 'High', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Ahmad Al-Rashid', 'Ahmed Al Rashid', 95, { dobInput: '1975-06-15', dobMatch: '1975-06-15', dobResult: 'match', natInput: 'SA', natMatch: 'SA', natResult: 'match', countryInput: 'Saudi Arabia', countryMatch: 'Saudi Arabia', countryResult: 'match' }),
        identifiers: { dob: '1975-06-15', gender: 'Male', nationality: 'SA', country: 'Saudi Arabia' },
        recordData: { keyData: { 'Full Name': 'Ahmed Al Rashid', 'Date of Birth': '1975-06-15', 'Nationality': 'SA', 'Category': 'Sanctions', 'Listed Date': '2019-03-10', 'Last Updated': '2024-11-22' }, furtherInfo: 'Subject designated under OFAC Executive Order 13224 for providing material support to designated terrorist organisations. Multiple international arrest warrants outstanding.', aliases: ['Ahmed Al-Rasheed', 'A. Rashid'], keywords: ['Terrorism', 'Money Laundering'], pepRoleDetails: undefined, connections: ['Khalid Al-Rashid (Family)', 'Mustafa Haddad (Associate)'], sources: [{ name: 'OFAC SDN List', url: '#' }, { name: 'UN Security Council', url: '#' }] } },
      { matchedName: 'Ahmad Rashid', aliases: ['A. Rashid Khan'], strength: 72, dataset: 'PEP', status: 'Possible', riskLevel: 'Medium', updated: true, reviewRequired: true, reviewRequiredReasons: ['New alias added', 'Category reclassified'],
        ...wmIndividual('Ahmad Al-Rashid', 'Ahmad Rashid', 72, { dobInput: '1975-06-15', dobMatch: '1975-??-??', dobResult: 'partial', natInput: 'SA', natMatch: 'PK', natResult: 'mismatch', countryInput: 'Saudi Arabia', countryMatch: 'Pakistan', countryResult: 'mismatch' }),
        identifiers: { dob: '1976-02-10', gender: 'Male', nationality: 'PK', country: 'Pakistan' },
        recordData: { keyData: { 'Full Name': 'Ahmad Rashid', 'Date of Birth': '1976-02-10', 'Nationality': 'PK', 'Category': 'PEP', 'Listed Date': '2020-07-14', 'Last Updated': '2025-01-30' }, furtherInfo: 'Politically exposed person — former Provincial Minister of Finance, Sindh Province, Pakistan. Under investigation for corruption.', aliases: ['A. Rashid Khan'], keywords: ['Corruption', 'Tax Evasion'], pepRoleDetails: 'Former Provincial Minister of Finance, Sindh Province, Pakistan', connections: ['Tariq Rashid (Family)', 'National Bank of Pakistan (Business Partner)'], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 2. Clean individual — all false matches
  {
    name: 'Elena Volkov', entityType: 'Individual', groupId: 'g1', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: true, ogsMediaCheck: false, rating: 'None', assignee: 'Jane Doe',
    screeningData: { dob: '1988-11-22', gender: 'Female', nationality: 'RU', country: 'Germany', idType: 'National ID', idNumber: 'N293847561' },
    matches: [
      { matchedName: 'Yelena Volkova', aliases: ['E. Volkova'], strength: 68, dataset: 'Sanctions', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Elena Volkov', 'Yelena Volkova', 68, { dobInput: '1988-11-22', dobMatch: '1962-04-08', dobResult: 'mismatch', natInput: 'RU', natMatch: 'RU', natResult: 'match', countryInput: 'Germany', countryMatch: 'Russia', countryResult: 'mismatch' }),
        identifiers: { dob: '1962-04-08', gender: 'Female', nationality: 'RU', country: 'Russia' },
        recordData: { keyData: { 'Full Name': 'Yelena Volkova', 'Date of Birth': '1962-04-08', 'Nationality': 'RU', 'Category': 'Sanctions', 'Listed Date': '2022-05-18', 'Last Updated': '2024-09-01' }, furtherInfo: 'Designated under EU Regulation 269/2014 in connection with actions undermining territorial integrity of Ukraine. Senior official at state-owned energy company.', aliases: ['E. Volkova'], keywords: ['Corruption'], pepRoleDetails: undefined, connections: ['Viktor Volkov (Family)'], sources: [{ name: 'EU Sanctions List', url: '#' }] } },
      { matchedName: 'Elena Volkova', aliases: [], strength: 58, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Elena Volkov', 'Elena Volkova', 58, { dobInput: '1988-11-22', dobMatch: '1995-07-30', dobResult: 'mismatch', natInput: 'RU', natMatch: 'UA', natResult: 'mismatch' }),
        identifiers: { dob: '1995-07-30', gender: 'Female', nationality: 'UA', country: 'Ukraine' },
        recordData: { keyData: { 'Full Name': 'Elena Volkova', 'Date of Birth': '1995-07-30', 'Nationality': 'UA', 'Category': 'Other', 'Listed Date': '2023-01-12', 'Last Updated': '2024-06-15' }, furtherInfo: 'Named in connection with a financial fraud investigation in Kyiv. No formal charges filed.', aliases: [], keywords: ['Fraud'], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 3. Under investigation — mixed unresolved + possible
  {
    name: 'Carlos Mendoza', entityType: 'Individual', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media', 'Passport Check'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'High', assignee: 'Alex Turner',
    screeningData: { dob: '1970-03-14', gender: 'Male', nationality: 'MX', country: 'Mexico', idType: 'Passport', idNumber: 'P672184935' },
    matches: [
      { matchedName: 'Carlos Alberto Mendoza Reyes', aliases: ['C. Mendoza', 'Carlos Mendoza-Reyes', 'El Patron'], strength: 91, dataset: 'Law Enforcement', status: 'Unresolved', riskLevel: 'High', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Carlos Mendoza', 'Carlos Alberto Mendoza Reyes', 91, { dobInput: '1970-03-14', dobMatch: '1970-03-14', dobResult: 'match', natInput: 'MX', natMatch: 'MX', natResult: 'match', countryInput: 'Mexico', countryMatch: 'Mexico', countryResult: 'match', idInput: 'P672184935', idMatch: 'P672184935', idResult: 'match' }),
        identifiers: { dob: '1970-03-14', gender: 'Male', nationality: 'MX', country: 'Mexico' },
        recordData: { keyData: { 'Full Name': 'Carlos Alberto Mendoza Reyes', 'Date of Birth': '1970-03-14', 'Nationality': 'MX', 'Category': 'Law Enforcement', 'Listed Date': '2018-09-22', 'Last Updated': '2025-02-01' }, furtherInfo: 'Subject of DEA investigation for alleged narcotics trafficking across US-Mexico border. Interpol Red Notice issued. Known to use multiple identity documents.', aliases: ['C. Mendoza', 'Carlos Mendoza-Reyes', 'El Patron'], keywords: ['Drug Trafficking', 'Money Laundering'], pepRoleDetails: undefined, connections: ['Diego Mendoza (Family)', 'Rosa Mendoza (Family)', 'Sinaloa Financial Group SA (Business Partner)'], sources: [{ name: 'Interpol', url: '#' }, { name: 'OFAC SDN List', url: '#' }, { name: 'DEA Most Wanted', url: '#' }] } },
      { matchedName: 'Carlos J. Mendoza', aliases: ['CJ Mendoza'], strength: 64, dataset: 'PEP', status: 'Possible', riskLevel: 'Medium', updated: true, reviewRequired: true, reviewRequiredReasons: ['Profile updated', 'Status change'],
        ...wmIndividual('Carlos Mendoza', 'Carlos J. Mendoza', 64, { dobInput: '1970-03-14', dobMatch: '1972-08-19', dobResult: 'mismatch', natInput: 'MX', natMatch: 'CO', natResult: 'mismatch', countryInput: 'Mexico', countryMatch: 'Colombia', countryResult: 'mismatch' }),
        identifiers: { dob: '1972-08-19', gender: 'Male', nationality: 'CO', country: 'Colombia' },
        recordData: { keyData: { 'Full Name': 'Carlos Javier Mendoza', 'Date of Birth': '1972-08-19', 'Nationality': 'CO', 'Category': 'PEP', 'Listed Date': '2021-11-05', 'Last Updated': '2025-01-15' }, furtherInfo: 'Former Colombian congressman from Antioquia department. Under investigation by Fiscalía for illicit enrichment.', aliases: ['CJ Mendoza'], keywords: ['Corruption'], pepRoleDetails: 'Former Congressman, Antioquia Department, Colombia', connections: ['Mendoza Family Foundation (Business Partner)'], sources: [{ name: 'World-Check', url: '#' }] } },
      { matchedName: 'C. Mendoza García', aliases: [], strength: 42, dataset: 'Other', status: 'Unresolved', riskLevel: 'Low', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Carlos Mendoza', 'C. Mendoza García', 42, { dobInput: '1970-03-14', dobMatch: '—', dobResult: 'missing', natInput: 'MX', natMatch: '—', natResult: 'missing' }),
        identifiers: { country: 'Spain' },
        recordData: { keyData: { 'Full Name': 'C. Mendoza García', 'Nationality': 'Unknown', 'Category': 'Other', 'Listed Date': '2023-06-12', 'Last Updated': '2024-03-01' }, furtherInfo: 'Named in Spanish media reports in connection with tax evasion investigation in Marbella. Limited identifying information available.', aliases: [], keywords: ['Tax Evasion'], pepRoleDetails: undefined, connections: [], sources: [{ name: 'AEAT Spain', url: '#' }] } },
    ],
  },
  // 4. PEP monitoring — low risk
  {
    name: 'Yuki Tanaka', entityType: 'Individual', groupId: 'g3', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: true, ogsMediaCheck: false, rating: 'Low', assignee: 'Maria Lopez',
    screeningData: { dob: '1965-09-03', gender: 'Female', nationality: 'JP', country: 'Japan' },
    matches: [
      { matchedName: 'Yuki Tanaka', aliases: ['田中 有希'], strength: 88, dataset: 'PEP', status: 'Possible', riskLevel: 'Low', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Yuki Tanaka', 'Yuki Tanaka', 88, { dobInput: '1965-09-03', dobMatch: '1965-09-03', dobResult: 'match', natInput: 'JP', natMatch: 'JP', natResult: 'match', countryInput: 'Japan', countryMatch: 'Japan', countryResult: 'match' }),
        identifiers: { dob: '1965-09-03', gender: 'Female', nationality: 'JP', country: 'Japan' },
        recordData: { keyData: { 'Full Name': 'Yuki Tanaka', 'Date of Birth': '1965-09-03', 'Nationality': 'JP', 'Category': 'PEP', 'Listed Date': '2016-04-20', 'Last Updated': '2024-12-15' }, furtherInfo: 'Politically exposed person — current Vice-Minister of Economy, Trade and Industry (METI). No adverse information.', aliases: ['田中 有希'], keywords: [], pepRoleDetails: 'Vice-Minister of Economy, Trade and Industry, Japan', connections: ['Hiroshi Tanaka (Family)'], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 5. Archived case — previously cleared
  {
    name: 'James Morrison', entityType: 'Individual', groupId: 'g1', status: 'Archived', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Sam Wilson',
    screeningData: { dob: '1982-07-28', gender: 'Male', nationality: 'US', country: 'United States', idType: 'Passport', idNumber: 'P518293746' },
    matches: [
      { matchedName: 'James R. Morrison', aliases: ['Jim Morrison'], strength: 55, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('James Morrison', 'James R. Morrison', 55, { dobInput: '1982-07-28', dobMatch: '1943-12-08', dobResult: 'mismatch', natInput: 'US', natMatch: 'US', natResult: 'match', countryInput: 'United States', countryMatch: 'United States', countryResult: 'match' }),
        identifiers: { dob: '1943-12-08', gender: 'Male', nationality: 'US', country: 'United States' },
        recordData: { keyData: { 'Full Name': 'James R. Morrison', 'Date of Birth': '1943-12-08', 'Nationality': 'US', 'Category': 'Other', 'Listed Date': '2020-01-15', 'Last Updated': '2022-10-01' }, furtherInfo: 'Historical record. No current adverse information.', aliases: ['Jim Morrison'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 6. Batch-screened individual — multiple review required
  {
    name: 'Fatima Hassan', entityType: 'Individual', groupId: 'g4', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'Medium', assignee: 'John Smith',
    screeningData: { dob: '1990-01-05', gender: 'Female', nationality: 'EG', country: 'Egypt' },
    matches: [
      { matchedName: 'Fatima Al-Hassan', aliases: ['F. Hassan', 'Fatima Hasan'], strength: 82, dataset: 'Sanctions', status: 'Unresolved', riskLevel: 'High', updated: true, reviewRequired: true, reviewRequiredReasons: ['Sanctions list updated', 'New source added'],
        ...wmIndividual('Fatima Hassan', 'Fatima Al-Hassan', 82, { dobInput: '1990-01-05', dobMatch: '1990-??-??', dobResult: 'partial', natInput: 'EG', natMatch: 'EG', natResult: 'match', countryInput: 'Egypt', countryMatch: 'UAE', countryResult: 'mismatch' }),
        identifiers: { dob: '1990-01-01', gender: 'Female', nationality: 'EG', country: 'UAE' },
        recordData: { keyData: { 'Full Name': 'Fatima Al-Hassan', 'Date of Birth': '1990-01-01', 'Nationality': 'EG', 'Category': 'Sanctions', 'Listed Date': '2024-06-01', 'Last Updated': '2025-02-10' }, furtherInfo: 'Recently added to OFAC sanctions list. Subject allegedly facilitated financial transfers to designated entities through UAE-based shell companies.', aliases: ['F. Hassan', 'Fatima Hasan'], keywords: ['Money Laundering', 'Terrorism'], pepRoleDetails: undefined, connections: ['Hassan Financial Group (Business Partner)', 'Omar Hassan (Family)'], sources: [{ name: 'OFAC SDN List', url: '#' }, { name: 'UN Security Council', url: '#' }] } },
      { matchedName: 'Fatimah Hasan', aliases: [], strength: 48, dataset: 'Other', status: 'Unresolved', riskLevel: 'Low', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Fatima Hassan', 'Fatimah Hasan', 48, { dobInput: '1990-01-05', dobMatch: '—', dobResult: 'missing', natInput: 'EG', natMatch: 'JO', natResult: 'mismatch' }),
        identifiers: { gender: 'Female', nationality: 'JO', country: 'Jordan' },
        recordData: { keyData: { 'Full Name': 'Fatimah Hasan', 'Nationality': 'JO', 'Category': 'Other', 'Listed Date': '2022-09-14', 'Last Updated': '2023-12-01' }, furtherInfo: 'Limited information. Named in Jordanian media as person of interest in financial fraud case. No formal charges.', aliases: [], keywords: ['Fraud'], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 7. Russian PEP — medium risk, under ongoing screening
  {
    name: 'Viktor Petrov', entityType: 'Individual', groupId: 'g3', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'Medium', assignee: 'Alex Turner',
    screeningData: { dob: '1958-12-19', gender: 'Male', nationality: 'RU', country: 'Russia' },
    matches: [
      { matchedName: 'Viktor Ivanovich Petrov', aliases: ['V.I. Petrov', 'Виктор Петров'], strength: 86, dataset: 'PEP', status: 'Positive', riskLevel: 'Medium', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Viktor Petrov', 'Viktor Ivanovich Petrov', 86, { dobInput: '1958-12-19', dobMatch: '1958-12-19', dobResult: 'match', natInput: 'RU', natMatch: 'RU', natResult: 'match', countryInput: 'Russia', countryMatch: 'Russia', countryResult: 'match' }),
        identifiers: { dob: '1958-12-19', gender: 'Male', nationality: 'RU', country: 'Russia' },
        recordData: { keyData: { 'Full Name': 'Viktor Ivanovich Petrov', 'Date of Birth': '1958-12-19', 'Nationality': 'RU', 'Category': 'PEP', 'Listed Date': '2014-08-01', 'Last Updated': '2025-01-20' }, furtherInfo: 'Former Deputy Minister of Defence. Retains significant influence in Russian military-industrial complex. Subject to EU and UK sanctions since 2022.', aliases: ['V.I. Petrov', 'Виктор Петров'], keywords: ['Corruption', 'Arms Dealing'], pepRoleDetails: 'Former Deputy Minister of Defence, Russian Federation', connections: ['Dmitri Petrov (Family)', 'Rosoboronexport (Business Partner)'], sources: [{ name: 'EU Sanctions List', url: '#' }, { name: 'UK Sanctions List', url: '#' }, { name: 'World-Check', url: '#' }] } },
      { matchedName: 'V. Petrov', aliases: [], strength: 38, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Viktor Petrov', 'V. Petrov', 38, { dobInput: '1958-12-19', dobMatch: '1991-05-02', dobResult: 'mismatch', natInput: 'RU', natMatch: 'BG', natResult: 'mismatch' }),
        identifiers: { dob: '1991-05-02', gender: 'Male', nationality: 'BG', country: 'Bulgaria' },
        recordData: { keyData: { 'Full Name': 'Vasil Petrov', 'Date of Birth': '1991-05-02', 'Nationality': 'BG', 'Category': 'Other', 'Listed Date': '2023-03-01', 'Last Updated': '2023-03-01' }, furtherInfo: 'Named in Bulgarian tax evasion investigation. Different individual.', aliases: [], keywords: ['Tax Evasion'], pepRoleDetails: undefined, connections: [], sources: [{ name: 'BFIA Bulgaria', url: '#' }] } },
    ],
  },
  // 8. Chinese national — passport check case
  {
    name: 'Sarah Chen', entityType: 'Individual', groupId: 'g1', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Passport Check'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'Low', assignee: 'Jane Doe',
    screeningData: { dob: '1993-04-17', gender: 'Female', nationality: 'CN', country: 'China', idType: 'Passport', idNumber: 'E28471653' },
    matches: [
      { matchedName: 'Chen Xiaoli', aliases: ['Sarah Chen', '陈晓丽'], strength: 61, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Sarah Chen', 'Chen Xiaoli', 61, { dobInput: '1993-04-17', dobMatch: '1993-??-??', dobResult: 'partial', natInput: 'CN', natMatch: 'CN', natResult: 'match', countryInput: 'China', countryMatch: 'Singapore', countryResult: 'mismatch' }),
        identifiers: { dob: '1993-06-22', gender: 'Female', nationality: 'CN', country: 'Singapore' },
        recordData: { keyData: { 'Full Name': 'Chen Xiaoli', 'Date of Birth': '1993-06-22', 'Nationality': 'CN', 'Category': 'Other', 'Listed Date': '2024-02-10', 'Last Updated': '2024-08-01' }, furtherInfo: 'Named in connection with import/export fraud investigation in Singapore. Western alias "Sarah Chen" matches input name.', aliases: ['Sarah Chen', '陈晓丽'], keywords: ['Fraud'], pepRoleDetails: undefined, connections: [], sources: [{ name: 'MAS Singapore', url: '#' }] } },
    ],
  },
  // 9. Unassigned high-priority — needs attention
  {
    name: 'Mohammed Al-Fayed', entityType: 'Individual', groupId: 'g4', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: true, ogsMediaCheck: false, rating: 'High', assignee: 'Unassigned',
    screeningData: { dob: '1968-02-11', gender: 'Male', nationality: 'AE', country: 'UAE', idType: 'National ID', idNumber: 'N784129356' },
    matches: [
      { matchedName: 'Mohamed Al Fayed', aliases: ['Mohammed Fayed', 'M. Al-Fayed'], strength: 93, dataset: 'Sanctions', status: 'Unresolved', riskLevel: 'High', updated: true, reviewRequired: true, reviewRequiredReasons: ['Sanctions list updated', 'New source added', 'Profile updated'],
        ...wmIndividual('Mohammed Al-Fayed', 'Mohamed Al Fayed', 93, { dobInput: '1968-02-11', dobMatch: '1968-02-11', dobResult: 'match', natInput: 'AE', natMatch: 'AE', natResult: 'match', countryInput: 'UAE', countryMatch: 'UAE', countryResult: 'match', idInput: 'N784129356', idMatch: 'N784129356', idResult: 'match' }),
        identifiers: { dob: '1968-02-11', gender: 'Male', nationality: 'AE', country: 'UAE', idNumber: 'N784129356' },
        recordData: { keyData: { 'Full Name': 'Mohamed Al Fayed', 'Date of Birth': '1968-02-11', 'Nationality': 'AE', 'Category': 'Sanctions', 'Listed Date': '2023-11-30', 'Last Updated': '2025-02-15' }, furtherInfo: 'Designated for sanctions evasion activities through UAE-based front companies. Subject of ongoing OFAC investigation.', aliases: ['Mohammed Fayed', 'M. Al-Fayed'], keywords: ['Money Laundering', 'Fraud'], pepRoleDetails: undefined, connections: ['Al-Fayed Trading Group (Business Partner)', 'Layla Al-Fayed (Family)'], sources: [{ name: 'OFAC SDN List', url: '#' }, { name: 'EU Sanctions List', url: '#' }] } },
      { matchedName: 'Mohammed Fayed Ali', aliases: [], strength: 52, dataset: 'Law Enforcement', status: 'Unresolved', riskLevel: 'Medium', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Mohammed Al-Fayed', 'Mohammed Fayed Ali', 52, { dobInput: '1968-02-11', dobMatch: '1975-06-30', dobResult: 'mismatch', natInput: 'AE', natMatch: 'EG', natResult: 'mismatch', countryInput: 'UAE', countryMatch: 'Egypt', countryResult: 'mismatch' }),
        identifiers: { dob: '1975-06-30', gender: 'Male', nationality: 'EG', country: 'Egypt' },
        recordData: { keyData: { 'Full Name': 'Mohammed Fayed Ali', 'Date of Birth': '1975-06-30', 'Nationality': 'EG', 'Category': 'Law Enforcement', 'Listed Date': '2021-04-22', 'Last Updated': '2024-07-01' }, furtherInfo: 'Wanted by Egyptian authorities for financial crimes. Name similarity but different individual profile.', aliases: [], keywords: ['Fraud', 'Tax Evasion'], pepRoleDetails: undefined, connections: [], sources: [{ name: 'Interpol', url: '#' }] } },
    ],
  },
  // 10. Polish national — unknown status
  {
    name: 'Anna Kowalski', entityType: 'Individual', groupId: 'g1', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'Low', assignee: 'Maria Lopez',
    screeningData: { dob: '1985-06-12', gender: 'Female', nationality: 'PL', country: 'United Kingdom' },
    matches: [
      { matchedName: 'Anna Kowalska', aliases: ['A. Kowalski'], strength: 74, dataset: 'Other', status: 'Unknown', riskLevel: 'Low', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Anna Kowalski', 'Anna Kowalska', 74, { dobInput: '1985-06-12', dobMatch: '1985-06-12', dobResult: 'match', natInput: 'PL', natMatch: 'PL', natResult: 'match', countryInput: 'United Kingdom', countryMatch: 'Poland', countryResult: 'mismatch' }),
        identifiers: { dob: '1985-06-12', gender: 'Female', nationality: 'PL', country: 'Poland' },
        recordData: { keyData: { 'Full Name': 'Anna Kowalska', 'Date of Birth': '1985-06-12', 'Nationality': 'PL', 'Category': 'Other', 'Listed Date': '2024-01-10', 'Last Updated': '2024-10-20' }, furtherInfo: 'Named in Polish financial regulator report. Insufficient information to confirm or deny match. Polish feminine form of surname noted.', aliases: ['A. Kowalski'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'KNF Poland', url: '#' }] } },
    ],
  },
  // 11. Indian national — batch screened
  {
    name: 'Priya Sharma', entityType: 'Individual', groupId: 'g1', status: 'Active', mode: 'Batch',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Sam Wilson',
    screeningData: { dob: '1992-08-25', gender: 'Female', nationality: 'IN', country: 'India' },
    matches: [
      { matchedName: 'Priya Sharma', aliases: ['P. Sharma'], strength: 65, dataset: 'PEP', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Priya Sharma', 'Priya Sharma', 65, { dobInput: '1992-08-25', dobMatch: '1974-03-18', dobResult: 'mismatch', natInput: 'IN', natMatch: 'IN', natResult: 'match', countryInput: 'India', countryMatch: 'India', countryResult: 'match' }),
        identifiers: { dob: '1974-03-18', gender: 'Female', nationality: 'IN', country: 'India' },
        recordData: { keyData: { 'Full Name': 'Priya Sharma', 'Date of Birth': '1974-03-18', 'Nationality': 'IN', 'Category': 'PEP', 'Listed Date': '2019-05-01', 'Last Updated': '2024-11-01' }, furtherInfo: 'Common name match. PEP record refers to former state-level politician in Rajasthan. DOB mismatch confirms different individual.', aliases: ['P. Sharma'], keywords: [], pepRoleDetails: 'Former MLA, Rajasthan Legislative Assembly', connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 12. French national — possible match with review required
  {
    name: 'Jean-Pierre Dubois', entityType: 'Individual', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'Medium', assignee: 'John Smith',
    screeningData: { dob: '1955-11-30', gender: 'Male', nationality: 'FR', country: 'France', idType: 'National ID', idNumber: 'N185729364' },
    matches: [
      { matchedName: 'Jean Pierre Dubois', aliases: ['J-P Dubois', 'JP Dubois'], strength: 89, dataset: 'PEP', status: 'Positive', riskLevel: 'Medium', updated: true, reviewRequired: true, reviewRequiredReasons: ['Profile updated', 'New alias added'],
        ...wmIndividual('Jean-Pierre Dubois', 'Jean Pierre Dubois', 89, { dobInput: '1955-11-30', dobMatch: '1955-11-30', dobResult: 'match', natInput: 'FR', natMatch: 'FR', natResult: 'match', countryInput: 'France', countryMatch: 'France', countryResult: 'match', idInput: 'N185729364', idMatch: 'N185729364', idResult: 'match' }),
        identifiers: { dob: '1955-11-30', gender: 'Male', nationality: 'FR', country: 'France' },
        recordData: { keyData: { 'Full Name': 'Jean Pierre Dubois', 'Date of Birth': '1955-11-30', 'Nationality': 'FR', 'Category': 'PEP', 'Listed Date': '2015-03-01', 'Last Updated': '2025-02-05' }, furtherInfo: 'Politically exposed person — former Prefect of Île-de-France. Currently under investigation by Parquet National Financier for tax fraud and undeclared foreign assets.', aliases: ['J-P Dubois', 'JP Dubois'], keywords: ['Tax Evasion', 'Corruption'], pepRoleDetails: 'Former Prefect of Île-de-France, France', connections: ['Dubois Family Trust (Business Partner)', 'Marie Dubois (Family)'], sources: [{ name: 'Tracfin France', url: '#' }, { name: 'World-Check', url: '#' }] } },
      { matchedName: 'Jean Dubois', aliases: [], strength: 45, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Jean-Pierre Dubois', 'Jean Dubois', 45, { dobInput: '1955-11-30', dobMatch: '1980-07-14', dobResult: 'mismatch', natInput: 'FR', natMatch: 'BE', natResult: 'mismatch' }),
        identifiers: { dob: '1980-07-14', gender: 'Male', nationality: 'BE', country: 'Belgium' },
        recordData: { keyData: { 'Full Name': 'Jean Dubois', 'Date of Birth': '1980-07-14', 'Nationality': 'BE', 'Category': 'Other', 'Listed Date': '2023-08-20', 'Last Updated': '2024-01-01' }, furtherInfo: 'Belgian national. Partial name match only. No connection to screening subject.', aliases: [], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 13. Archived Turkish national
  {
    name: 'Yusuf Demir', entityType: 'Individual', groupId: 'g1', status: 'Archived', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Alex Turner',
    screeningData: { dob: '1979-04-22', gender: 'Male', nationality: 'TR', country: 'Germany' },
    matches: [
      { matchedName: 'Yusuf Demir', aliases: ['Y. Demir'], strength: 70, dataset: 'PEP', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Yusuf Demir', 'Yusuf Demir', 70, { dobInput: '1979-04-22', dobMatch: '1979-04-22', dobResult: 'match', natInput: 'TR', natMatch: 'TR', natResult: 'match', countryInput: 'Germany', countryMatch: 'Turkey', countryResult: 'mismatch' }),
        identifiers: { dob: '1979-04-22', gender: 'Male', nationality: 'TR', country: 'Turkey' },
        recordData: { keyData: { 'Full Name': 'Yusuf Demir', 'Date of Birth': '1979-04-22', 'Nationality': 'TR', 'Category': 'PEP', 'Listed Date': '2018-11-01', 'Last Updated': '2023-06-01' }, furtherInfo: 'Common Turkish name. PEP record refers to municipal official in Ankara. Screening subject is resident in Germany. Cleared as false positive.', aliases: ['Y. Demir'], keywords: [], pepRoleDetails: 'Municipal Council Member, Ankara', connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 14. Brazilian with many matches
  {
    name: 'Roberto Silva', entityType: 'Individual', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'High', assignee: 'Jane Doe',
    screeningData: { dob: '1972-10-08', gender: 'Male', nationality: 'BR', country: 'Brazil', idType: 'Passport', idNumber: 'FX847261' },
    matches: [
      { matchedName: 'Roberto Carlos Silva', aliases: ['R. Silva', 'Roberto C. Silva'], strength: 78, dataset: 'Law Enforcement', status: 'Unresolved', riskLevel: 'High', updated: true, reviewRequired: true, reviewRequiredReasons: ['New source added', 'Profile updated', 'Category reclassified'],
        ...wmIndividual('Roberto Silva', 'Roberto Carlos Silva', 78, { dobInput: '1972-10-08', dobMatch: '1972-??-??', dobResult: 'partial', natInput: 'BR', natMatch: 'BR', natResult: 'match', countryInput: 'Brazil', countryMatch: 'Brazil', countryResult: 'match' }),
        identifiers: { dob: '1972-03-15', gender: 'Male', nationality: 'BR', country: 'Brazil' },
        recordData: { keyData: { 'Full Name': 'Roberto Carlos Silva', 'Date of Birth': '1972-03-15', 'Nationality': 'BR', 'Category': 'Law Enforcement', 'Listed Date': '2020-08-12', 'Last Updated': '2025-01-28' }, furtherInfo: 'Subject of Polícia Federal investigation (Operation Lava Jato successor). Alleged involvement in bribing state officials for public works contracts.', aliases: ['R. Silva', 'Roberto C. Silva'], keywords: ['Corruption', 'Money Laundering'], pepRoleDetails: undefined, connections: ['Silva Construções SA (Business Partner)', 'Ana Silva (Family)'], sources: [{ name: 'Polícia Federal Brazil', url: '#' }, { name: 'COAF Brazil', url: '#' }] } },
      { matchedName: 'R. da Silva', aliases: ['Roberto da Silva'], strength: 41, dataset: 'Other', status: 'Unresolved', riskLevel: 'Low', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Roberto Silva', 'R. da Silva', 41, { dobInput: '1972-10-08', dobMatch: '—', dobResult: 'missing', natInput: 'BR', natMatch: 'BR', natResult: 'match' }),
        identifiers: { nationality: 'BR', country: 'Brazil' },
        recordData: { keyData: { 'Full Name': 'R. da Silva', 'Nationality': 'BR', 'Category': 'Other', 'Listed Date': '2024-05-20', 'Last Updated': '2024-05-20' }, furtherInfo: 'Very common name in Brazil. Minimal identifying information available. Likely false positive but insufficient data to confirm.', aliases: ['Roberto da Silva'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
      { matchedName: 'Roberto Silva Junior', aliases: ['Beto Silva'], strength: 67, dataset: 'PEP', status: 'Possible', riskLevel: 'Medium', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Roberto Silva', 'Roberto Silva Junior', 67, { dobInput: '1972-10-08', dobMatch: '1998-12-01', dobResult: 'mismatch', natInput: 'BR', natMatch: 'BR', natResult: 'match', countryInput: 'Brazil', countryMatch: 'Brazil', countryResult: 'match' }),
        identifiers: { dob: '1998-12-01', gender: 'Male', nationality: 'BR', country: 'Brazil' },
        recordData: { keyData: { 'Full Name': 'Roberto Silva Junior', 'Date of Birth': '1998-12-01', 'Nationality': 'BR', 'Category': 'PEP', 'Listed Date': '2023-01-15', 'Last Updated': '2024-11-10' }, furtherInfo: 'Son of prominent Brazilian politician. PEP by association. DOB indicates much younger person than screening subject.', aliases: ['Beto Silva'], keywords: [], pepRoleDetails: 'PEP by association — son of Senator Roberto Silva Sr.', connections: ['Roberto Silva Sr. (Family)'], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 15. Nigerian with many matches — batch
  {
    name: 'David Okonkwo', entityType: 'Individual', groupId: 'g1', status: 'Active', mode: 'Batch',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'Low', assignee: 'Sam Wilson',
    screeningData: { dob: '1987-03-30', gender: 'Male', nationality: 'NG', country: 'Nigeria' },
    matches: [
      { matchedName: 'David Chukwuemeka Okonkwo', aliases: ['D. Okonkwo'], strength: 71, dataset: 'PEP', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('David Okonkwo', 'David Chukwuemeka Okonkwo', 71, { dobInput: '1987-03-30', dobMatch: '1960-11-15', dobResult: 'mismatch', natInput: 'NG', natMatch: 'NG', natResult: 'match', countryInput: 'Nigeria', countryMatch: 'Nigeria', countryResult: 'match' }),
        identifiers: { dob: '1960-11-15', gender: 'Male', nationality: 'NG', country: 'Nigeria' },
        recordData: { keyData: { 'Full Name': 'David Chukwuemeka Okonkwo', 'Date of Birth': '1960-11-15', 'Nationality': 'NG', 'Category': 'PEP', 'Listed Date': '2017-02-01', 'Last Updated': '2024-09-15' }, furtherInfo: 'Former state governor. DOB mismatch clearly identifies different individual.', aliases: ['D. Okonkwo'], keywords: ['Corruption'], pepRoleDetails: 'Former Governor, Anambra State, Nigeria', connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },

  // ═══ ORGANISATIONS ═══
  // 16. Sanctioned shell company — high risk
  {
    name: 'Meridian Holdings Ltd', entityType: 'Organisation', groupId: 'g4', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'High', assignee: 'John Smith',
    screeningData: { country: 'UAE', idType: 'Registration No.', idNumber: 'REG-487291' },
    matches: [
      { matchedName: 'Meridian Holdings LLC', aliases: ['Meridian Group', 'MH Holdings'], strength: 94, dataset: 'Sanctions', status: 'Positive', riskLevel: 'High', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmOrg('Meridian Holdings Ltd', 'Meridian Holdings LLC', 94, { jurisdictionInput: 'UAE', jurisdictionMatch: 'UAE', jurisdictionResult: 'match', regNoInput: 'REG-487291', regNoMatch: 'REG-487291', regNoResult: 'match', countryInput: 'UAE', countryMatch: 'UAE', countryResult: 'match' }),
        identifiers: { country: 'UAE' },
        recordData: { keyData: { 'Entity Name': 'Meridian Holdings LLC', 'Jurisdiction': 'UAE', 'Registration No.': 'REG-487291', 'Category': 'Sanctions', 'Listed Date': '2022-04-15', 'Last Updated': '2025-01-10' }, furtherInfo: 'Designated as front company for sanctions evasion. Used to channel funds to OFAC-designated individuals through complex ownership structures across UAE, Cyprus, and BVI.', aliases: ['Meridian Group', 'MH Holdings'], keywords: ['Money Laundering', 'Fraud'], pepRoleDetails: undefined, connections: ['Mohamed Al Fayed (Director)', 'Al-Fayed Trading Group (Parent Company)', 'Meridian Shipping Services (Subsidiary)'], sources: [{ name: 'OFAC SDN List', url: '#' }, { name: 'EU Sanctions List', url: '#' }] } },
      { matchedName: 'Meridian Capital Holdings', aliases: ['MCH'], strength: 56, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmOrg('Meridian Holdings Ltd', 'Meridian Capital Holdings', 56, { jurisdictionInput: 'UAE', jurisdictionMatch: 'United Kingdom', jurisdictionResult: 'mismatch', regNoInput: 'REG-487291', regNoMatch: '—', regNoResult: 'missing' }),
        identifiers: { country: 'United Kingdom' },
        recordData: { keyData: { 'Entity Name': 'Meridian Capital Holdings', 'Jurisdiction': 'United Kingdom', 'Category': 'Other', 'Listed Date': '2023-09-01', 'Last Updated': '2024-02-01' }, furtherInfo: 'London-based investment firm. Name similarity only. FCA-regulated entity with no adverse findings.', aliases: ['MCH'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'FCA UK', url: '#' }] } },
    ],
  },
  // 17. Energy company — under investigation
  {
    name: 'Atlas Energy Group', entityType: 'Organisation', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'Medium', assignee: 'Alex Turner',
    screeningData: { country: 'Russia', idType: 'Registration No.', idNumber: 'REG-1102847' },
    matches: [
      { matchedName: 'Atlas Energy OOO', aliases: ['Atlas Energiya', 'АтласЭнергия'], strength: 83, dataset: 'Sanctions', status: 'Unresolved', riskLevel: 'High', updated: true, reviewRequired: true, reviewRequiredReasons: ['Sanctions list updated', 'New source added'],
        ...wmOrg('Atlas Energy Group', 'Atlas Energy OOO', 83, { jurisdictionInput: 'Russia', jurisdictionMatch: 'Russia', jurisdictionResult: 'match', regNoInput: 'REG-1102847', regNoMatch: 'REG-1102847', regNoResult: 'match', countryInput: 'Russia', countryMatch: 'Russia', countryResult: 'match' }),
        identifiers: { country: 'Russia' },
        recordData: { keyData: { 'Entity Name': 'Atlas Energy OOO', 'Jurisdiction': 'Russia', 'Registration No.': 'REG-1102847', 'Category': 'Sanctions', 'Listed Date': '2023-02-24', 'Last Updated': '2025-02-12' }, furtherInfo: 'Russian energy trading company designated under EU 12th sanctions package for operating in the Russian energy sector. Suspected of circumventing oil price cap through complex shipping arrangements.', aliases: ['Atlas Energiya', 'АтласЭнергия'], keywords: ['Money Laundering', 'Tax Evasion'], pepRoleDetails: undefined, connections: ['Viktor Petrov (Director)', 'Rosneft (Shareholder)', 'Atlas Maritime Services (Subsidiary)'], sources: [{ name: 'EU Sanctions List', url: '#' }, { name: 'UK Sanctions List', url: '#' }, { name: 'OFAC', url: '#' }] } },
      { matchedName: 'Atlas Energy Inc', aliases: ['Atlas Power'], strength: 47, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmOrg('Atlas Energy Group', 'Atlas Energy Inc', 47, { jurisdictionInput: 'Russia', jurisdictionMatch: 'United States', jurisdictionResult: 'mismatch', regNoInput: 'REG-1102847', regNoMatch: '—', regNoResult: 'missing' }),
        identifiers: { country: 'United States' },
        recordData: { keyData: { 'Entity Name': 'Atlas Energy Inc', 'Jurisdiction': 'United States', 'Category': 'Other', 'Listed Date': '2021-06-01', 'Last Updated': '2023-01-15' }, furtherInfo: 'US-based renewable energy company. No connection to Russian entity. Name coincidence.', aliases: ['Atlas Power'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'SEC', url: '#' }] } },
    ],
  },
  // 18. Clean financial services org
  {
    name: 'Phoenix Financial Services', entityType: 'Organisation', groupId: 'g1', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Maria Lopez',
    screeningData: { country: 'United Kingdom', idType: 'Registration No.', idNumber: 'REG-5529183' },
    matches: [
      { matchedName: 'Phoenix Finance Ltd', aliases: ['Phoenix FS'], strength: 60, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmOrg('Phoenix Financial Services', 'Phoenix Finance Ltd', 60, { jurisdictionInput: 'United Kingdom', jurisdictionMatch: 'Cyprus', jurisdictionResult: 'mismatch', regNoInput: 'REG-5529183', regNoMatch: '—', regNoResult: 'missing' }),
        identifiers: { country: 'Cyprus' },
        recordData: { keyData: { 'Entity Name': 'Phoenix Finance Ltd', 'Jurisdiction': 'Cyprus', 'Category': 'Other', 'Listed Date': '2022-11-01', 'Last Updated': '2023-05-01' }, furtherInfo: 'Cyprus-registered micro-lending company. Partial name match. Different jurisdiction and business type.', aliases: ['Phoenix FS'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'CySEC', url: '#' }] } },
    ],
  },
  // 19. Logistics company — archived
  {
    name: 'Vanguard Logistics Inc', entityType: 'Organisation', groupId: 'g1', status: 'Archived', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Jane Doe',
    screeningData: { country: 'United States', idType: 'Registration No.', idNumber: 'REG-7783921' },
    matches: [
      { matchedName: 'Vanguard Logistics & Trading', aliases: ['VLT'], strength: 63, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmOrg('Vanguard Logistics Inc', 'Vanguard Logistics & Trading', 63, { jurisdictionInput: 'United States', jurisdictionMatch: 'Panama', jurisdictionResult: 'mismatch', regNoInput: 'REG-7783921', regNoMatch: '—', regNoResult: 'missing' }),
        identifiers: { country: 'Panama' },
        recordData: { keyData: { 'Entity Name': 'Vanguard Logistics & Trading', 'Jurisdiction': 'Panama', 'Category': 'Other', 'Listed Date': '2021-03-15', 'Last Updated': '2022-08-01' }, furtherInfo: 'Panama-registered trading company. Historical record with no current adverse information.', aliases: ['VLT'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 20. Commodities firm — sanctioned, batch
  {
    name: 'Eastern Commodities LLC', entityType: 'Organisation', groupId: 'g4', status: 'Active', mode: 'Batch',
    checkTypes: ['Watchlists'], ogsWorldCheck: true, ogsMediaCheck: false, rating: 'High', assignee: 'Sam Wilson',
    screeningData: { country: 'Iran', idType: 'Registration No.', idNumber: 'REG-334821' },
    matches: [
      { matchedName: 'Eastern Commodities Trading Co', aliases: ['ECT Co', 'Eastern Com. LLC'], strength: 90, dataset: 'Sanctions', status: 'Positive', riskLevel: 'High', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmOrg('Eastern Commodities LLC', 'Eastern Commodities Trading Co', 90, { jurisdictionInput: 'Iran', jurisdictionMatch: 'Iran', jurisdictionResult: 'match', regNoInput: 'REG-334821', regNoMatch: 'REG-334821', regNoResult: 'match', countryInput: 'Iran', countryMatch: 'Iran', countryResult: 'match' }),
        identifiers: { country: 'Iran' },
        recordData: { keyData: { 'Entity Name': 'Eastern Commodities Trading Co', 'Jurisdiction': 'Iran', 'Registration No.': 'REG-334821', 'Category': 'Sanctions', 'Listed Date': '2020-01-08', 'Last Updated': '2024-12-01' }, furtherInfo: 'Designated under OFAC Iran sanctions programme. Alleged involvement in procurement of dual-use goods for Iranian military.', aliases: ['ECT Co', 'Eastern Com. LLC'], keywords: ['Arms Dealing'], pepRoleDetails: undefined, connections: ['Iranian Revolutionary Guard Corps (Shareholder)', 'Hassan Trading FZE (Subsidiary)'], sources: [{ name: 'OFAC SDN List', url: '#' }, { name: 'EU Sanctions List', url: '#' }, { name: 'UN Security Council', url: '#' }] } },
    ],
  },
  // 21. Wealth management — review required
  {
    name: 'Crescent Capital Partners', entityType: 'Organisation', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'Medium', assignee: 'John Smith',
    screeningData: { country: 'Saudi Arabia', idType: 'Registration No.', idNumber: 'REG-991247' },
    matches: [
      { matchedName: 'Crescent Capital Group', aliases: ['CCG', 'Crescent Investments'], strength: 75, dataset: 'Other', status: 'Unresolved', riskLevel: 'Medium', updated: true, reviewRequired: true, reviewRequiredReasons: ['New source added', 'Category reclassified'],
        ...wmOrg('Crescent Capital Partners', 'Crescent Capital Group', 75, { jurisdictionInput: 'Saudi Arabia', jurisdictionMatch: 'Saudi Arabia', jurisdictionResult: 'match', regNoInput: 'REG-991247', regNoMatch: '—', regNoResult: 'missing', countryInput: 'Saudi Arabia', countryMatch: 'Saudi Arabia', countryResult: 'match' }),
        identifiers: { country: 'Saudi Arabia' },
        recordData: { keyData: { 'Entity Name': 'Crescent Capital Group', 'Jurisdiction': 'Saudi Arabia', 'Category': 'Other', 'Listed Date': '2024-03-01', 'Last Updated': '2025-02-08' }, furtherInfo: 'Saudi-registered investment group. Recently flagged in media reports for potential involvement in facilitating investments for designated persons. Under review.', aliases: ['CCG', 'Crescent Investments'], keywords: ['Money Laundering'], pepRoleDetails: undefined, connections: ['Ahmad Al-Rashid (Director)', 'Crescent Real Estate (Subsidiary)'], sources: [{ name: 'CMA Saudi Arabia', url: '#' }, { name: 'World-Check', url: '#' }] } },
    ],
  },

  // ═══ VESSELS ═══
  // 22. Sanctioned oil tanker — high risk
  {
    name: 'MV Oceanic Star', entityType: 'Vessel', groupId: 'g4', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: true, ogsMediaCheck: false, rating: 'High', assignee: 'Alex Turner',
    screeningData: { country: 'Panama', idType: 'IMO Number', idNumber: 'IMO9384751' },
    matches: [
      { matchedName: 'M/V Oceanic Star', aliases: ['Oceanic Star', 'MV Ocean Star'], strength: 96, dataset: 'Sanctions', status: 'Positive', riskLevel: 'High', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmVessel('MV Oceanic Star', 'M/V Oceanic Star', 96, { imoInput: 'IMO9384751', imoMatch: 'IMO9384751', imoResult: 'match', flagInput: 'Panama', flagMatch: 'Panama', flagResult: 'match', countryInput: 'Panama', countryMatch: 'Panama', countryResult: 'match' }),
        identifiers: { country: 'Panama' },
        recordData: { keyData: { 'Vessel Name': 'M/V Oceanic Star', 'IMO Number': 'IMO9384751', 'Flag State': 'Panama', 'Category': 'Sanctions', 'Listed Date': '2023-06-15', 'Last Updated': '2025-01-20' }, furtherInfo: 'Oil tanker designated for involvement in illicit ship-to-ship transfers of Russian-origin crude oil above the G7 price cap. Previously flagged for AIS manipulation and dark voyages.', aliases: ['Oceanic Star', 'MV Ocean Star'], keywords: ['Money Laundering'], pepRoleDetails: undefined, connections: ['Atlas Maritime Services (Operator)', 'Oceanic Shipping Ltd (Owner)', 'Viktor Petrov (Beneficial Owner)'], sources: [{ name: 'OFAC SDN List', url: '#' }, { name: 'EU Sanctions List', url: '#' }] } },
    ],
  },
  // 23. Vessel under investigation — unresolved
  {
    name: 'SS Caspian Wave', entityType: 'Vessel', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'Medium', assignee: 'Maria Lopez',
    screeningData: { country: 'Marshall Islands', idType: 'IMO Number', idNumber: 'IMO9271643' },
    matches: [
      { matchedName: 'Caspian Wave', aliases: ['S/S Caspian Wave', 'Caspian Voyager (ex)'], strength: 87, dataset: 'Law Enforcement', status: 'Unresolved', riskLevel: 'Medium', updated: true, reviewRequired: true, reviewRequiredReasons: ['New source added', 'Profile updated'],
        ...wmVessel('SS Caspian Wave', 'Caspian Wave', 87, { imoInput: 'IMO9271643', imoMatch: 'IMO9271643', imoResult: 'match', flagInput: 'Marshall Islands', flagMatch: 'Cameroon', flagResult: 'mismatch', countryInput: 'Marshall Islands', countryMatch: 'Cameroon', countryResult: 'mismatch' }),
        identifiers: { country: 'Cameroon' },
        recordData: { keyData: { 'Vessel Name': 'Caspian Wave', 'IMO Number': 'IMO9271643', 'Flag State': 'Cameroon', 'Category': 'Law Enforcement', 'Listed Date': '2024-01-20', 'Last Updated': '2025-02-05' }, furtherInfo: 'Bulk carrier re-flagged from Marshall Islands to Cameroon. Under investigation for suspected smuggling of sanctioned goods through Turkish Straits. Previously named Caspian Voyager.', aliases: ['S/S Caspian Wave', 'Caspian Voyager (ex)'], keywords: ['Arms Dealing', 'Drug Trafficking'], pepRoleDetails: undefined, connections: ['Global Maritime Services Ltd (Operator)', 'Caspian Shipping Co (Owner)'], sources: [{ name: 'IMO', url: '#' }, { name: 'Interpol Maritime', url: '#' }] } },
      { matchedName: 'Caspian Breeze', aliases: [], strength: 39, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmVessel('SS Caspian Wave', 'Caspian Breeze', 39, { imoInput: 'IMO9271643', imoMatch: 'IMO8156294', imoResult: 'mismatch', flagInput: 'Marshall Islands', flagMatch: 'Greece', flagResult: 'mismatch' }),
        identifiers: { country: 'Greece' },
        recordData: { keyData: { 'Vessel Name': 'Caspian Breeze', 'IMO Number': 'IMO8156294', 'Flag State': 'Greece', 'Category': 'Other', 'Listed Date': '2022-05-01', 'Last Updated': '2023-01-01' }, furtherInfo: 'Greek-flagged general cargo vessel. Name similarity only. Different IMO number confirms different vessel.', aliases: [], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'Lloyd\'s List', url: '#' }] } },
    ],
  },
  // 24. Clean vessel — all cleared
  {
    name: 'MV Golden Horizon', entityType: 'Vessel', groupId: 'g1', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Jane Doe',
    screeningData: { country: 'Singapore', idType: 'IMO Number', idNumber: 'IMO9518327' },
    matches: [
      { matchedName: 'Golden Horizon', aliases: ['M/V Gold Horizon'], strength: 72, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmVessel('MV Golden Horizon', 'Golden Horizon', 72, { imoInput: 'IMO9518327', imoMatch: 'IMO9412856', imoResult: 'mismatch', flagInput: 'Singapore', flagMatch: 'Liberia', flagResult: 'mismatch' }),
        identifiers: { country: 'Liberia' },
        recordData: { keyData: { 'Vessel Name': 'Golden Horizon', 'IMO Number': 'IMO9412856', 'Flag State': 'Liberia', 'Category': 'Other', 'Listed Date': '2023-03-01', 'Last Updated': '2023-08-15' }, furtherInfo: 'Liberian-flagged container vessel. Historical mention in port state control deficiency report. No sanctions or enforcement connection. Name coincidence.', aliases: ['M/V Gold Horizon'], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'Paris MOU', url: '#' }] } },
    ],
  },
  // 25. Archived vessel
  {
    name: 'SS Red Falcon', entityType: 'Vessel', groupId: 'g1', status: 'Archived', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Sam Wilson',
    screeningData: { country: 'United Kingdom', idType: 'IMO Number', idNumber: 'IMO9647182' },
    matches: [
      { matchedName: 'Red Falcon', aliases: ['S/S Red Falcon'], strength: 85, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmVessel('SS Red Falcon', 'Red Falcon', 85, { imoInput: 'IMO9647182', imoMatch: 'IMO9647182', imoResult: 'match', flagInput: 'United Kingdom', flagMatch: 'United Kingdom', flagResult: 'match' }),
        identifiers: { country: 'United Kingdom' },
        recordData: { keyData: { 'Vessel Name': 'Red Falcon', 'IMO Number': 'IMO9647182', 'Flag State': 'United Kingdom', 'Category': 'Other', 'Listed Date': '2021-01-01', 'Last Updated': '2022-06-01' }, furtherInfo: 'Red Funnel passenger ferry operating in the Solent, UK. Historical database entry. No adverse information. Cleared.', aliases: ['S/S Red Falcon'], keywords: [], pepRoleDetails: undefined, connections: ['Red Funnel Ltd (Operator)'], sources: [{ name: 'Maritime UK', url: '#' }] } },
    ],
  },
  // 26. North Korean vessel — sanctions
  {
    name: 'MV Blue Mariner', entityType: 'Vessel', groupId: 'g4', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists'], ogsWorldCheck: true, ogsMediaCheck: false, rating: 'High', assignee: 'John Smith',
    screeningData: { country: 'Tanzania', idType: 'IMO Number', idNumber: 'IMO8712453' },
    matches: [
      { matchedName: 'Blue Mariner', aliases: ['MV Blue Marine', 'Chong Jin Star (ex)'], strength: 92, dataset: 'Sanctions', status: 'Positive', riskLevel: 'High', updated: true, reviewRequired: true, reviewRequiredReasons: ['Sanctions list updated', 'New alias added', 'Profile updated'],
        ...wmVessel('MV Blue Mariner', 'Blue Mariner', 92, { imoInput: 'IMO8712453', imoMatch: 'IMO8712453', imoResult: 'match', flagInput: 'Tanzania', flagMatch: 'Tanzania', flagResult: 'match', countryInput: 'Tanzania', countryMatch: 'North Korea', countryResult: 'mismatch' }),
        identifiers: { country: 'North Korea' },
        recordData: { keyData: { 'Vessel Name': 'Blue Mariner', 'IMO Number': 'IMO8712453', 'Flag State': 'Tanzania', 'Category': 'Sanctions', 'Listed Date': '2019-09-01', 'Last Updated': '2025-02-18' }, furtherInfo: 'Previously named Chong Jin Star. Designated under UN Security Council Resolution 2397 for involvement in prohibited coal exports from North Korea. Flag of convenience vessel with obscured ownership.', aliases: ['MV Blue Marine', 'Chong Jin Star (ex)'], keywords: ['Arms Dealing', 'Money Laundering'], pepRoleDetails: undefined, connections: ['Korea Kumryong Trading (Owner)', 'Blue Ocean Shipping Co (Operator)', 'Dalian Maritime Services (Charterer)'], sources: [{ name: 'UN Security Council', url: '#' }, { name: 'OFAC SDN List', url: '#' }, { name: 'IMO', url: '#' }] } },
    ],
  },
  // 27. Batch-screened vessel
  {
    name: 'MV Arctic Explorer', entityType: 'Vessel', groupId: 'g1', status: 'Active', mode: 'Batch',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'Low', assignee: 'Maria Lopez',
    screeningData: { country: 'Norway', idType: 'IMO Number', idNumber: 'IMO9583291' },
    matches: [
      { matchedName: 'Arctic Explorer II', aliases: ['M/V Arctic Explorer'], strength: 69, dataset: 'Other', status: 'Unknown', riskLevel: 'Low', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmVessel('MV Arctic Explorer', 'Arctic Explorer II', 69, { imoInput: 'IMO9583291', imoMatch: 'IMO9583294', imoResult: 'partial', flagInput: 'Norway', flagMatch: 'Russia', flagResult: 'mismatch' }),
        identifiers: { country: 'Russia' },
        recordData: { keyData: { 'Vessel Name': 'Arctic Explorer II', 'IMO Number': 'IMO9583294', 'Flag State': 'Russia', 'Category': 'Other', 'Listed Date': '2024-07-01', 'Last Updated': '2024-12-01' }, furtherInfo: 'Russian-flagged icebreaking cargo vessel operating in Northern Sea Route. Partial name match. IMO numbers differ by one digit — requires verification.', aliases: ['M/V Arctic Explorer'], keywords: [], pepRoleDetails: undefined, connections: ['Sovcomflot (Operator)'], sources: [{ name: 'Lloyd\'s List', url: '#' }] } },
    ],
  },

  // ═══ ADDITIONAL INDIVIDUALS (various states) ═══
  // 28. German national — multiple review items
  {
    name: 'Thomas Mueller', entityType: 'Individual', groupId: 'g2', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'Medium', assignee: 'Jane Doe',
    screeningData: { dob: '1960-05-18', gender: 'Male', nationality: 'DE', country: 'Germany', idType: 'Passport', idNumber: 'C5T8R2K19' },
    matches: [
      { matchedName: 'Thomas Müller', aliases: ['T. Mueller', 'Thomas Mueller'], strength: 84, dataset: 'PEP', status: 'Possible', riskLevel: 'Medium', updated: true, reviewRequired: true, reviewRequiredReasons: ['Profile updated'],
        ...wmIndividual('Thomas Mueller', 'Thomas Müller', 84, { dobInput: '1960-05-18', dobMatch: '1960-05-18', dobResult: 'match', natInput: 'DE', natMatch: 'DE', natResult: 'match', countryInput: 'Germany', countryMatch: 'Germany', countryResult: 'match' }),
        identifiers: { dob: '1960-05-18', gender: 'Male', nationality: 'DE', country: 'Germany' },
        recordData: { keyData: { 'Full Name': 'Thomas Müller', 'Date of Birth': '1960-05-18', 'Nationality': 'DE', 'Category': 'PEP', 'Listed Date': '2016-09-01', 'Last Updated': '2025-02-01' }, furtherInfo: 'Former Staatssekretär in Federal Ministry of Finance. Extremely common German name. All identifiers match — likely same individual. Known for involvement in Wirecard oversight failures.', aliases: ['T. Mueller', 'Thomas Mueller'], keywords: ['Corruption'], pepRoleDetails: 'Former Staatssekretär, Federal Ministry of Finance, Germany', connections: ['Deutsche Bank AG (Business Partner)'], sources: [{ name: 'BaFin Germany', url: '#' }, { name: 'World-Check', url: '#' }] } },
      { matchedName: 'Thomas Müller', aliases: [], strength: 84, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Thomas Mueller', 'Thomas Müller', 84, { dobInput: '1960-05-18', dobMatch: '1989-09-13', dobResult: 'mismatch', natInput: 'DE', natMatch: 'DE', natResult: 'match', countryInput: 'Germany', countryMatch: 'Germany', countryResult: 'match' }),
        identifiers: { dob: '1989-09-13', gender: 'Male', nationality: 'DE', country: 'Germany' },
        recordData: { keyData: { 'Full Name': 'Thomas Müller', 'Date of Birth': '1989-09-13', 'Nationality': 'DE', 'Category': 'Other', 'Listed Date': '2023-01-01', 'Last Updated': '2023-01-01' }, furtherInfo: 'Professional footballer. Common name match. DOB clearly identifies different individual.', aliases: [], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 29. Italian woman — batch, clean
  {
    name: 'Sofia Rossi', entityType: 'Individual', groupId: 'g1', status: 'Active', mode: 'Batch',
    checkTypes: ['Watchlists'], ogsWorldCheck: false, ogsMediaCheck: false, rating: 'None', assignee: 'Alex Turner',
    screeningData: { dob: '1995-02-14', gender: 'Female', nationality: 'IT', country: 'Italy' },
    matches: [
      { matchedName: 'Sofia Maria Rossi', aliases: ['S. Rossi'], strength: 62, dataset: 'PEP', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Sofia Rossi', 'Sofia Maria Rossi', 62, { dobInput: '1995-02-14', dobMatch: '1968-10-05', dobResult: 'mismatch', natInput: 'IT', natMatch: 'IT', natResult: 'match', countryInput: 'Italy', countryMatch: 'Italy', countryResult: 'match' }),
        identifiers: { dob: '1968-10-05', gender: 'Female', nationality: 'IT', country: 'Italy' },
        recordData: { keyData: { 'Full Name': 'Sofia Maria Rossi', 'Date of Birth': '1968-10-05', 'Nationality': 'IT', 'Category': 'PEP', 'Listed Date': '2019-02-01', 'Last Updated': '2024-06-01' }, furtherInfo: 'Common Italian name. PEP record refers to former regional councillor in Lombardy. 27-year DOB gap confirms different individual.', aliases: ['S. Rossi'], keywords: [], pepRoleDetails: 'Former Regional Councillor, Lombardy, Italy', connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
  // 30. Korean-Iranian connection — complex
  {
    name: 'Nikolai Sokolov', entityType: 'Individual', groupId: 'g4', status: 'Active', mode: 'Single',
    checkTypes: ['Watchlists', 'Adverse Media'], ogsWorldCheck: true, ogsMediaCheck: true, rating: 'High', assignee: 'Sam Wilson',
    screeningData: { dob: '1963-07-04', gender: 'Male', nationality: 'RU', country: 'Russia', idType: 'Passport', idNumber: 'P716284953' },
    matches: [
      { matchedName: 'Nikolai Sergeevich Sokolov', aliases: ['N. Sokolov', 'Николай Соколов'], strength: 88, dataset: 'Sanctions', status: 'Unresolved', riskLevel: 'High', updated: true, reviewRequired: true, reviewRequiredReasons: ['Sanctions list updated', 'New source added'],
        ...wmIndividual('Nikolai Sokolov', 'Nikolai Sergeevich Sokolov', 88, { dobInput: '1963-07-04', dobMatch: '1963-07-04', dobResult: 'match', natInput: 'RU', natMatch: 'RU', natResult: 'match', countryInput: 'Russia', countryMatch: 'Russia', countryResult: 'match', idInput: 'P716284953', idMatch: 'P716284953', idResult: 'match' }),
        identifiers: { dob: '1963-07-04', gender: 'Male', nationality: 'RU', country: 'Russia', idNumber: 'P716284953' },
        recordData: { keyData: { 'Full Name': 'Nikolai Sergeevich Sokolov', 'Date of Birth': '1963-07-04', 'Nationality': 'RU', 'Category': 'Sanctions', 'Listed Date': '2022-06-01', 'Last Updated': '2025-02-15' }, furtherInfo: 'Former SVR officer. Designated under EU and UK Russia sanctions for involvement in intelligence operations. Connected to entities facilitating technology transfers to Iran. All key identifiers match screening subject.', aliases: ['N. Sokolov', 'Николай Соколов'], keywords: ['Arms Dealing', 'Cybercrime'], pepRoleDetails: undefined, connections: ['Atlas Energy OOO (Director)', 'Russian Ministry of Defence (Associate)', 'Tehran Technical Institute (Business Partner)'], sources: [{ name: 'EU Sanctions List', url: '#' }, { name: 'UK Sanctions List', url: '#' }, { name: 'OFAC SDN List', url: '#' }] } },
      { matchedName: 'N. Sokolov', aliases: [], strength: 35, dataset: 'Other', status: 'False', riskLevel: 'None', updated: false, reviewRequired: false, reviewRequiredReasons: [],
        ...wmIndividual('Nikolai Sokolov', 'N. Sokolov', 35, { dobInput: '1963-07-04', dobMatch: '1994-01-22', dobResult: 'mismatch', natInput: 'RU', natMatch: 'KZ', natResult: 'mismatch' }),
        identifiers: { dob: '1994-01-22', gender: 'Male', nationality: 'KZ', country: 'Kazakhstan' },
        recordData: { keyData: { 'Full Name': 'Nurlan Sokolov', 'Date of Birth': '1994-01-22', 'Nationality': 'KZ', 'Category': 'Other', 'Listed Date': '2024-08-01', 'Last Updated': '2024-08-01' }, furtherInfo: 'Kazakh national. Abbreviated name match only. Different individual.', aliases: [], keywords: [], pepRoleDetails: undefined, connections: [], sources: [{ name: 'World-Check', url: '#' }] } },
    ],
  },
];

// ─── Build Cases + Matches ───────────────────────────────────

export const allMatches: Match[] = [];

export const cases: Case[] = caseDefs.map((def, i) => {
  const caseId = `WL-${String(2024001 + i)}`;
  const createdAt = randDate('2024-01-01', '2025-01-15');
  const lastScreenedAt = randDate('2025-01-01', '2025-02-20');

  // Build matches for this case
  const matches: Match[] = def.matches.map((mDef, mi) => {
    const alertDate = randDate('2024-12-01', '2025-02-15');
    const changeLog = generateChangeLog(mDef.reviewRequired);
    const reviewRequiredAt = mDef.reviewRequired ? randDate('2025-01-10', '2025-02-15') : undefined;
    const resolutionHistory = mDef.status !== 'Unresolved'
      ? generateResolutionHistory(mDef.status, mDef.riskLevel)
      : (Math.random() > 0.5 ? generateResolutionHistory(rand(['Positive', 'Possible', 'False', 'Unknown'] as MatchStatus[]), rand(['High', 'Medium', 'Low', 'None'] as RiskLevel[])) : []);

    // ── Maker-Checker seeding ──────────────────────────────────
    // Roughly 30% of resolved matches have a pending checker review
    const isResolved = mDef.status !== 'Unresolved';
    const pendingCheckerReview = isResolved && Math.random() < 0.3;
    const makerTypes: MakerType[] = ['Human', 'Human', 'Human', 'Agentic']; // 25% agentic
    const makerDecision: MakerDecision | undefined = pendingCheckerReview ? {
      author: rand(analysts),
      makerType: rand(makerTypes),
      status: mDef.status,
      riskLevel: mDef.riskLevel,
      reason: rand(resolutionReasons),
      comment: Math.random() > 0.5 ? rand(noteTexts) : undefined,
      createdAt: randDate('2025-01-15', '2025-02-20'),
    } : undefined;

    const partial: Omit<Match, 'priorityScore' | 'priorityLevel'> = {
      id: `${caseId}-m${mi + 1}`,
      caseId,
      matchedName: mDef.matchedName,
      aliases: mDef.aliases,
      strength: mDef.strength,
      dataset: mDef.dataset,
      checkType: 'Watchlists',
      status: mDef.status,
      riskLevel: mDef.riskLevel,
      reason: mDef.status !== 'Unresolved' ? `Resolved as ${mDef.status.toLowerCase()} match` : '',
      updated: mDef.updated,
      reviewRequired: mDef.reviewRequired,
      reviewRequiredAt,
      reviewRequiredReasons: mDef.reviewRequiredReasons,
      changeLog,
      alertDate,
      whyMatched: mDef.whyMatched,
      matchStrengthExplanation: mDef.matchStrengthExplanation,
      identifiers: mDef.identifiers,
      recordData: mDef.recordData,
      resolutionHistory,
      pendingCheckerReview,
      makerDecision,
      checkerReview: undefined,
    };
    const score = computePriorityScore(partial);
    return { ...partial, priorityScore: score, priorityLevel: priorityLevel(score) } as Match;
  });

  allMatches.push(...matches);

  const unresolvedCount = matches.filter(m => m.status === 'Unresolved').length;
  const reviewRequiredCount = matches.filter(m => m.reviewRequired).length;
  const hasMandatory = reviewRequiredCount > 0 || unresolvedCount > 2;

  return {
    id: caseId,
    name: def.name,
    entityType: def.entityType,
    groupId: def.groupId,
    mode: def.mode,
    checkTypes: def.checkTypes,
    ogsWorldCheck: def.ogsWorldCheck,
    ogsMediaCheck: def.ogsMediaCheck,
    createdAt,
    lastScreenedAt,
    rating: def.rating,
    mandatoryAction: hasMandatory,
    unresolvedCount,
    reviewRequiredCount,
    positiveCount: matches.filter(m => m.status === 'Positive').length,
    possibleCount: matches.filter(m => m.status === 'Possible').length,
    falseCount: matches.filter(m => m.status === 'False').length,
    unknownCount: matches.filter(m => m.status === 'Unknown').length,
    assignee: def.assignee,
    status: def.status,
    screeningData: def.screeningData,
    notes: generateNotes(caseId),
    auditTrail: generateAuditTrail(caseId, randDate('2024-01-01', '2024-06-01')),
  };
});

// ─── Accessors ───────────────────────────────────────────────

export function getMatchesForCase(caseId: string): Match[] {
  return allMatches.filter(m => m.caseId === caseId);
}

export function getCaseById(caseId: string): Case | undefined {
  return cases.find(c => c.id === caseId);
}

export function getGroupById(groupId: string): Group | undefined {
  return groups.find(g => g.id === groupId);
}

// ─── Mutation helpers ────────────────────────────────────────

export function updateCase(caseId: string, patch: Partial<Case>): Case | undefined {
  const idx = cases.findIndex(c => c.id === caseId);
  if (idx === -1) return undefined;
  Object.assign(cases[idx], patch);
  return cases[idx];
}

export function updateMatch(matchId: string, patch: Partial<Match>): Match | undefined {
  const idx = allMatches.findIndex(m => m.id === matchId);
  if (idx === -1) return undefined;
  Object.assign(allMatches[idx], patch);
  return allMatches[idx];
}

/** Recalculate case aggregate counts from its current matches */
export function recalcCaseCounts(caseId: string): void {
  const c = cases.find(c => c.id === caseId);
  if (!c) return;
  const m = allMatches.filter(m => m.caseId === caseId);
  c.unresolvedCount = m.filter(x => x.status === 'Unresolved').length;
  c.reviewRequiredCount = m.filter(x => x.reviewRequired).length;
  c.positiveCount = m.filter(x => x.status === 'Positive').length;
  c.possibleCount = m.filter(x => x.status === 'Possible').length;
  c.falseCount = m.filter(x => x.status === 'False').length;
  c.unknownCount = m.filter(x => x.status === 'Unknown').length;
  c.mandatoryAction = c.reviewRequiredCount > 0 || c.unresolvedCount > 2;
}
