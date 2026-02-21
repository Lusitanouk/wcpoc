import type { Group, Case, Match, Dataset, MatchStatus, RiskLevel, CheckType, EntityType } from '@/types';

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

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(start: string, end: string) {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().split('T')[0];
}

function generateMatches(caseId: string, count: number): Match[] {
  return Array.from({ length: count }, (_, i) => {
    const isUpdated = Math.random() > 0.7;
    const isReviewReq = isUpdated && Math.random() > 0.4;
    const status: MatchStatus = isReviewReq ? 'Unresolved' : rand(statuses);
    const dataset = rand(datasets);
    const ct = rand(checkTypes);
    const matchName = rand(names);
    return {
      id: `${caseId}-m${i + 1}`,
      caseId,
      matchedName: matchName,
      aliases: [matchName.split(' ').reverse().join(' '), `${matchName} Jr.`].slice(0, randInt(0, 2)),
      strength: randInt(30, 99),
      dataset,
      checkType: ct,
      status,
      riskLevel: status === 'Positive' ? 'High' : status === 'Possible' ? 'Medium' : rand(riskLevels),
      reason: status !== 'Unresolved' ? `Resolved as ${status.toLowerCase()} match` : '',
      updated: isUpdated,
      reviewRequired: isReviewReq,
      reviewRequiredReasons: isReviewReq ? Array.from({ length: randInt(1, 3) }, () => rand(reviewReasons)) : [],
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
    checkTypes: ['World-Check', ...(Math.random() > 0.5 ? ['Media Check' as const] : [])],
    ogsEnabled: Math.random() > 0.4,
    createdAt: randDate('2024-01-01', '2025-01-15'),
    lastScreenedAt: randDate('2025-01-01', '2025-02-20'),
    rating: rand(riskLevels),
    mandatoryAction: hasMandatory,
    unresolvedCount,
    reviewRequiredCount,
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
