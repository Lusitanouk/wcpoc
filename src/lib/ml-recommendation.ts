import type { Match, MatchStatus, RiskLevel, WhyMatchedField, MatchFieldResult } from '@/types';

export type FactorContribution = 'positive' | 'neutral' | 'negative';

export type MlFactorKey = 'name' | 'rarity' | 'dob' | 'id' | 'nationality';

export interface MlFactor {
  fieldKey: MlFactorKey;
  label: string;
  score: number;
  weight: number;
  contribution: FactorContribution;
  detail: string;
}

export interface ResolutionLever {
  fieldKey: MlFactorKey;
  text: string;
}

export interface MlRecommendation {
  compositeScore: number;
  confidence: number;
  recommendedStatus: MatchStatus;
  recommendedRisk: RiskLevel;
  recommendedOutcome: 'Full Match' | 'Partial Match' | 'No Match' | 'Unknown';
  factors: MlFactor[];
  headline: string;
  /** Up to 2 hypothetical identifier resolutions that would most shift the outcome */
  resolutionLevers: ResolutionLever[];
  /** True when the model declined to recommend (confidence below floor) */
  abstained: boolean;
  /** Human-readable reason for abstention when abstained === true */
  abstentionReason?: string;
  /** Fields that would most help resolve the abstention */
  missingIdentifiers: string[];
  /** Semantic version of the scoring model */
  modelVersion: string;
}

export const AI_MODEL_VERSION = 'wc-ml-v0.3';
export const CONFIDENCE_FLOOR = 45;

