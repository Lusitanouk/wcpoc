export type EntityType = 'Individual' | 'Organisation' | 'Vessel' | 'Unspecified';
export type CheckType = 'Watchlists' | 'Adverse Media' | 'Passport Check';
export type MatchStatus = 'Positive' | 'Possible' | 'False' | 'Unknown' | 'Unresolved';
export type RiskLevel = 'High' | 'Medium' | 'Low' | 'None';
export type Dataset = 'Sanctions' | 'PEP' | 'Law Enforcement' | 'Other';
export type UserRole = 'Analyst' | 'Supervisor' | 'Checker';
export type ScreeningMode = 'Single' | 'Batch';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type MatchFieldResult = 'match' | 'partial' | 'mismatch' | 'missing';
export type DocumentType = 'Passport' | 'ID-Card Type 1' | 'ID-Card Type 2';
export type MediaRiskLevel = 'High' | 'Medium' | 'Low' | 'No Risk' | 'Unknown';

// ─── Maker-Checker Types ─────────────────────────────────────

export type CheckerDecision = 'Accepted' | 'Amended' | 'Rejected';
export type MakerType = 'Human' | 'Agentic';

/** Evidence trace attached to an agentic maker decision */
export interface AgenticEvidenceTrace {
  /** Snapshot of the ML factors the bot relied on */
  factorSnapshot: {
    fieldKey: string;
    label: string;
    score: number;
    weight: number;
    contribution: 'positive' | 'neutral' | 'negative';
  }[];
  /** Specific evidence fields the bot examined */
  examinedFields: string[];
  /** Fields / signals that were unavailable or out of scope */
  notConsidered: string[];
  /** Model version used */
  modelVersion: string;
}

export interface MakerDecision {
  /** Who made the resolution */
  author: string;
  /** Whether it was a human analyst or an agentic bot */
  makerType: MakerType;
  /** The resolved status the maker proposed */
  status: MatchStatus;
  /** The risk level the maker proposed */
  riskLevel: RiskLevel;
  /** The maker's reason / rationale */
  reason: string;
  /** Optional comment */
  comment?: string;
  /** When the maker submitted the resolution */
  createdAt: string;
  /** Evidence trace for agentic makers */
  evidenceTrace?: AgenticEvidenceTrace;
}

/**
 * AI-generated suggestion attached to a match — recorded separately from the
 * analyst's own resolution so that provenance is auditable.
 */
export type AiSuggestionDisposition = 'pending' | 'accepted' | 'modified' | 'overridden';

export interface AiSuggestion {
  /** Suggested resolution status */
  suggestedStatus: MatchStatus;
  /** Suggested risk level */
  suggestedRisk: RiskLevel;
  /** Suggested match outcome */
  suggestedOutcome: 'Full Match' | 'Partial Match' | 'No Match' | 'Unknown';
  /** Composite 0-100 score at time of suggestion */
  compositeScore: number;
  /** Confidence 0-100 at time of suggestion */
  confidence: number;
  /** Snapshot of the factors that drove the suggestion */
  factorSnapshot: {
    fieldKey: string;
    label: string;
    score: number;
    weight: number;
    contribution: 'positive' | 'neutral' | 'negative';
  }[];
  /** Full generated narrative (audit reference) */
  narrative: string;
  /** Model identifier */
  modelVersion: string;
  /** When the suggestion was recorded */
  createdAt: string;
  /** How the analyst dispositioned it on save */
  disposition: AiSuggestionDisposition;
  /** True when the model abstained (insufficient evidence) */
  abstained?: boolean;
}

export interface CheckerReview {
  /** Checker's user name */
  author: string;
  /** The checker's decision */
  decision: CheckerDecision;
  /** Amended status (only when decision === 'Amended') */
  amendedStatus?: MatchStatus;
  /** Amended risk level (only when decision === 'Amended') */
  amendedRiskLevel?: RiskLevel;
  /** Mandatory rationale for the checker decision */
  reason: string;
  /** Optional comment */
  comment?: string;
  /** When the checker submitted their review */
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  ongoingFrequency: string;
}

export type ChangeMateriality = 'high' | 'medium' | 'low';
export type ChangeType =
  | 'listing_added'
  | 'listing_removed'
  | 'listing_amended'
  | 'identifier_added'
  | 'identifier_changed'
  | 'identifier_removed'
  | 'risk_escalation'
  | 'risk_de_escalation'
  | 'record_metadata'
  | 'cosmetic';

