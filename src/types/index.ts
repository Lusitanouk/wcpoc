export type EntityType = 'Individual' | 'Organisation' | 'Vessel' | 'Unspecified';
export type CheckType = 'World-Check' | 'Media Check' | 'Passport Check';
export type MatchStatus = 'Positive' | 'Possible' | 'False' | 'Unknown' | 'Unresolved';
export type RiskLevel = 'High' | 'Medium' | 'Low' | 'None';
export type Dataset = 'Sanctions' | 'PEP' | 'Law Enforcement' | 'Other';
export type UserRole = 'Analyst' | 'Supervisor';
export type ScreeningMode = 'Single' | 'Batch';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type MatchFieldResult = 'match' | 'partial' | 'mismatch' | 'missing';
export type DocumentType = 'Passport' | 'ID-Card Type 1' | 'ID-Card Type 2';
export type MediaRiskLevel = 'High' | 'Medium' | 'Low' | 'No Risk' | 'Unknown';

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

export interface CaseScreeningData {
  dob?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  idType?: string;
  idNumber?: string;
  secondaryIdType?: string;
  secondaryIdNumber?: string;
  customFields?: Record<string, string>;
}

export type AuditEventType = 'note' | 'assign' | 'move' | 'edit' | 'rescreen' | 'ogs_toggle' | 'archive' | 'status_change' | 'created';

export interface CaseAuditEvent {
  id: string;
  type: AuditEventType;
  author: string;
  text: string;
  comment?: string;
  createdAt: string;
}

export interface CaseNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
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
  positiveCount: number;
  possibleCount: number;
  falseCount: number;
  unknownCount: number;
  assignee: string;
  status: 'Active' | 'Archived' | 'Deleted';
  screeningData: CaseScreeningData;
  notes: CaseNote[];
  auditTrail: CaseAuditEvent[];
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

// --- Media Check Types ---

export interface MediaArticle {
  id: string;
  caseId: string;
  headline: string;
  publication: string;
  publishedDate: string;
  wordCount: number;
  snippet: string;
  fullText: string;
  topics: string[];
  countries: string[];
  matchedEntity: string;
  riskLevel: MediaRiskLevel;
  riskReason: string;
  attached: boolean;
  visited: boolean;
  smartFilterRelevant: boolean;
  highlightedTerms: string[];
  sourceType: string;
}

export interface MediaCheckResult {
  caseId: string;
  entityName: string;
  totalArticles: number;
  reviewRequired: number;
  attachedCount: number;
  matchedEntities: { name: string; count: number }[];
  articles: MediaArticle[];
  smartFilterEnabled: boolean;
  dateRange: 'last2years' | 'older' | 'all';
}

// --- Passport Check Types ---

export interface PassportData {
  givenName: string;
  lastName: string;
  gender: string;
  issuingState: string;
  nationality: string;
  dob: string;
  documentType: DocumentType;
  identificationNumber: string;
  dateOfExpiry: string;
}

export interface PassportCheckResult {
  caseId: string;
  passportData: PassportData;
  mrzLine1: string;
  mrzLine2: string;
  mrzMatch: 'yes' | 'no' | 'pending';
  verificationStatus: 'verified' | 'invalid' | 'pending';
  controlDigitsValid: boolean;
  fieldVerifications: {
    field: string;
    entered: string;
    computed: string;
    matches: boolean;
  }[];
}