// Simple deterministic hash → 0-1
function seededRand(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function findField(match: Match, names: string[]) {
  return match.whyMatched.find(f => names.some(n => f.field.toLowerCase().includes(n)));
}

function resultToScore(r?: string) {
  switch (r) {
    case 'match':    return 100;
    case 'partial':  return 55;
    case 'mismatch': return 5;
    default:         return 35;
  }
}

function resultToContribution(r?: string): FactorContribution {
  if (r === 'match')    return 'positive';
  if (r === 'mismatch') return 'negative';
  return 'neutral';
}

type Core = Omit<MlRecommendation, 'resolutionLevers'>;

function computeCore(match: Match): Core {
  const nameField = match.whyMatched.find(f => f.field.toLowerCase().includes('name')) || match.whyMatched[0];
  const nameScore = Math.round(0.7 * match.strength + 0.3 * resultToScore(nameField?.result));

  const tokens = match.matchedName.split(/\s+/).filter(Boolean);
  const uniqueness = Math.min(1, tokens.length / 4);
  const rarityBase = 35 + seededRand(match.matchedName) * 55;
  const rarityScore = Math.round(rarityBase * (0.6 + 0.4 * uniqueness));

  const dob = findField(match, ['dob', 'birth']);
  const idDoc = findField(match, ['passport', 'document', 'id number', 'id type']);
  const nat = findField(match, ['nationality', 'country', 'jurisdiction']);

  const idFactors: MlFactor[] = [];
  if (dob) idFactors.push({
    fieldKey: 'dob',
    label: 'Date of birth',
    score: resultToScore(dob.result),
    weight: 0.10,
    contribution: resultToContribution(dob.result),
    detail: `${dob.inputValue || '—'} vs ${dob.matchedValue || '—'} → ${dob.result}`,
  });
  if (idDoc) idFactors.push({
    fieldKey: 'id',
    label: 'ID document',
    score: resultToScore(idDoc.result),
    weight: 0.10,
    contribution: resultToContribution(idDoc.result),
    detail: `${idDoc.inputValue || '—'} vs ${idDoc.matchedValue || '—'} → ${idDoc.result}`,
  });
  if (nat) idFactors.push({
    fieldKey: 'nationality',
    label: 'Nationality / country',
    score: resultToScore(nat.result),
    weight: 0.08,
    contribution: resultToContribution(nat.result),
    detail: `${nat.inputValue || '—'} vs ${nat.matchedValue || '—'} → ${nat.result}`,
  });

  const usedIdWeight = idFactors.reduce((s, f) => s + f.weight, 0);
  const slackWeight = 0.28 - usedIdWeight;

  const factors: MlFactor[] = [
    {
      fieldKey: 'name',
      label: 'Name match',
      score: nameScore,
      weight: 0.45 + slackWeight * 0.6,
      contribution: nameScore >= 75 ? 'positive' : nameScore >= 50 ? 'neutral' : 'negative',
      detail: `Fuzzy + token similarity vs "${match.matchedName}" (strength ${match.strength}%)`,
    },
    {
      fieldKey: 'rarity',
      label: 'Name rarity',
      score: rarityScore,
      weight: 0.27 + slackWeight * 0.4,
      contribution: rarityScore >= 70 ? 'positive' : rarityScore >= 40 ? 'neutral' : 'negative',
      detail: rarityScore >= 70
        ? 'Uncommon name — coincidental collision unlikely'
        : rarityScore >= 40
        ? 'Moderately common name'
        : 'Common name — higher false-positive baseline',
    },
    ...idFactors,
  ];

  const totalW = factors.reduce((s, f) => s + f.weight, 0);
  const composite = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalW);

  const completeness = (idFactors.length + 2) / 5;
  let posW = 0, negW = 0;
  factors.forEach(f => {
    if (f.contribution === 'positive') posW += f.weight;
    else if (f.contribution === 'negative') negW += f.weight;
  });
  const conflictPenalty = Math.round((Math.min(posW, negW) / (totalW / 2)) * 55);
  const decisive = (composite >= 80 || composite <= 25) && conflictPenalty < 10 ? 8 : 0;
  const confidenceRaw = 45 + completeness * 35 + decisive - conflictPenalty;
  const confidence = Math.round(Math.max(30, Math.min(98, confidenceRaw)));

  let recommendedStatus: MatchStatus;
  let recommendedOutcome: MlRecommendation['recommendedOutcome'];
  let recommendedRisk: RiskLevel;

  if (composite >= 78) {
    recommendedStatus = 'Positive';
    recommendedOutcome = 'Full Match';
    recommendedRisk = match.dataset === 'Sanctions' ? 'High' : match.riskLevel === 'None' ? 'Medium' : match.riskLevel;
  } else if (composite >= 30) {
    // 30–78: Possible (request additional data); no more open-ended Unknown band.
    recommendedStatus = 'Possible';
    recommendedOutcome = 'Partial Match';
    recommendedRisk = composite >= 55 ? 'Medium' : 'Low';
  } else {
    recommendedStatus = 'False';
    recommendedOutcome = 'No Match';
    recommendedRisk = 'None';
  }

  factors.sort((a, b) => Math.abs(b.score - 50) * b.weight - Math.abs(a.score - 50) * a.weight);

  // Determine missing identifiers (unavailable secondary evidence)
  const missingIdentifiers: string[] = [];
  if (!dob || dob.result === 'missing') missingIdentifiers.push('Date of birth');
  if (!idDoc || idDoc.result === 'missing') missingIdentifiers.push('ID document');
  if (!nat || nat.result === 'missing') missingIdentifiers.push('Nationality');

  const abstained = confidence < CONFIDENCE_FLOOR;
  const abstentionReason = abstained
    ? 'Insufficient evidence for a recommendation'
    : undefined;

  const headline = abstained
    ? 'Insufficient evidence for a recommendation'
    : `${recommendedStatus === 'False' ? 'False Positive' : recommendedStatus} · ${confidence >= 80 ? 'High' : confidence >= 65 ? 'Moderate' : 'Low'} confidence`;

  return {
    compositeScore: composite,
    confidence,
    recommendedStatus,
    recommendedRisk,
    recommendedOutcome,
    factors,
    headline,
    abstained,
    abstentionReason,
    missingIdentifiers,
    modelVersion: AI_MODEL_VERSION,
  };
}

// ── Resolution levers ───────────────────────────────────────
// Detect identifiers that are currently missing (either absent from whyMatched or with result === 'missing').
// For each, simulate a hypothetical resolution (match / mismatch) and pick the ones that move
// the outcome or confidence the most.

const LEVER_MAP: Record<Exclude<MlFactorKey, 'name' | 'rarity'>, { needles: string[]; label: string; fallbackField: string }> = {
  dob:         { needles: ['dob', 'birth'],                              label: 'date of birth', fallbackField: 'DOB' },
  id:          { needles: ['passport', 'document', 'id number', 'id type'], label: 'ID document',  fallbackField: 'ID Number' },
  nationality: { needles: ['nationality', 'country', 'jurisdiction'],    label: 'nationality',   fallbackField: 'Nationality' },
};

function hypothesise(match: Match, key: 'dob' | 'id' | 'nationality', result: MatchFieldResult): Match {
  const cfg = LEVER_MAP[key];
  const wm: WhyMatchedField[] = match.whyMatched.map(f => ({ ...f }));
  const idx = wm.findIndex(f => cfg.needles.some(n => f.field.toLowerCase().includes(n)));
  if (idx >= 0) {
    wm[idx] = { ...wm[idx], result };
  } else {
    wm.push({ field: cfg.fallbackField, result, detail: 'hypothetical', inputValue: '?', matchedValue: '?' });
  }
  return { ...match, whyMatched: wm };
}

