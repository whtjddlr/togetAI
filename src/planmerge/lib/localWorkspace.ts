import { validatePlanMergeAnalysis } from './ai/planmergeProtocol';
import type { PlanMergeAnalysisResult } from './ai/planmergeProtocol';

export type ProjectSettings = {
  title: string;
  goal: string;
  documentType: 'service_plan' | 'prd' | 'business_plan' | 'feature_spec';
  contextPack: string;
  forbiddenDirection: string;
  outputStyle: string;
};

export type LocalDraftStatus = 'submitted' | 'parsed' | 'failed';

export type LocalDraftSubmission = {
  id: string;
  authorName: string;
  authorRole: string;
  aiModel: 'ChatGPT' | 'Claude' | 'Gemini' | 'Cursor' | 'Other';
  taskTitle: string;
  rawText: string;
  status: LocalDraftStatus;
  createdAtLabel: string;
};

export type DraftFormInput = Omit<LocalDraftSubmission, 'id' | 'status' | 'createdAtLabel'>;

export type LocalDecisionLog = {
  id: string;
  analysisRunId: number;
  decisionBlockId: string;
  sectionKey: string;
  sectionTitle: string;
  topic: string;
  action: 'selected_option_overridden';
  beforeOptionId?: string;
  beforeValue?: string;
  afterOptionId: string;
  afterValue: string;
  reason: string;
  createdAtLabel: string;
};

export type LocalWorkspaceState = {
  analysisRunId: number;
  project: ProjectSettings;
  drafts: LocalDraftSubmission[];
  analysisResult?: PlanMergeAnalysisResult;
  decisionLogs: LocalDecisionLog[];
};

const WORKSPACE_STORAGE_KEY = 'planmerge_workspace_v1';
const WORKSPACE_EXPORT_SCHEMA_VERSION = 'planmerge.workspace.v1';

export const defaultProjectSettings: ProjectSettings = {
  title: 'AI 공동 기획서 병합 도구',
  goal: '여러 사람이 각자 AI로 만든 기획서 초안을 하나의 문서로 병합한다.',
  documentType: 'service_plan',
  contextPack: 'MVP는 2주 안에 만들 수 있어야 한다. 초기에는 텍스트 붙여넣기 기반으로 한다.',
  forbiddenDirection: '초기 MVP에 실시간 공동 편집, 외부 문서 연동, 팀 초대를 포함하지 않는다.',
  outputStyle: '노션처럼 간결하고 읽기 쉬운 서비스 기획서 톤',
};

export const defaultDrafts: LocalDraftSubmission[] = [
  {
    id: 'sample-draft-1',
    authorName: '민수',
    authorRole: 'PM',
    aiModel: 'ChatGPT',
    taskTitle: '문제 정의',
    rawText: '여러 사람이 AI로 기획서를 작성하면 중복, 충돌, 누락이 발생한다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-2',
    authorName: '지현',
    authorRole: 'Designer',
    aiModel: 'Claude',
    taskTitle: 'MVP 범위',
    rawText: 'MVP는 텍스트 붙여넣기와 병합 리포트 생성에 집중한다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-3',
    authorName: '현우',
    authorRole: 'Developer',
    aiModel: 'Gemini',
    taskTitle: '리스크',
    rawText: 'AI 판단에는 출처 추적과 충돌 표시가 반드시 필요하다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
];

export const defaultWorkspaceState: LocalWorkspaceState = {
  analysisRunId: 0,
  project: defaultProjectSettings,
  drafts: defaultDrafts,
  decisionLogs: [],
};

type WorkspaceExportFile = {
  schemaVersion: typeof WORKSPACE_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  workspace: LocalWorkspaceState;
};

type WorkspaceImportResult =
  | {
    valid: true;
    state: LocalWorkspaceState;
    warnings: string[];
    errors: [];
  }
  | {
    valid: false;
    errors: string[];
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidProjectSettings(value: unknown): value is ProjectSettings {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.goal === 'string' &&
    typeof value.documentType === 'string' &&
    ['service_plan', 'prd', 'business_plan', 'feature_spec'].includes(value.documentType) &&
    typeof value.contextPack === 'string' &&
    typeof value.forbiddenDirection === 'string' &&
    typeof value.outputStyle === 'string'
  );
}

function isValidDraft(value: unknown): value is LocalDraftSubmission {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.authorName === 'string' &&
    typeof value.authorRole === 'string' &&
    ['ChatGPT', 'Claude', 'Gemini', 'Cursor', 'Other'].includes(String(value.aiModel)) &&
    typeof value.taskTitle === 'string' &&
    typeof value.rawText === 'string' &&
    ['submitted', 'parsed', 'failed'].includes(String(value.status)) &&
    typeof value.createdAtLabel === 'string'
  );
}

function isValidDecisionLog(value: unknown): value is LocalDecisionLog {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.decisionBlockId === 'string' &&
    typeof value.sectionKey === 'string' &&
    typeof value.sectionTitle === 'string' &&
    typeof value.topic === 'string' &&
    value.action === 'selected_option_overridden' &&
    typeof value.afterOptionId === 'string' &&
    typeof value.afterValue === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.createdAtLabel === 'string'
  );
}

function sanitizeProjectSettings(value: unknown): ProjectSettings {
  if (!isRecord(value)) {
    return defaultProjectSettings;
  }

  return {
    title: typeof value.title === 'string' ? value.title : defaultProjectSettings.title,
    goal: typeof value.goal === 'string' ? value.goal : defaultProjectSettings.goal,
    documentType: ['service_plan', 'prd', 'business_plan', 'feature_spec'].includes(String(value.documentType))
      ? value.documentType as ProjectSettings['documentType']
      : defaultProjectSettings.documentType,
    contextPack: typeof value.contextPack === 'string' ? value.contextPack : defaultProjectSettings.contextPack,
    forbiddenDirection: typeof value.forbiddenDirection === 'string'
      ? value.forbiddenDirection
      : defaultProjectSettings.forbiddenDirection,
    outputStyle: typeof value.outputStyle === 'string' ? value.outputStyle : defaultProjectSettings.outputStyle,
  };
}

