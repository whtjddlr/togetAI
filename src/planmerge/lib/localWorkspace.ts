import { runLocalPlanMergeHarness, validatePlanMergeAnalysis } from './ai/planmergeProtocol';
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
  title: '',
  goal: '',
  documentType: 'service_plan',
  contextPack: '',
  forbiddenDirection: '',
  outputStyle: '',
};

export const sampleProjectSettings: ProjectSettings = {
  title: '회의록 기반 액션아이템 정리 SaaS',
  goal: '회의록, 음성 요약, 메신저 대화에서 액션아이템을 추출해 담당자와 마감일 기준으로 정리하는 B2B SaaS 기획서를 만든다.',
  documentType: 'service_plan',
  contextPack: 'MVP는 4주 안에 검증 가능해야 한다. 초기에는 회의록 텍스트 붙여넣기, 액션아이템 추출, 담당자/마감일 확인, 내보내기까지 포함한다.',
  forbiddenDirection: '초기 MVP에 실시간 회의 녹음, 캘린더 양방향 동기화, Slack/Notion 연동까지 포함하지 않는다.',
  outputStyle: 'B2B SaaS 의사결정 문서처럼 간결하고 검증 기준이 분명한 톤',
};

export const sampleDrafts: LocalDraftSubmission[] = [
  {
    id: 'sample-draft-overview',
    authorName: '서연',
    authorRole: 'PM',
    aiModel: 'ChatGPT',
    taskTitle: '서비스 개요',
    rawText: '서비스 개요: 회의록 기반 액션아이템 정리 SaaS는 회의 후 흩어지는 할 일, 담당자, 마감일을 한 화면에서 정리해 후속 실행률을 높이는 업무 도구다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-problem',
    authorName: '민수',
    authorRole: 'PM',
    aiModel: 'Claude',
    taskTitle: '문제 정의',
    rawText: '문제 정의: 회의가 끝난 뒤 결정사항과 액션아이템이 회의록, 메신저, 개인 메모에 흩어져 누락된다. 특히 담당자와 마감일이 불명확하면 다음 회의에서 같은 논의를 반복한다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-target',
    authorName: '지현',
    authorRole: 'Designer',
    aiModel: 'Gemini',
    taskTitle: '타깃 사용자',
    rawText: '타깃 사용자: 주 5회 이상 회의를 진행하는 5~30인 규모 스타트업 팀의 PM, 팀 리드, 오퍼레이션 매니저를 초기 고객으로 둔다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-pain',
    authorName: '도윤',
    authorRole: 'Marketer',
    aiModel: 'Other',
    taskTitle: '사용자 Pain Point',
    rawText: '사용자 Pain Point: 회의록을 다시 읽는 시간이 길고, 누가 무엇을 해야 하는지 확인하기 어렵다. 액션아이템을 별도 툴에 옮기는 반복 작업 때문에 실행 관리가 늦어진다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-solution',
    authorName: '서연',
    authorRole: 'PM',
    aiModel: 'ChatGPT',
    taskTitle: '솔루션',
    rawText: '솔루션: 사용자가 회의록을 붙여넣으면 AI가 결정사항, 액션아이템, 담당자 후보, 마감일 후보를 추출하고 사용자가 확인한 뒤 공유 가능한 정리본으로 내보낸다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-features',
    authorName: '현우',
    authorRole: 'Developer',
    aiModel: 'Cursor',
    taskTitle: '핵심 기능',
    rawText: '핵심 기능: 회의록 텍스트 붙여넣기, 액션아이템 자동 추출, 담당자/마감일 후보 표시, 사람 검토 체크, Markdown 내보내기, 추출 근거 문장 하이라이트가 필요하다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-mvp-selected',
    authorName: '현우',
    authorRole: 'Developer',
    aiModel: 'Claude',
    taskTitle: 'MVP 범위',
    rawText: 'MVP 범위: 4주 안에는 텍스트 붙여넣기, 액션아이템 추출, 담당자/마감일 확인, 결과 내보내기까지만 포함한다. 인증, 결제, 외부 연동은 검증 이후로 미룬다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-mvp-conflict',
    authorName: '나연',
    authorRole: 'Sales',
    aiModel: 'Gemini',
    taskTitle: 'MVP 범위',
    rawText: 'MVP 범위: 고객 데모 설득력을 위해 Slack 연동과 Notion 연동까지 포함해야 한다. 회의 후 바로 쓰는 제품처럼 보이려면 외부 문서 도구 연동까지 필요하다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-flow',
    authorName: '지현',
    authorRole: 'Designer',
    aiModel: 'Claude',
    taskTitle: '사용자 플로우',
    rawText: '사용자 플로우: 프로젝트 생성 후 회의록 붙여넣기, AI 추출 실행, 액션아이템 후보 검토, 담당자/마감일 수정, 승인, Markdown 또는 CSV 내보내기 순서로 진행한다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-requirements',
    authorName: '현우',
    authorRole: 'Developer',
    aiModel: 'Cursor',
    taskTitle: '요구사항',
    rawText: '요구사항: 모든 액션아이템은 원문 근거 문장과 연결되어야 한다. 담당자와 마감일은 AI가 확정하지 않고 후보로 표시해야 하며, 사용자가 승인한 항목만 최종 결과에 포함해야 한다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-metrics',
    authorName: '도윤',
    authorRole: 'Marketer',
    aiModel: 'ChatGPT',
    taskTitle: '성공 지표',
    rawText: '성공 지표: 회의록 정리 시간이 50% 이상 줄어드는지, 추출된 액션아이템 중 사용자가 승인한 비율이 70% 이상인지, 다음 회의 전 완료율이 개선되는지 측정한다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-risks',
    authorName: '서연',
    authorRole: 'PM',
    aiModel: 'Claude',
    taskTitle: '리스크',
    rawText: '리스크: AI가 회의록에 없는 담당자나 마감일을 확정하면 신뢰가 깨진다. 따라서 출처 문장 연결, 후보 표시, 사용자 승인 로그가 반드시 필요하다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
  {
    id: 'sample-draft-open',
    authorName: '나연',
    authorRole: 'Sales',
    aiModel: 'Other',
    taskTitle: '미결정 사항',
    rawText: '미결정 사항: 초기 고객을 PM 조직으로 좁힐지, 세일즈/CS 팀까지 포함할지 논의가 필요하다. CSV 내보내기를 MVP에 넣을지도 고객 인터뷰 후 결정해야 한다.',
    status: 'parsed',
    createdAtLabel: '샘플',
  },
];

export const defaultWorkspaceState: LocalWorkspaceState = {
  analysisRunId: 0,
  project: defaultProjectSettings,
  drafts: [],
  decisionLogs: [],
};

export function createSampleWorkspaceState(): LocalWorkspaceState {
  const drafts = sampleDrafts.map((draft) => ({ ...draft }));

  return {
    analysisRunId: 1,
    project: sampleProjectSettings,
    drafts,
    analysisResult: runLocalPlanMergeHarness({
      project: sampleProjectSettings,
      drafts,
    }),
    decisionLogs: [],
  };
}

export function isSampleWorkspaceState(state: LocalWorkspaceState) {
  const sampleDraftIds = new Set(sampleDrafts.map((draft) => draft.id));

  return (
    state.project.title === sampleProjectSettings.title &&
    state.drafts.length === sampleDrafts.length &&
    state.drafts.every((draft) => sampleDraftIds.has(draft.id))
  );
}

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

    return {
      analysisRunId,
      project,
      drafts: storedDrafts,
      analysisResult: sanitizeAnalysisResult(parsedState.analysisResult, project, storedDrafts),
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

  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // 대용량 초안으로 QuotaExceededError가 나도 앱은 계속 동작해야 한다.
    console.warn('워크스페이스 저장에 실패했습니다:', error);
  }
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
    warnings.push('초안 목록이 없어 빈 초안 목록으로 대체했습니다.');
  } else if (drafts.length !== workspace.drafts.length) {
    warnings.push('형식이 맞지 않는 초안 일부를 제외했습니다.');
  }

  if (Array.isArray(workspace.decisionLogs) && decisionLogs.length !== workspace.decisionLogs.length) {
    warnings.push('형식이 맞지 않는 Decision Log 일부를 제외했습니다.');
  }

  const analysisResult = sanitizeAnalysisResult(workspace.analysisResult, project, drafts);

  if (workspace.analysisResult !== undefined && !analysisResult) {
    warnings.push('분석 결과가 형식 검증에 실패해 제외했습니다. 다시 분석을 실행해 주세요.');
  }

  return {
    valid: true,
    state: {
      analysisRunId,
      project,
      drafts,
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
