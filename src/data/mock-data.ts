import type { Group, Case, Match, Dataset, MatchStatus, RiskLevel, CheckType, EntityType, ChangeLogEntry, WhyMatchedField, MatchFieldResult, CaseNote, CaseAuditEvent, AuditEventType, AuditMatchDetail, AuditEventDetails, ResolutionHistoryEntry } from '@/types';
import { computePriorityScore, priorityLevel } from '@/lib/priority';

export const groups: Group[] = [
  { id: 'g1', name: 'Default Screening Group', ongoingFrequency: 'Daily' },
  { id: 'g2', name: 'Enhanced Due Diligence', ongoingFrequency: 'Weekly' },
  { id: 'g3', name: 'PEP Monitoring', ongoingFrequency: 'Monthly' },
  { id: 'g4', name: 'Sanctions Only', ongoingFrequency: 'Daily' },
];

const names = [
  'Ahmad Al-Rashid', 'Elena Volkov', 'Carlos Mendoza', 'Yuki Tanaka', 'James Morrison',
  'Fatima Hassan', 'Viktor Petrov', 'Sarah Chen', 'Mohammed Al-Fayed', 'Anna Kowalski',
  'Roberto Silva', 'Li Wei', 'Olga Ivanova', 'David Okonkwo', 'Maria Garcia',
  'Sergei Kuznetsov', 'Aisha Patel', 'Thomas Mueller', 'Priya Sharma', 'Jean-Pierre Dubois',
  'Nikolai Sokolov', 'Amira Khalil', 'Hans Gruber', 'Mei Lin', 'Patrick O\'Brien',
  'Yusuf Demir', 'Catherine Moreau', 'Raj Kapoor', 'Sofia Rossi', 'Abdul Rahman',
];

const orgNames = ['Global Trade Corp', 'Oceanic Shipping Ltd', 'Meridian Holdings', 'Atlas Energy Group', 'Phoenix Financial Services', 'Crescent Capital Partners', 'Vanguard Logistics Inc', 'Eastern Commodities LLC', 'Apex Industrial Group', 'Sovereign Wealth Management'];
const vesselNames = ['MV Oceanic Star', 'SS Northern Light', 'MV Pacific Dawn', 'SS Caspian Wave', 'MV Arctic Explorer', 'MV Golden Horizon', 'SS Red Falcon', 'MV Blue Mariner', 'SS Iron Eagle', 'MV Coral Reef'];

const datasets: Dataset[] = ['Sanctions', 'PEP', 'Law Enforcement', 'Other'];
const statuses: MatchStatus[] = ['Positive', 'Possible', 'False', 'Unknown', 'Unresolved'];
const riskLevels: RiskLevel[] = ['High', 'Medium', 'Low', 'None'];
const checkTypes: CheckType[] = ['Watchlists', 'Adverse Media', 'Passport Check'];
const entityTypes: EntityType[] = ['Individual', 'Organisation', 'Vessel', 'Unspecified'];
const nationalities = ['US', 'UK', 'RU', 'CN', 'DE', 'FR', 'SA', 'AE', 'JP', 'BR', 'IN', 'TR', 'IR', 'SY', 'KP'];
const countries = ['United States', 'United Kingdom', 'Russia', 'China', 'Germany', 'France', 'Saudi Arabia', 'UAE', 'Japan', 'Brazil'];
const reviewReasons = ['Profile updated', 'New alias added', 'Status change', 'New source added', 'Category reclassified', 'Sanctions list updated'];
const keywords = ['Terrorism', 'Money Laundering', 'Fraud', 'Corruption', 'Drug Trafficking', 'Arms Dealing', 'Tax Evasion', 'Cybercrime'];
const changeFields = ['Category', 'Nationality', 'Secondary ID', 'Alias', 'PEP Status', 'Sanctions List'];
const analysts = ['John Smith', 'Jane Doe', 'Alex Turner', 'Maria Lopez', 'Sam Wilson', 'Unassigned'];
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

