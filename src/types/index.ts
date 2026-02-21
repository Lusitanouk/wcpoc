export type EntityType = 'Individual' | 'Organisation' | 'Vessel' | 'Unspecified';
export type CheckType = 'World-Check' | 'Media Check' | 'Passport Check';
export type MatchStatus = 'Positive' | 'Possible' | 'False' | 'Unknown' | 'Unresolved';
export type RiskLevel = 'High' | 'Medium' | 'Low' | 'None';
export type Dataset = 'Sanctions' | 'PEP' | 'Law Enforcement' | 'Other';
export type UserRole = 'Analyst' | 'Supervisor';
export type ScreeningMode = 'Single' | 'Batch';

export interface Group {
  id: string;
  name: string;
  ongoingFrequency: string;
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
  reviewRequiredReasons: string[];
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