export interface ChangeLogEntry {
  field: string;
  from: string;
  to: string;
  changedAt: string;
  changeType?: ChangeType;
  materiality?: ChangeMateriality;
  /** Short plain-English compliance summary, e.g. "Now designated under EU 269/2014" */
  summary?: string;
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

export type AuditEventType = 'note' | 'assign' | 'move' | 'edit' | 'rescreen' | 'ogs_toggle' | 'archive' | 'status_change' | 'created' | 'checker_decision';

export interface AuditMatchDetail {
  matchId: string;
  matchedName: string;
  strength: number;
  status: MatchStatus;
  action: 'new' | 'updated' | 'auto_remediated' | 'no_change';
  dataset?: string;
}

export interface AuditEventDetails {
  matchesFound?: number;
  matchesUpdated?: number;
  matchesAutoRemediated?: number;
  matchDetails?: AuditMatchDetail[];
  previousValue?: string;
  newValue?: string;
  fieldChanged?: string;
}

export interface CaseAuditEvent {
  id: string;
  type: AuditEventType;
  author: string;
  text: string;
  comment?: string;
  details?: AuditEventDetails;
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
  ogsWorldCheck: boolean;
  ogsMediaCheck: boolean;
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
  inputValue?: string;
  matchedValue?: string;
}

export type NameScript = 'Latin' | 'Cyrillic' | 'Arabic' | 'CJK' | 'Other';

export interface NameMatchDetail {
  /** The exact matched string that produced the hit (may equal an alias) */
  matchedString: string;
  /** True when the hit was on an AKA/alias rather than the primary record name */
  isAlias: boolean;
  /** Which alias, when isAlias === true */
  aliasValue?: string;
  /** Similarity 0-100 for that specific matched string */
  similarity: number;
  /** Script of the matched string */
  script: NameScript;
  /** True when matched via transliteration to Latin */
  transliterated: boolean;
  /** True when name transposition (surname/given swap) was applied */
  transposition: boolean;
}

export type DesignationType = 'direct' | 'ownership' | 'control';

export interface ListingProvenance {
  /** Sanctioning body — OFAC, EU Council, UN, HM Treasury, etc. */
  sanctioningBody: string;
  /** Programme / regime label, e.g. "SDN — SDGT (EO 13224)", "EU 269/2014" */
  programme: string;
  listingDate?: string;
  delistingDate?: string;
  /** Direct designation vs derivative via ownership (OFAC 50% Rule) or control */
  designationType: DesignationType;
  /** For ownership/control, chain from listed root → this record */
  ownershipChain?: string[];
  /** Optional short compliance note (e.g. "51% owned by [X]") */
  note?: string;
}

export type ResolutionHistoryEntryType = 'human' | 'ai_suggestion';

export interface ResolutionHistoryEntry {
  id: string;
  status: MatchStatus;
  riskLevel: RiskLevel;
  reason: string;
  comment?: string;
  author: string;
  createdAt: string;
  /** Distinguishes AI suggestion entries from human decision entries */
  entryType?: ResolutionHistoryEntryType;
  /** For AI entries — confidence at time of suggestion */
  confidence?: number;
  /** For AI entries — composite score at time of suggestion */
  compositeScore?: number;
  /** For AI entries — the analyst disposition of this suggestion */
  disposition?: AiSuggestionDisposition;
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
  resolutionHistory: ResolutionHistoryEntry[];
  // Evidence enrichments (Stage 2)
  nameMatchDetail?: NameMatchDetail;
  listingProvenance?: ListingProvenance;
  // Maker-Checker workflow
  makerDecision?: MakerDecision;
  checkerReview?: CheckerReview;
  pendingCheckerReview: boolean;
  /** Stage 3 — AI suggestion recorded on this match, if any */
  aiSuggestion?: AiSuggestion;
}

export interface ScreeningConfig {
  groupId: string;
  mode: ScreeningMode;
  entityType: EntityType;
  checkTypes: CheckType[];
  ogsWorldCheck: boolean;
  ogsMediaCheck: boolean;
}

export interface IdentificationDocument {
  type: string;
  number: string;
  country: string;
}

export interface ScreeningData {
  name: string;
  nameTransposition: boolean;
  caseId: string;
  autoGenerateId: boolean;
  dob: string;
  gender: string;
  nationalities: string[];
  countries: string[];
  placeOfBirth: string[];
  idType: string;
  idNumber: string;
  identificationDocuments: IdentificationDocument[];
  imoNumber: string;
}

// --- Media Check Types ---

export type MediaPrePost = 'Pre-conviction' | 'Post-conviction' | 'Allegation';

export interface MediaArticle {
  id: string;
  caseId: string;
  headline: string;
  publication: string;
  publishedDate: string;
  publishedTime?: string;
  wordCount: number;
  snippet: string;
  fullText: string;
  topics: string[];
  countries: string[];
  matchedEntity: string;
  riskLevel: MediaRiskLevel;
  riskReason: string;
  prePost: MediaPrePost;
  attached: boolean;
  visited: boolean;
  smartFilterRelevant: boolean;
  highlightedTerms: string[];
  sourceType: string;
}

export interface MediaSecondaryId {
  label: string;
  value: string;
  result: MatchFieldResult;
}

export interface MediaMatch {
  id: string;
  caseId: string;
  matchedName: string;
  aliases: string[];
  secondaryIds: MediaSecondaryId[];
  articleIds: string[];
  status: MatchStatus;
  riskLevel: RiskLevel;
  reason: string;
  strength: number;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  reviewRequired: boolean;
  updated: boolean;
  alertDate: string;
}

export interface MediaCheckResult {
  caseId: string;
  entityName: string;
  totalArticles: number;
  reviewRequired: number;
  attachedCount: number;
  matchedEntities: { name: string; count: number }[];
  mediaMatches: MediaMatch[];
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
