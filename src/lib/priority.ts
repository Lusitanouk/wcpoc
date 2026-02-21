import type { Match, Dataset, PriorityLevel } from '@/types';

const DATASET_WEIGHT: Record<Dataset, number> = {
  'Sanctions': 100,
  'PEP': 70,
  'Law Enforcement': 60,
  'Other': 20,
};

export function computePriorityScore(m: Pick<Match, 'dataset' | 'status' | 'reviewRequired' | 'alertDate' | 'strength'>): number {
  let score = DATASET_WEIGHT[m.dataset] || 20;

  if (m.status === 'Unresolved') score += 40;
  if (m.reviewRequired) score += 30;

  const ageMs = Date.now() - new Date(m.alertDate).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays > 30) score += 40;
  else if (ageDays >= 14) score += 25;
  else if (ageDays >= 7) score += 15;
  else score += 5;

  if (m.strength >= 85) score += 10;
  else if (m.strength >= 70) score += 5;

  return score;
}

export function priorityLevel(score: number): PriorityLevel {
  if (score >= 150) return 'High';
  if (score >= 100) return 'Medium';
  return 'Low';
}

export function priorityColor(level: PriorityLevel): string {
  switch (level) {
    case 'High': return 'border-status-unresolved text-status-unresolved';
    case 'Medium': return 'border-status-possible text-status-possible';
    case 'Low': return 'border-muted-foreground text-muted-foreground';
  }
}
