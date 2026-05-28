export type RiskLevel = "low" | "medium" | "high";
export type ConflictLevel = "none" | RiskLevel;
export type SectionStatus =
  | "auto_selected"
  | "needs_review"
  | "approved"
  | "overridden";

export type PlanMergeProject = {
  title: string;
  goal: string;
  documentType: "service_plan" | "prd" | "business_plan" | "feature_spec";
  contextPack: string;
  forbiddenDirections: string;
  outputStyle: string;
};

export type DocumentSection = {
  sectionKey: string;
  title: string;
  description: string;
  sortOrder: number;
};

export type DraftSubmissionInput = {
  draftId: string;
  authorName: string;
  authorRole: string;
  aiModel: string;
  taskTitle: string;
  rawText: string;
};

export type AnalyzeRequest = {
  project: PlanMergeProject;
  sections: DocumentSection[];
  drafts: DraftSubmissionInput[];
};

export type ComparisonScores = {
  goalFit: number;
  userValue: number;
  mvpFeasibility: number;
  scopeControl: number;
  riskReduction: number;
  validationSpeed: number;
  total: number;
};

export type ComparisonOptionType =
  | "selected"
  | "same_direction"
  | "compatible_alternative"
  | "tradeoff"
  | "direct_conflict"
  | "out_of_scope";

export type ComparisonOption = {
  id: string;
  optionType: ComparisonOptionType;
  label: string;
  summary: string;
  content: string;
  differenceFromSelected: string;
  strengths: string[];
  weaknesses: string[];
  scopeImpact: string[];
  riskLevel: RiskLevel;
  aiRecommendation:
    | "select"
    | "keep_as_alternative"
    | "defer"
    | "reject_for_mvp"
    | "needs_human_decision";
  scores: ComparisonScores;
  sourceIdeaIds: string[];
  sourceExcerpts: string[];
  conflictsWith: string;
  conflictReason: string;
  decisionQuestion: string;
};

export type ComparisonGroup = {
  id: string;
  sectionKey: string;
  sectionTitle: string;
  topic: string;
  decisionQuestion: string;
  aiConclusion: string;
  keyDifferenceSummary: string;
  humanDecisionQuestion: string;
  selectedOptionId: string;
  needsHumanReview: boolean;
  conflictLevel: ConflictLevel;
  confidence: number;
  options: ComparisonOption[];
};

export type FinalDocumentSection = {
  sectionId: string;
  sectionKey: string;
  title: string;
  content: string;
  sortOrder: number;
  status: SectionStatus;
  confidence: number;
  conflictLevel: ConflictLevel;
  alternativeCount: number;
  conflictCount: number;
};

export type AnalyzeResponse = {
  summary: {
    text: string;
    sectionCount: number;
    autoSelectedCount: number;
    needsReviewCount: number;
    conflictCount: number;
    overallRiskLevel: RiskLevel;
  };
  finalDocument: {
    title: string;
    sections: FinalDocumentSection[];
  };
  comparisonGroups: ComparisonGroup[];
  usedMock?: boolean;
  apiError?: string;
};