function outcomeLabel(s: MatchStatus): string {
  return s === 'False' ? 'False Positive' : s;
}

function buildLevers(match: Match, current: Core): ResolutionLever[] {
  const candidates: ('dob' | 'id' | 'nationality')[] = [];
  (Object.keys(LEVER_MAP) as (keyof typeof LEVER_MAP)[]).forEach(key => {
    const cfg = LEVER_MAP[key];
    const f = match.whyMatched.find(w => cfg.needles.some(n => w.field.toLowerCase().includes(n)));
    if (!f || f.result === 'missing') candidates.push(key);
  });

  type Ranked = ResolutionLever & { rank: number };
  const ranked: Ranked[] = [];

  for (const key of candidates) {
    // Consider match vs mismatch — pick the more informative direction per key
    for (const hypResult of ['match', 'mismatch'] as MatchFieldResult[]) {
      const alt = computeCore(hypothesise(match, key, hypResult));
      const statusChanged = alt.recommendedStatus !== current.recommendedStatus;
      const confDelta = alt.confidence - current.confidence;
      if (!statusChanged && Math.abs(confDelta) < 8) continue;

      const cfg = LEVER_MAP[key];
      const article = /^[aeiou]/i.test(cfg.label) ? 'An' : 'A';
      const supplying = hypResult === 'match'
        ? `${article} confirmed ${cfg.label} that matches`
        : `${article} confirmed ${cfg.label} that differs`;

      const text = statusChanged
        ? `${supplying} would move this to ${outcomeLabel(alt.recommendedStatus)} at ${alt.confidence}% confidence.`
        : `${supplying} would ${confDelta > 0 ? 'raise' : 'lower'} confidence from ${current.confidence}% to ${alt.confidence}%.`;

      const rank = statusChanged ? 100 + Math.abs(confDelta) : Math.abs(confDelta);
      ranked.push({ fieldKey: key, text, rank });
    }
  }

  // Prefer one lever per fieldKey, take strongest overall
  ranked.sort((a, b) => b.rank - a.rank);
  const seen = new Set<MlFactorKey>();
  const out: ResolutionLever[] = [];
  for (const r of ranked) {
    if (seen.has(r.fieldKey)) continue;
    seen.add(r.fieldKey);
    out.push({ fieldKey: r.fieldKey, text: r.text });
    if (out.length >= 2) break;
  }
  return out;
}

export function computeMlRecommendation(match: Match): MlRecommendation {
  const core = computeCore(match);
  return { ...core, resolutionLevers: buildLevers(match, core) };
}

/** Build a human-readable narrative for the resolution Reason field. */
export function buildRecommendationNarrative(match: Match, rec: MlRecommendation): string {
  const top = rec.factors.slice(0, 3);
  const lines: string[] = [];
  lines.push(
    `AI recommendation: ${rec.recommendedStatus === 'False' ? 'False Positive' : rec.recommendedStatus} (composite ${rec.compositeScore}/100, ${rec.confidence}% confidence).`,
  );
  lines.push('');
  lines.push('Key drivers:');
  top.forEach(f => {
    const sign = f.contribution === 'positive' ? '+' : f.contribution === 'negative' ? '−' : '·';
    lines.push(`  ${sign} ${f.label} (${f.score}/100, weight ${(f.weight * 100).toFixed(0)}%): ${f.detail}`);
  });
  lines.push('');
  const verdict =
    rec.recommendedStatus === 'Positive'
      ? `Strong corroboration across name and secondary identifiers supports a true match against the ${match.dataset} record "${match.matchedName}". Escalation and EDD are advised.`
      : rec.recommendedStatus === 'Possible'
      ? `Partial alignment on name with mixed secondary-identifier evidence. Manual review of source documents is required before clearing.`
      : rec.recommendedStatus === 'Unknown'
      ? `Insufficient secondary-identifier evidence to confirm or dismiss. Request additional KYC data points (DOB, nationality, ID) and rerun.`
      : `Name similarity is offset by mismatching identifiers and/or low name rarity, consistent with a coincidental collision. Recommended as a False Positive.`;
  lines.push(verdict);
  if (rec.resolutionLevers.length > 0) {
    lines.push('');
    lines.push('What would resolve this:');
    rec.resolutionLevers.forEach(l => lines.push(`  • ${l.text}`));
  }
  return lines.join('\n');
}
