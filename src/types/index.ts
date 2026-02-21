export type EntityType = 'Individual' | 'Organisation' | 'Vessel' | 'Unspecified';
export type CheckType = 'World-Check' | 'Media Check' | 'Passport Check';
export type MatchStatus = 'Positive' | 'Possible' | 'False' | 'Unknown' | 'Unresolved';
export type RiskLevel = 'High' | 'Medium' | 'Low' | 'None';
export type Dataset = 'Sanctions' | 'PEP' | 'Law Enforcement' | 'Other';
export type UserRole = 'Analyst' | 'Supervisor';
export type ScreeningMode = 'Single' | 'Batch';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type MatchFieldResult = 'match' | 'partial' | 'mismatch' | 'missing';

export interface Group {
  id: string;
  name: string;
  ongoingFrequency: string;
}

export interface ChangeLogEntry {
  field: string;
  from: string;
  to: string;
  changedAt: string;
}

export interface Case {
  id: string;
  name: string;
  entityType: EntityType;
  groupId: string;
  mode: ScreeningMode;
  checkTypes: CheckType[];
  ogsEnabled: boolean;
  createdAt: string;
  lastScreenedAt: string;
  rating: RiskLevel;
  mandatoryAction: boolean;
  unresolvedCount: number;
  reviewRequiredCount: number;
  // Bucket counts
  positiveCount: number;
  possibleCount: number;
  falseCount: number;
  unknownCount: number;
}

export interface MatchIdentifiers {
  dob?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  idType?: string;
  idNumber?: string;
}

export interface MatchRecord {
  keyData: Record<string, string>;
  furtherInfo: string;
  aliases: string[];
  keywords: string[];
  pepRoleDetails?: string;
  connections: string[];
  sources: { name: string; url: string }[];
}

export interface WhyMatchedField {
  field: string;
  result: MatchFieldResult;
  detail: string;
}

export interface Match {
  id: string;
  caseId: string;
  matchedName: string;
  aliases: string[];
  strength: number;
  dataset: Dataset;
  checkType: CheckType;
  status: MatchStatus;
  riskLevel: RiskLevel;
  reason: string;
  updated: boolean;
  reviewRequired: boolean;
  reviewRequiredAt?: string;
  reviewRequiredReasons: string[];
  changeLog: ChangeLogEntry[];
  alertDate: string;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  whyMatched: WhyMatchedField[];
  matchStrengthExplanation: string;
  identifiers: MatchIdentifiers;
  recordData: MatchRecord;
}

export interface ScreeningConfig {
  groupId: string;
  mode: ScreeningMode;
  entityType: EntityType;
  checkTypes: CheckType[];
  ogsEnabled: boolean;
}

export interface ScreeningData {
  name: string;
  nameTransposition: boolean;
  caseId: string;
  autoGenerateId: boolean;
  dob: string;
  gender: string;
  nationality: string;
  country: string;
  idType: string;
  idNumber: string;
}
