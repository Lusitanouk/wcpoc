import type { Match, MatchStatus, RiskLevel } from '@/types';

export type FactorContribution = 'positive' | 'neutral' | 'negative';

export interface MlFactor {
  /** Short label, e.g. "Name match" */
  label: string;
  /** 0-100 raw score for this factor */
  score: number;
  /** 0-1 weight used in the combinational score */
  weight: number;
  /** Direction of contribution toward a true-match recommendation */
  contribution: FactorContribution;
  /** One-line explanation a data analyst can read */
  detail: string;
}

export interface MlRecommendation {
  /** Combinational score 0-100 (weighted) */
  compositeScore: number;
  /** Model confidence 0-100 (driven by data completeness + score certainty) */
  confidence: number;
  /** Recommended disposition */
  recommendedStatus: MatchStatus;
  recommendedRisk: RiskLevel;
  recommendedOutcome: 'Full Match' | 'Partial Match' | 'No Match' | 'Unknown';
  /** Ordered factor list, highest absolute contribution first */
  factors: MlFactor[];
  /** Short tag — e.g. "True Match · High confidence" */
  headline: string;
}

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
    default:         return 35; // missing
  }
}

function resultToContribution(r?: string): FactorContribution {
  if (r === 'match')    return 'positive';
  if (r === 'mismatch') return 'negative';
  return 'neutral';
}

export function computeMlRecommendation(match: Match): MlRecommendation {
  // ── 1. Name match (from match strength and primary name field) ──
  const nameField = match.whyMatched.find(f => f.field.toLowerCase().includes('name')) || match.whyMatched[0];
  const nameScore = Math.round(0.7 * match.strength + 0.3 * resultToScore(nameField?.result));

  // ── 2. Name rarity (deterministic from matched name) ──
  // Short / common names → lower rarity; unique tokens → higher rarity
  const tokens = match.matchedName.split(/\s+/).filter(Boolean);
  const uniqueness = Math.min(1, tokens.length / 4);
  const rarityBase = 35 + seededRand(match.matchedName) * 55;
  const rarityScore = Math.round(rarityBase * (0.6 + 0.4 * uniqueness));

  // ── 3. Secondary identifiers (DOB / ID / nationality / country) ──
  const dob = findField(match, ['dob', 'birth']);
  const idDoc = findField(match, ['id', 'passport', 'document']);
  const nat = findField(match, ['nationality', 'country', 'jurisdiction']);
  const secondaryFields = [dob, idDoc, nat].filter(Boolean);
  const secondaryScore = secondaryFields.length
    ? Math.round(secondaryFields.reduce((s, f) => s + resultToScore(f!.result), 0) / secondaryFields.length)
    : 30;

  // Per-id micro-factors (so analyst sees breakdown)
  const idFactors: MlFactor[] = [];
  if (dob) idFactors.push({
    label: 'Date of birth',
    score: resultToScore(dob.result),
    weight: 0.10,
    contribution: resultToContribution(dob.result),
    detail: `${dob.inputValue || '—'} vs ${dob.matchedValue || '—'} → ${dob.result}`,
  });
  if (idDoc) idFactors.push({
    label: 'ID document',
    score: resultToScore(idDoc.result),
    weight: 0.10,
    contribution: resultToContribution(idDoc.result),
    detail: `${idDoc.inputValue || '—'} vs ${idDoc.matchedValue || '—'} → ${idDoc.result}`,
  });
  if (nat) idFactors.push({
    label: 'Nationality / country',
    score: resultToScore(nat.result),
    weight: 0.08,
    contribution: resultToContribution(nat.result),
    detail: `${nat.inputValue || '—'} vs ${nat.matchedValue || '—'} → ${nat.result}`,
  });

  // Distribute remaining weight if no id factors present
  const usedIdWeight = idFactors.reduce((s, f) => s + f.weight, 0);
  const slackWeight = 0.28 - usedIdWeight;

  const factors: MlFactor[] = [
    {
      label: 'Name match',
      score: nameScore,
      weight: 0.45 + slackWeight * 0.6,
      contribution: nameScore >= 75 ? 'positive' : nameScore >= 50 ? 'neutral' : 'negative',
      detail: `Fuzzy + token similarity vs "${match.matchedName}" (strength ${match.strength}%)`,
    },
    {
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

  // ── Combinational score (weighted average) ──
  const totalW = factors.reduce((s, f) => s + f.weight, 0);
  const composite = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalW);

  // Confidence driven by data completeness
  const completeness = (idFactors.length + 2) / 5; // name+rarity always present
  const confidence = Math.round(Math.min(98, 55 + completeness * 35 + (composite >= 80 || composite <= 25 ? 8 : 0)));

  // ── Recommendation derivation ──
  let recommendedStatus: MatchStatus;
  let recommendedOutcome: MlRecommendation['recommendedOutcome'];
  let recommendedRisk: RiskLevel;

  if (composite >= 78) {
    recommendedStatus = 'Positive';
    recommendedOutcome = 'Full Match';
    recommendedRisk = match.dataset === 'Sanctions' ? 'High' : match.riskLevel === 'None' ? 'Medium' : match.riskLevel;
  } else if (composite >= 55) {
    recommendedStatus = 'Possible';
    recommendedOutcome = 'Partial Match';
    recommendedRisk = 'Medium';
  } else if (composite >= 30) {
    recommendedStatus = 'Unknown';
    recommendedOutcome = 'Unknown';
    recommendedRisk = 'Low';
  } else {
    recommendedStatus = 'False';
    recommendedOutcome = 'No Match';
    recommendedRisk = 'None';
  }

  factors.sort((a, b) => Math.abs(b.score - 50) * b.weight - Math.abs(a.score - 50) * a.weight);

  const headline = `${recommendedStatus === 'False' ? 'False Positive' : recommendedStatus} · ${confidence >= 80 ? 'High' : confidence >= 65 ? 'Moderate' : 'Low'} confidence`;

  return {
    compositeScore: composite,
    confidence,
    recommendedStatus,
    recommendedRisk,
    recommendedOutcome,
    factors,
    headline,
  };
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
  return lines.join('\n');
}
