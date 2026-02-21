import type { Group, Case, Match, Dataset, MatchStatus, RiskLevel, CheckType, EntityType, ChangeLogEntry, WhyMatchedField, MatchFieldResult } from '@/types';
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

const orgNames = ['Global Trade Corp', 'Oceanic Shipping Ltd', 'Meridian Holdings', 'Atlas Energy Group', 'Phoenix Financial Services'];
const vesselNames = ['MV Oceanic Star', 'SS Northern Light', 'MV Pacific Dawn', 'SS Caspian Wave', 'MV Arctic Explorer'];

const datasets: Dataset[] = ['Sanctions', 'PEP', 'Law Enforcement', 'Other'];
const statuses: MatchStatus[] = ['Positive', 'Possible', 'False', 'Unknown', 'Unresolved'];
const riskLevels: RiskLevel[] = ['High', 'Medium', 'Low', 'None'];
const checkTypes: CheckType[] = ['World-Check', 'Media Check', 'Passport Check'];
const entityTypes: EntityType[] = ['Individual', 'Organisation', 'Vessel', 'Unspecified'];
const nationalities = ['US', 'UK', 'RU', 'CN', 'DE', 'FR', 'SA', 'AE', 'JP', 'BR', 'IN', 'TR', 'IR', 'SY', 'KP'];
const countries = ['United States', 'United Kingdom', 'Russia', 'China', 'Germany', 'France', 'Saudi Arabia', 'UAE', 'Japan', 'Brazil'];
const reviewReasons = ['Profile updated', 'New alias added', 'Status change', 'New source added', 'Category reclassified', 'Sanctions list updated'];
const keywords = ['Terrorism', 'Money Laundering', 'Fraud', 'Corruption', 'Drug Trafficking', 'Arms Dealing', 'Tax Evasion', 'Cybercrime'];
const changeFields = ['Category', 'Nationality', 'Secondary ID', 'Alias', 'PEP Status', 'Sanctions List'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(start: string, end: string) {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().split('T')[0];
}

function generateWhyMatched(strength: number): { fields: WhyMatchedField[]; explanation: string } {
  const results: MatchFieldResult[] = ['match', 'partial', 'mismatch', 'missing'];
  const nameResult: MatchFieldResult = strength >= 80 ? 'match' : strength >= 60 ? 'partial' : 'mismatch';
  const nameDetail = nameResult === 'match' ? 'Exact name match' : nameResult === 'partial' ? 'Close name variant (alias)' : 'Weak name similarity';
  
  const fields: WhyMatchedField[] = [
    { field: 'Name', result: nameResult, detail: nameDetail },
  ];

  const dobResult = rand(results);
  fields.push({ field: 'DOB', result: dobResult, detail: dobResult === 'match' ? 'Exact DOB match' : dobResult === 'partial' ? 'Year of birth matches' : dobResult === 'mismatch' ? 'DOB does not match' : 'DOB not available' });
  
  const natResult = rand(results);
  fields.push({ field: 'Nationality', result: natResult, detail: natResult === 'match' ? 'Nationality matches' : natResult === 'partial' ? 'Region matches' : natResult === 'mismatch' ? 'Different nationality' : 'Nationality not provided' });
  
  const countryResult = rand(results);
  fields.push({ field: 'Country', result: countryResult, detail: countryResult === 'match' ? 'Country/location matches' : countryResult === 'partial' ? 'Region overlap' : countryResult === 'mismatch' ? 'Different country' : 'Country not available' });

  if (Math.random() > 0.5) {
    const idResult = rand(['match', 'missing'] as MatchFieldResult[]);
    fields.push({ field: 'ID Number', result: idResult, detail: idResult === 'match' ? 'ID number matches' : 'ID not available for comparison' });
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

// World-Check matches only — Media Check and Passport Check have their own result models
function generateMatches(caseId: string, count: number): Match[] {
  return Array.from({ length: count }, (_, i) => {
    const isUpdated = Math.random() > 0.7;
    const isReviewReq = isUpdated && Math.random() > 0.4;
    const status: MatchStatus = isReviewReq ? 'Unresolved' : rand(statuses);
    const dataset = rand(datasets);
    const ct: CheckType = 'World-Check';
    const matchName = rand(names);
    const strength = randInt(30, 99);
    const alertDate = randDate('2024-12-01', '2025-02-15');
    const reviewRequiredAt = isReviewReq ? randDate('2025-01-10', '2025-02-15') : undefined;
    const { fields: whyMatched, explanation: matchStrengthExplanation } = generateWhyMatched(strength);
    const changeLog = generateChangeLog(isReviewReq);

    const partial: Omit<Match, 'priorityScore' | 'priorityLevel'> = {
      id: `${caseId}-m${i + 1}`,
      caseId,
      matchedName: matchName,
      aliases: [matchName.split(' ').reverse().join(' '), `${matchName} Jr.`].slice(0, randInt(0, 2)),
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
        dob: Math.random() > 0.3 ? randDate('1950-01-01', '2000-12-31') : undefined,
        gender: Math.random() > 0.3 ? rand(['Male', 'Female']) : undefined,
        nationality: Math.random() > 0.2 ? rand(nationalities) : undefined,
        country: Math.random() > 0.3 ? rand(countries) : undefined,
      },
      recordData: {
        keyData: {
          'Full Name': matchName,
          'Date of Birth': randDate('1950-01-01', '2000-12-31'),
          'Nationality': rand(nationalities),
          'Category': dataset,
          'Listed Date': randDate('2010-01-01', '2024-12-31'),
          'Last Updated': randDate('2024-01-01', '2025-02-01'),
        },
        furtherInfo: `Subject is associated with ${rand(keywords).toLowerCase()} activities. Listed on multiple international watchlists. Further investigation recommended.`,
        aliases: [matchName.split(' ').reverse().join(' '), `${matchName.split(' ')[0]} ${rand(nationalities)}`],
        keywords: Array.from({ length: randInt(1, 4) }, () => rand(keywords)),
        pepRoleDetails: dataset === 'PEP' ? `Former ${rand(['Minister', 'Governor', 'Senator', 'Director', 'Ambassador'])} of ${rand(countries)}` : undefined,
        connections: Array.from({ length: randInt(0, 3) }, () => `${rand(names)} (${rand(['Associate', 'Family', 'Business Partner'])})`),
        sources: [
          { name: 'OFAC SDN List', url: '#' },
          { name: 'UN Security Council', url: '#' },
          { name: 'EU Sanctions List', url: '#' },
        ].slice(0, randInt(1, 3)),
      },
    };

    const score = computePriorityScore(partial);
    return { ...partial, priorityScore: score, priorityLevel: priorityLevel(score) } as Match;
  });
}

export const allMatches: Match[] = [];
export const cases: Case[] = Array.from({ length: 30 }, (_, i) => {
  const caseId = `WC-${String(2024001 + i)}`;
  const entityType = i < 20 ? 'Individual' : i < 25 ? 'Organisation' : i < 28 ? 'Vessel' : rand(entityTypes);
  const caseName = entityType === 'Organisation' ? rand(orgNames) : entityType === 'Vessel' ? rand(vesselNames) : rand(names);
  const matchCount = randInt(2, 8);
  const matches = generateMatches(caseId, matchCount);
  allMatches.push(...matches);

  const unresolvedCount = matches.filter(m => m.status === 'Unresolved').length;
  const reviewRequiredCount = matches.filter(m => m.reviewRequired).length;
  const hasMandatory = reviewRequiredCount > 0 || unresolvedCount > 2;

  return {
    id: caseId,
    name: caseName,
    entityType,
    groupId: rand(groups).id,
    mode: 'Single' as const,
    checkTypes: [
      'World-Check' as const,
      ...(Math.random() > 0.5 ? ['Media Check' as const] : []),
      ...(entityType === 'Individual' && Math.random() > 0.6 ? ['Passport Check' as const] : []),
    ],
    ogsEnabled: Math.random() > 0.4,
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