// 손상된 analysisResult가 저장/가져오기 경로로 들어오면 렌더 크래시가 반복되므로
// 구조 검증을 통과한 경우에만 유지한다.
function sanitizeAnalysisResult(
  value: unknown,
  project: ProjectSettings,
  drafts: LocalDraftSubmission[],
): PlanMergeAnalysisResult | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const validation = validatePlanMergeAnalysis({ project, drafts }, value);

  return validation.valid ? value as unknown as PlanMergeAnalysisResult : undefined;
}

export function createDraftSubmission(input: DraftFormInput, existingDraftCount: number): LocalDraftSubmission {
  return {
    ...input,
    // 개수 기반 ID는 삭제 후 추가 시 중복돼 다른 초안까지 함께 삭제된다.
    id: `local-draft-${crypto.randomUUID()}`,
    authorName: input.authorName.trim() || `작성자 ${existingDraftCount + 1}`,
    authorRole: input.authorRole.trim() || 'Other',
    taskTitle: input.taskTitle.trim() || '추가 초안',
    rawText: input.rawText.trim(),
    status: 'submitted',
    createdAtLabel: '방금',
  };
}

export function loadWorkspaceState(): LocalWorkspaceState {
  if (typeof window === 'undefined') {
    return defaultWorkspaceState;
  }

  const rawState = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (!rawState) {
    return defaultWorkspaceState;
  }

  try {
    const parsedState = JSON.parse(rawState) as Partial<LocalWorkspaceState>;
    const analysisRunId = typeof parsedState.analysisRunId === 'number' && Number.isFinite(parsedState.analysisRunId)
      ? parsedState.analysisRunId
      : 0;
    const project = sanitizeProjectSettings(parsedState.project);
    const storedDrafts = Array.isArray(parsedState.drafts)
      ? parsedState.drafts.filter(isValidDraft)
      : [];
    const drafts = storedDrafts.length ? storedDrafts : defaultDrafts;

    return {
      analysisRunId,
      project,
      drafts,
      analysisResult: sanitizeAnalysisResult(parsedState.analysisResult, project, drafts),
      decisionLogs: (Array.isArray(parsedState.decisionLogs) ? parsedState.decisionLogs : [])
        .filter(isValidDecisionLog)
        .map((log) => ({
          ...log,
          analysisRunId: log.analysisRunId ?? analysisRunId,
        })),
    };
  } catch {
    return defaultWorkspaceState;
  }
}

export function saveWorkspaceState(state: LocalWorkspaceState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

export function createWorkspaceExport(state: LocalWorkspaceState) {
  const exportFile: WorkspaceExportFile = {
    schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workspace: state,
  };

  return JSON.stringify(exportFile, null, 2);
}

export function parseWorkspaceImport(rawText: string): WorkspaceImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      valid: false,
      errors: ['파일이 올바른 JSON 형식이 아닙니다.'],
    };
  }

  if (!isRecord(parsed)) {
    return {
      valid: false,
      errors: ['가져오기 파일은 객체여야 합니다.'],
    };
  }

  const workspace = parsed.schemaVersion === WORKSPACE_EXPORT_SCHEMA_VERSION
    ? parsed.workspace
    : parsed;

  if (!isRecord(workspace)) {
    return {
      valid: false,
      errors: ['워크스페이스 데이터가 없습니다.'],
    };
  }

  const warnings: string[] = [];
  const project = isValidProjectSettings(workspace.project)
    ? workspace.project
    : defaultProjectSettings;
  const drafts = Array.isArray(workspace.drafts)
    ? workspace.drafts.filter(isValidDraft)
    : [];
  const decisionLogs = Array.isArray(workspace.decisionLogs)
    ? workspace.decisionLogs.filter(isValidDecisionLog)
    : [];
  const analysisRunId = typeof workspace.analysisRunId === 'number' && Number.isFinite(workspace.analysisRunId)
    ? workspace.analysisRunId
    : 0;

  if (!isValidProjectSettings(workspace.project)) {
    warnings.push('프로젝트 설정이 없거나 형식이 맞지 않아 기본값으로 대체했습니다.');
  }

  if (!Array.isArray(workspace.drafts)) {
    warnings.push('초안 목록이 없어 샘플 초안으로 대체했습니다.');
  } else if (drafts.length !== workspace.drafts.length) {
    warnings.push('형식이 맞지 않는 초안 일부를 제외했습니다.');
  }

  if (Array.isArray(workspace.decisionLogs) && decisionLogs.length !== workspace.decisionLogs.length) {
    warnings.push('형식이 맞지 않는 Decision Log 일부를 제외했습니다.');
  }

  const resolvedDrafts = drafts.length ? drafts : defaultDrafts;
  const analysisResult = sanitizeAnalysisResult(workspace.analysisResult, project, resolvedDrafts);

  if (workspace.analysisResult !== undefined && !analysisResult) {
    warnings.push('분석 결과가 형식 검증에 실패해 제외했습니다. 다시 분석을 실행해 주세요.');
  }

  return {
    valid: true,
    state: {
      analysisRunId,
      project,
      drafts: resolvedDrafts,
      analysisResult,
      decisionLogs: decisionLogs.map((log) => ({
        ...log,
        analysisRunId: log.analysisRunId ?? analysisRunId,
      })),
    },
    warnings,
    errors: [],
  };
}