function generateNotes(caseId: string): CaseNote[] {
  const count = randInt(0, 4);
  return Array.from({ length: count }, (_, i) => ({
    id: `${caseId}-note-${i}`,
    author: rand(analysts.filter(a => a !== 'Unassigned')),
    text: rand(noteTexts),
    createdAt: randDate('2024-06-01', '2025-02-15'),
  }));
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
  const matchCount = randInt(2, 6);
  const actions: AuditMatchDetail['action'][] = ['new', 'updated', 'auto_remediated', 'no_change'];
  const matchDetails: AuditMatchDetail[] = Array.from({ length: matchCount }, (_, i) => ({
    matchId: `WL-M${i + 1}`,
    matchedName: rand(names),
    strength: randInt(30, 99),
    status: rand(statuses),
    action: rand(actions),
    dataset: rand(datasets as unknown as string[]),
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
  const events: CaseAuditEvent[] = [
    { id: `${caseId}-audit-0`, type: 'created', author: 'System', text: 'Case created and initial screening completed', details: generateScreeningDetails(), createdAt },
  ];
  const count = randInt(15, 60);
  for (let i = 1; i <= count; i++) {
    const tmpl = rand(auditEventTemplates.filter(t => t.type !== 'created'));
    const author = tmpl.type === 'rescreen' ? 'System' : rand(analysts.filter(a => a !== 'Unassigned'));
    let text = tmpl.text.replace('{analyst}', rand(analysts.filter(a => a !== 'Unassigned'))).replace('{analyst2}', rand(analysts.filter(a => a !== 'Unassigned')));
    const hasComment = Math.random() > 0.6;
    let details: AuditEventDetails | undefined;
    if (tmpl.type === 'rescreen') details = generateScreeningDetails();
    else if (tmpl.type === 'edit') details = generateEditDetails();
    else if (tmpl.type === 'status_change') details = { fieldChanged: 'Status', previousValue: rand(statuses), newValue: rand(statuses) };
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

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(start: string, end: string) {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().split('T')[0];
}

function generateWhyMatched(strength: number, caseName?: string, entityType: EntityType = 'Individual'): { fields: WhyMatchedField[]; explanation: string } {
  const results: MatchFieldResult[] = ['match', 'partial', 'mismatch', 'missing'];
  const nameResult: MatchFieldResult = strength >= 80 ? 'match' : strength >= 60 ? 'partial' : 'mismatch';
  const nameLabel = entityType === 'Organisation' ? 'Entity Name' : entityType === 'Vessel' ? 'Vessel Name' : 'Name';
  const nameDetail = nameResult === 'match' ? 'Exact name match' : nameResult === 'partial' ? 'Close name variant (alias)' : 'Weak name similarity';
  const namePool = entityType === 'Organisation' ? orgNames : entityType === 'Vessel' ? vesselNames : names;
  const matchedNameVariant = nameResult === 'match' ? (caseName || 'Unknown') : nameResult === 'partial' ? (caseName ? caseName.split(' ').reverse().join(' ') : 'Unknown') : rand(namePool);
  
  const fields: WhyMatchedField[] = [
    { field: nameLabel, result: nameResult, detail: nameDetail, inputValue: caseName || 'Unknown', matchedValue: matchedNameVariant },
  ];

  if (entityType === 'Individual') {
    const inputDobs = ['1975-06-15', '1982-03-22', '1990-11-08', '1968-09-30', '1985-01-14'];
    const matchedDobs = ['1975-06-15', '1975-??-??', '1982-03-22', '1990-11-08', '1969-09-30'];
    const dobResult = rand(results);
    const inputDob = rand(inputDobs);
    const matchedDob = dobResult === 'match' ? inputDob : dobResult === 'partial' ? inputDob.slice(0, 4) + '-??-??' : dobResult === 'mismatch' ? rand(matchedDobs) : undefined;
    fields.push({ field: 'DOB', result: dobResult, detail: dobResult === 'match' ? 'Exact DOB match' : dobResult === 'partial' ? 'Year of birth matches' : dobResult === 'mismatch' ? 'DOB does not match' : 'DOB not available', inputValue: inputDob, matchedValue: matchedDob || '—' });

    const inputNats = ['US', 'UK', 'RU', 'CN', 'DE', 'FR'];
    const matchedNats = ['US', 'UK', 'RU', 'CN', 'DE', 'IR', 'SY'];
    const natResult = rand(results);
    const inputNat = rand(inputNats);
    const matchedNat = natResult === 'match' ? inputNat : natResult === 'partial' ? inputNat : natResult === 'mismatch' ? rand(matchedNats.filter(n => n !== inputNat)) : undefined;
    fields.push({ field: 'Nationality', result: natResult, detail: natResult === 'match' ? 'Nationality matches' : natResult === 'partial' ? 'Region matches' : natResult === 'mismatch' ? 'Different nationality' : 'Nationality not provided', inputValue: inputNat, matchedValue: matchedNat || '—' });
  }

  if (entityType === 'Organisation') {
    const regResult = rand(results);
    fields.push({ field: 'Jurisdiction', result: regResult, detail: regResult === 'match' ? 'Jurisdiction matches' : regResult === 'partial' ? 'Region overlap' : regResult === 'mismatch' ? 'Different jurisdiction' : 'Jurisdiction not available', inputValue: rand(countries), matchedValue: regResult !== 'missing' ? rand(countries) : '—' });
    if (Math.random() > 0.4) {
      const regNoResult = rand(['match', 'missing'] as MatchFieldResult[]);
      const regNo = `REG-${randInt(100000, 999999)}`;
      fields.push({ field: 'Registration No.', result: regNoResult, detail: regNoResult === 'match' ? 'Registration number matches' : 'Registration number not available', inputValue: regNo, matchedValue: regNoResult === 'match' ? regNo : '—' });
    }
  }

  if (entityType === 'Vessel') {
    const imoResult = rand(results);
    const imo = `IMO${randInt(1000000, 9999999)}`;
    fields.push({ field: 'IMO Number', result: imoResult, detail: imoResult === 'match' ? 'IMO number matches' : imoResult === 'partial' ? 'Partial IMO match' : imoResult === 'mismatch' ? 'Different IMO number' : 'IMO not available', inputValue: imo, matchedValue: imoResult !== 'missing' ? (imoResult === 'match' ? imo : `IMO${randInt(1000000, 9999999)}`) : '—' });
    const flagResult = rand(results);
    fields.push({ field: 'Flag State', result: flagResult, detail: flagResult === 'match' ? 'Flag state matches' : flagResult === 'partial' ? 'Region overlap' : flagResult === 'mismatch' ? 'Different flag state' : 'Flag state not available', inputValue: rand(countries), matchedValue: flagResult !== 'missing' ? rand(countries) : '—' });
  }

  const inputCountries = ['United States', 'United Kingdom', 'Russia', 'China', 'Germany'];
  const matchedCountries = ['United States', 'United Kingdom', 'Russia', 'Iran', 'Syria', 'China'];
  const countryResult = rand(results);
  const inputCountry = rand(inputCountries);
  const matchedCountry = countryResult === 'match' ? inputCountry : countryResult === 'partial' ? inputCountry : countryResult === 'mismatch' ? rand(matchedCountries.filter(c => c !== inputCountry)) : undefined;
  fields.push({ field: 'Country', result: countryResult, detail: countryResult === 'match' ? 'Country/location matches' : countryResult === 'partial' ? 'Region overlap' : countryResult === 'mismatch' ? 'Different country' : 'Country not available', inputValue: inputCountry, matchedValue: matchedCountry || '—' });

  if (entityType === 'Individual' && Math.random() > 0.5) {
    const idResult = rand(['match', 'missing'] as MatchFieldResult[]);
    const inputId = `P${Math.floor(Math.random() * 900000000 + 100000000)}`;
    fields.push({ field: 'ID Number', result: idResult, detail: idResult === 'match' ? 'ID number matches' : 'ID not available for comparison', inputValue: inputId, matchedValue: idResult === 'match' ? inputId : '—' });
  }

  const matchingFields = fields.filter(f => f.result === 'match').map(f => f.field);
  const explanation = matchingFields.length >= 2
    ? `Strong due to ${matchingFields.join(' + ').toLowerCase()} match`
    : matchingFields.length === 1
    ? `Moderate - ${matchingFields[0].toLowerCase()} matches but other fields unconfirmed`
    : `Weak match - primarily based on name similarity`;

  return { fields, explanation };
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
  const count = randInt(1, 4);
  const entries: ResolutionHistoryEntry[] = [];
  for (let i = 0; i < count; i++) {
    const isLatest = i === 0;
    entries.push({
      id: `rh-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      status: isLatest ? currentStatus : rand(statuses.filter(s => s !== 'Unresolved')),
      riskLevel: isLatest ? currentRisk : rand(riskLevels),
      reason: rand(resolutionReasons),
      comment: Math.random() > 0.4 ? rand(noteTexts) : undefined,
      author: rand(analysts.filter(a => a !== 'Unassigned')),
      createdAt: randDate(isLatest ? '2025-01-15' : '2024-06-01', isLatest ? '2025-02-15' : '2025-01-14'),
    });
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Watchlists matches only — Adverse Media and Passport Check have their own result models
function generateMatches(caseId: string, count: number, entityType: EntityType = 'Individual'): Match[] {
  const namePool = entityType === 'Organisation' ? orgNames : entityType === 'Vessel' ? vesselNames : names;
  return Array.from({ length: count }, (_, i) => {
    const status: MatchStatus = rand(statuses);
    const isUpdated = status !== 'Unresolved' && Math.random() > 0.7;
    const isReviewReq = isUpdated && Math.random() > 0.4;
    const dataset = rand(datasets);
    const ct: CheckType = 'Watchlists';
    const matchName = rand(namePool);
    const strength = randInt(30, 99);
    const alertDate = randDate('2024-12-01', '2025-02-15');
    const reviewRequiredAt = isReviewReq ? randDate('2025-01-10', '2025-02-15') : undefined;
    const { fields: whyMatched, explanation: matchStrengthExplanation } = generateWhyMatched(strength, matchName, entityType);
    const changeLog = generateChangeLog(isReviewReq);

    const partial: Omit<Match, 'priorityScore' | 'priorityLevel'> = {
      id: `${caseId}-m${i + 1}`,
      caseId,
      matchedName: matchName,
      aliases: entityType === 'Organisation'
        ? [`${matchName} Inc`, `${matchName.split(' ')[0]} Group`, `${matchName} International`].slice(0, randInt(1, 3))
        : entityType === 'Vessel'
        ? [`${matchName} (ex)`, `${matchName.replace('MV ', 'M/V ').replace('SS ', 'S/S ')}`].slice(0, randInt(1, 2))
        : [matchName.split(' ').reverse().join(' '), `${matchName} Jr.`, `${matchName.split(' ')[0]} Al-${matchName.split(' ').pop()}`, `${matchName.split(' ')[0][0]}. ${matchName.split(' ').slice(1).join(' ')}`].slice(0, randInt(1, 4)),
      strength,
      dataset,
      checkType: ct,
      status,
      riskLevel: status === 'Positive' ? 'High' : status === 'Possible' ? 'Medium' : rand(riskLevels),
      reason: status !== 'Unresolved' ? `Resolved as ${status.toLowerCase()} match` : '',
      updated: isUpdated,
      reviewRequired: isReviewReq,
      reviewRequiredAt,
      reviewRequiredReasons: isReviewReq ? Array.from({ length: randInt(1, 3) }, () => rand(reviewReasons)) : [],
      changeLog,
      alertDate,
      whyMatched,
      matchStrengthExplanation,
      identifiers: {
        dob: entityType === 'Individual' && Math.random() > 0.3 ? randDate('1950-01-01', '2000-12-31') : undefined,
        gender: entityType === 'Individual' && Math.random() > 0.3 ? rand(['Male', 'Female']) : undefined,
        nationality: entityType !== 'Vessel' && Math.random() > 0.2 ? rand(nationalities) : undefined,
        country: Math.random() > 0.3 ? rand(countries) : undefined,
      },
      recordData: {
        keyData: entityType === 'Organisation' ? {
          'Entity Name': matchName,
          'Jurisdiction': rand(countries),
          'Registration No.': `REG-${randInt(100000, 999999)}`,
          'Category': dataset,
          'Listed Date': randDate('2010-01-01', '2024-12-31'),
          'Last Updated': randDate('2024-01-01', '2025-02-01'),
        } : entityType === 'Vessel' ? {
          'Vessel Name': matchName,
          'IMO Number': `IMO${randInt(1000000, 9999999)}`,
          'Flag State': rand(countries),
          'Category': dataset,
          'Listed Date': randDate('2010-01-01', '2024-12-31'),
          'Last Updated': randDate('2024-01-01', '2025-02-01'),
        } : {
          'Full Name': matchName,
          'Date of Birth': randDate('1950-01-01', '2000-12-31'),
          'Nationality': rand(nationalities),
          'Category': dataset,
          'Listed Date': randDate('2010-01-01', '2024-12-31'),
          'Last Updated': randDate('2024-01-01', '2025-02-01'),
        },
        furtherInfo: entityType === 'Organisation'
          ? `Entity is associated with ${rand(keywords).toLowerCase()} activities. Listed on multiple international watchlists. Further investigation recommended.`
          : entityType === 'Vessel'
          ? `Vessel is linked to ${rand(keywords).toLowerCase()} activities. Flagged across multiple maritime enforcement databases.`
          : `Subject is associated with ${rand(keywords).toLowerCase()} activities. Listed on multiple international watchlists. Further investigation recommended.`,
        aliases: entityType === 'Organisation'
          ? [`${matchName} Inc`, `${matchName.split(' ')[0]} Group`]
          : entityType === 'Vessel'
          ? [`${matchName} (ex)`, matchName.replace('MV ', 'M/V ')]
          : [matchName.split(' ').reverse().join(' '), `${matchName.split(' ')[0]} ${rand(nationalities)}`],
        keywords: Array.from({ length: randInt(1, 4) }, () => rand(keywords)),
        pepRoleDetails: dataset === 'PEP' && entityType === 'Individual' ? `Former ${rand(['Minister', 'Governor', 'Senator', 'Director', 'Ambassador'])} of ${rand(countries)}` : undefined,
        connections: entityType === 'Organisation'
          ? Array.from({ length: randInt(0, 3) }, () => `${rand([...orgNames, ...names])} (${rand(['Subsidiary', 'Parent Company', 'Director', 'Shareholder'])})`)
          : entityType === 'Vessel'
          ? Array.from({ length: randInt(0, 3) }, () => `${rand([...orgNames, ...names])} (${rand(['Operator', 'Owner', 'Flag State Agent', 'Charterer'])})`)
          : Array.from({ length: randInt(0, 3) }, () => `${rand(names)} (${rand(['Associate', 'Family', 'Business Partner'])})`),
        sources: [
          { name: 'OFAC SDN List', url: '#' },
          { name: 'UN Security Council', url: '#' },
          { name: 'EU Sanctions List', url: '#' },
        ].slice(0, randInt(1, 3)),
      },
      resolutionHistory: status !== 'Unresolved' ? generateResolutionHistory(status, rand(riskLevels)) : (Math.random() > 0.5 ? generateResolutionHistory(rand(statuses.filter(s => s !== 'Unresolved')), rand(riskLevels)) : []),
    };

    const score = computePriorityScore(partial);
    return { ...partial, priorityScore: score, priorityLevel: priorityLevel(score) } as Match;
  });
}

export const allMatches: Match[] = [];
export const cases: Case[] = Array.from({ length: 30 }, (_, i) => {
  const caseId = `WL-${String(2024001 + i)}`;
  const entityType = i < 20 ? 'Individual' : i < 25 ? 'Organisation' : i < 28 ? 'Vessel' : rand(entityTypes);
  const caseName = entityType === 'Organisation' ? rand(orgNames) : entityType === 'Vessel' ? rand(vesselNames) : rand(names);
  const matchCount = randInt(2, 8);
  const matches = generateMatches(caseId, matchCount, entityType);
  allMatches.push(...matches);

  const unresolvedCount = matches.filter(m => m.status === 'Unresolved').length;
  const reviewRequiredCount = matches.filter(m => m.reviewRequired).length;
  const hasMandatory = reviewRequiredCount > 0 || unresolvedCount > 2;

  const idTypes = ['Passport', 'National ID', 'Driver License', 'Tax ID'];
  const assignee = rand(analysts);

  return {
    id: caseId,
    name: caseName,
    entityType,
    groupId: rand(groups).id,
    mode: 'Single' as const,
    checkTypes: [
      'Watchlists' as const,
      ...(Math.random() > 0.5 ? ['Adverse Media' as const] : []),
      ...(entityType === 'Individual' && Math.random() > 0.6 ? ['Passport Check' as const] : []),
    ],
    ogsWorldCheck: Math.random() > 0.4,
    ogsMediaCheck: Math.random() > 0.5,
    createdAt: randDate('2024-01-01', '2025-01-15'),
    lastScreenedAt: randDate('2025-01-01', '2025-02-20'),
    rating: rand(riskLevels),
    mandatoryAction: hasMandatory,
    unresolvedCount,
    reviewRequiredCount,
    positiveCount: matches.filter(m => m.status === 'Positive').length,
    possibleCount: matches.filter(m => m.status === 'Possible').length,
    falseCount: matches.filter(m => m.status === 'False').length,
    unknownCount: matches.filter(m => m.status === 'Unknown').length,
    assignee,
    status: 'Active' as const,
    screeningData: {
      dob: entityType === 'Individual' ? randDate('1950-01-01', '2000-12-31') : undefined,
      gender: entityType === 'Individual' ? rand(['Male', 'Female']) : undefined,
      nationality: entityType === 'Individual' ? rand(nationalities) : undefined,
      country: rand(countries),
      idType: Math.random() > 0.3 ? rand(idTypes) : undefined,
      idNumber: Math.random() > 0.3 ? `${rand(['P', 'N', 'D', 'T'])}${randInt(100000000, 999999999)}` : undefined,
      secondaryIdType: Math.random() > 0.6 ? rand(idTypes) : undefined,
      secondaryIdNumber: Math.random() > 0.6 ? `${rand(['P', 'N', 'D', 'T'])}${randInt(100000000, 999999999)}` : undefined,
      customFields: Math.random() > 0.5 ? { 'Internal Ref': `REF-${randInt(1000, 9999)}`, 'Source System': rand(['CRM', 'Onboarding', 'KYC Portal']) } : undefined,
    },
    notes: generateNotes(caseId),
    auditTrail: generateAuditTrail(caseId, randDate('2024-01-01', '2024-06-01')),
  };
});

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
