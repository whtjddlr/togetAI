import type { AnonymousOpinion } from '../data/mergeResult';
import { parseWorkspaceImport, type LocalDraftSubmission, type LocalWorkspaceState } from './localWorkspace';

export type SharedParticipation = {
  votes: Record<string, number>;
  myOptionId?: string;
  opinions: AnonymousOpinion[];
};

export type SharedWorkspaceLoadResult = {
  state: LocalWorkspaceState;
  snapshotVersion: number;
  warnings: string[];
};

export type SharedWorkspaceCreateResult = {
  id: string;
  manageToken: string;
  snapshotVersion: number;
  expiresAt: string;
};

export type SharedWorkspaceUpdateResult = {
  id: string;
  snapshotVersion: number;
  expiresAt: string;
};

export type MySharedWorkspaceSummary = {
  id: string;
  title: string;
  snapshotVersion: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  participation: {
    totalVoters: number;
    totalOpinions: number;
  };
};

export type SharedWorkspaceDraft = {
  id: string;
  authorName: string;
  aiModel: LocalDraftSubmission['aiModel'];
  taskTitle: string;
  rawText: string;
  createdAt: string;
};

export type SharedDraftSubmitInput = {
  authorName: string;
  aiModel: LocalDraftSubmission['aiModel'];
  taskTitle: string;
  rawText: string;
  anonymousKey: string;
};

export type SharedDraftSubmitResult = {
  id: string;
  createdAt: string;
};

export type SharedDraftStatus = 'imported' | 'dismissed';

export type SharedDraftStatusUpdateInput = {
  status: SharedDraftStatus;
  manageToken?: string;
  anonymousKey?: string;
};

type SharedWorkspaceRequestErrorOptions = {
  status?: number;
  retryAfter?: string;
};

export const SHARED_LINK_UNAVAILABLE_MESSAGE = '공유 링크가 만료되었거나 회수되었습니다.';
export const SHARED_RATE_LIMIT_MESSAGE = '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.';
export const SHARED_PARTICIPATION_FAILED_MESSAGE = '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
export const SHARED_DRAFT_FAILED_MESSAGE = '초안 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';

export class SharedWorkspaceRequestError extends Error {
  readonly status?: number;
  readonly retryAfter?: string;

  constructor(message: string, options: SharedWorkspaceRequestErrorOptions = {}) {
    super(message);
    this.name = 'SharedWorkspaceRequestError';

    if (options.status !== undefined) {
      this.status = options.status;
    }

    if (options.retryAfter !== undefined) {
      this.retryAfter = options.retryAfter;
    }
  }
}

type ParticipationResponse = {
  votes?: Record<string, number>;
  myOptionId?: string | null;
  opinions?: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
};

const sharedAiModels = new Set<LocalDraftSubmission['aiModel']>([
  'ChatGPT',
  'Claude',
  'Gemini',
  'Cursor',
  'Other',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSharedAiModel(value: unknown): value is LocalDraftSubmission['aiModel'] {
  return typeof value === 'string' && sharedAiModels.has(value as LocalDraftSubmission['aiModel']);
}

function readPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

function readNonNegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function readNullableString(value: unknown) {
  return typeof value === 'string' || value === null ? value : undefined;
}

function toSharedWorkspaceDraft(value: unknown): SharedWorkspaceDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.authorName !== 'string' ||
    !isSharedAiModel(value.aiModel) ||
    typeof value.taskTitle !== 'string' ||
    typeof value.rawText !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    authorName: value.authorName,
    aiModel: value.aiModel,
    taskTitle: value.taskTitle,
    rawText: value.rawText,
    createdAt: value.createdAt,
  };
}

function toMySharedWorkspaceSummary(value: unknown): MySharedWorkspaceSummary | null {
  if (!isRecord(value) || !isRecord(value.participation)) {
    return null;
  }

  const snapshotVersion = readPositiveInteger(value.snapshotVersion);
  const totalVoters = readNonNegativeInteger(value.participation.totalVoters);
  const totalOpinions = readNonNegativeInteger(value.participation.totalOpinions);
  const expiresAt = readNullableString(value.expiresAt);
  const revokedAt = readNullableString(value.revokedAt);

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !snapshotVersion ||
    expiresAt === undefined ||
    revokedAt === undefined ||
    typeof value.createdAt !== 'string' ||
    totalVoters === undefined ||
    totalOpinions === undefined
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    snapshotVersion,
    expiresAt,
    revokedAt,
    createdAt: value.createdAt,
    participation: {
      totalVoters,
      totalOpinions,
    },
  };
}

function formatCreatedAtLabel(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

function toParticipation(data: ParticipationResponse): SharedParticipation {
  return {
    votes: data.votes ?? {},
    myOptionId: data.myOptionId ?? undefined,
    opinions: (data.opinions ?? []).map((opinion) => ({
      id: opinion.id,
      content: opinion.content,
      createdAtLabel: formatCreatedAtLabel(opinion.createdAt),
    })),
  };
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json() as { errors?: unknown };

    return Array.isArray(data.errors) && typeof data.errors[0] === 'string'
      ? data.errors[0]
      : fallback;
  } catch {
    return fallback;
  }
}

async function readSharedLinkUnavailableMessage(response: Response) {
  const message = await readErrorMessage(response, SHARED_LINK_UNAVAILABLE_MESSAGE);

  return message === SHARED_LINK_UNAVAILABLE_MESSAGE
    ? message
    : SHARED_LINK_UNAVAILABLE_MESSAGE;
}

async function fetchParticipationResponse(url: string, init?: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    throw new SharedWorkspaceRequestError(SHARED_PARTICIPATION_FAILED_MESSAGE);
  }
}

async function fetchSharedDraftResponse(url: string, init?: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    throw new SharedWorkspaceRequestError(SHARED_DRAFT_FAILED_MESSAGE);
  }
}

function getRetryAfter(response: Response) {
  return response.headers.get('Retry-After') ?? undefined;
}

async function throwIfSharedParticipationFailed(response: Response) {
  if (response.ok) {
    return;
  }

  if (response.status === 429) {
    const retryAfter = getRetryAfter(response);

    throw new SharedWorkspaceRequestError(SHARED_RATE_LIMIT_MESSAGE, {
      status: response.status,
      ...(retryAfter !== undefined ? { retryAfter } : {}),
    });
  }

  if (response.status === 410) {
    throw new SharedWorkspaceRequestError(SHARED_LINK_UNAVAILABLE_MESSAGE, {
      status: response.status,
    });
  }

  if (response.status === 409) {
    throw new SharedWorkspaceRequestError(
      await readErrorMessage(response, SHARED_PARTICIPATION_FAILED_MESSAGE),
      { status: response.status },
    );
  }

  throw new SharedWorkspaceRequestError(SHARED_PARTICIPATION_FAILED_MESSAGE, {
    status: response.status,
  });
}

async function throwIfSharedDraftFailed(response: Response, fallback: string = SHARED_DRAFT_FAILED_MESSAGE) {
  if (response.ok) {
    return;
  }

  if (response.status === 429) {
    const retryAfter = getRetryAfter(response);

    throw new SharedWorkspaceRequestError(SHARED_RATE_LIMIT_MESSAGE, {
      status: response.status,
      ...(retryAfter !== undefined ? { retryAfter } : {}),
    });
  }

  if (response.status === 410) {
    throw new SharedWorkspaceRequestError(SHARED_LINK_UNAVAILABLE_MESSAGE, {
      status: response.status,
    });
  }

  throw new SharedWorkspaceRequestError(await readErrorMessage(response, fallback), {
    status: response.status,
  });
}

async function readParticipation(response: Response) {
  await throwIfSharedParticipationFailed(response);

  try {
    return toParticipation(await response.json() as ParticipationResponse);
  } catch {
    throw new SharedWorkspaceRequestError(SHARED_PARTICIPATION_FAILED_MESSAGE, {
      status: response.status,
    });
  }
}

export async function createSharedWorkspace(exportJson: string): Promise<SharedWorkspaceCreateResult> {
  const response = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: exportJson,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '공유 링크 생성에 실패했습니다.'));
  }

  const data = await response.json() as {
    id?: string;
    manageToken?: string;
    snapshotVersion?: unknown;
    expiresAt?: string;
  };

  if (!data.id || !data.manageToken || !data.expiresAt) {
    throw new Error('공유 링크 생성 응답이 올바르지 않습니다.');
  }

  return {
    id: data.id,
    manageToken: data.manageToken,
    snapshotVersion: readPositiveInteger(data.snapshotVersion) ?? 1,
    expiresAt: data.expiresAt,
  };
}

export async function updateSharedWorkspace(
  workspaceId: string,
  manageToken: string | undefined,
  exportJson: string,
): Promise<SharedWorkspaceUpdateResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const normalizedManageToken = manageToken?.trim();

  if (normalizedManageToken) {
    headers['x-manage-token'] = normalizedManageToken;
  }

  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: 'PUT',
    headers,
    body: exportJson,
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, '공유 링크 갱신에 실패했습니다.');
    const retryAfter = getRetryAfter(response);

    throw new SharedWorkspaceRequestError(message, {
      status: response.status,
      ...(response.status === 429 && retryAfter !== undefined ? { retryAfter } : {}),
    });
  }

  const data = await response.json() as {
    id?: unknown;
    snapshotVersion?: unknown;
    expiresAt?: unknown;
  };
  const snapshotVersion = readPositiveInteger(data.snapshotVersion);

  if (typeof data.id !== 'string' || !snapshotVersion || typeof data.expiresAt !== 'string') {
    throw new SharedWorkspaceRequestError('공유 링크 갱신 응답이 올바르지 않습니다.', {
      status: response.status,
    });
  }

  return {
    id: data.id,
    snapshotVersion,
    expiresAt: data.expiresAt,
  };
}

export async function revokeSharedWorkspace(workspaceId: string, manageToken?: string): Promise<void> {
  const normalizedManageToken = manageToken?.trim();
  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: 'DELETE',
    ...(normalizedManageToken ? { headers: { 'x-manage-token': normalizedManageToken } } : {}),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '공유 링크 회수에 실패했습니다.'));
  }

  const data = await response.json() as { revoked?: boolean };

  if (data.revoked !== true) {
    throw new Error('공유 링크 회수 응답이 올바르지 않습니다.');
  }
}

export async function fetchMyWorkspaces(): Promise<MySharedWorkspaceSummary[]> {
  let response: Response;

  try {
    response = await fetch('/api/my-workspaces');
  } catch {
    throw new SharedWorkspaceRequestError('내 공유 링크 목록을 불러오지 못했습니다.');
  }

  if (!response.ok) {
    const retryAfter = getRetryAfter(response);

    throw new SharedWorkspaceRequestError(
      await readErrorMessage(response, '내 공유 링크 목록을 불러오지 못했습니다.'),
      {
        status: response.status,
        ...(response.status === 429 && retryAfter !== undefined ? { retryAfter } : {}),
      },
    );
  }

  try {
    const data = await response.json() as { workspaces?: unknown };

    if (!Array.isArray(data.workspaces)) {
      throw new Error('my workspaces response is missing workspaces');
    }

    const workspaces = data.workspaces.map(toMySharedWorkspaceSummary);

    if (workspaces.some((workspace) => workspace === null)) {
      throw new Error('my workspaces response contains invalid workspace');
    }

    return workspaces.filter((workspace): workspace is MySharedWorkspaceSummary => workspace !== null);
  } catch {
    throw new SharedWorkspaceRequestError('내 공유 링크 목록 응답이 올바르지 않습니다.', {
      status: response.status,
    });
  }
}

export async function fetchSharedWorkspace(workspaceId: string): Promise<SharedWorkspaceLoadResult | null> {
  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`).catch(() => null);

  if (response?.status === 410) {
    throw new Error(await readSharedLinkUnavailableMessage(response));
  }

  if (!response?.ok) {
    return null;
  }

  let data: { snapshotVersion?: unknown; workspace?: unknown };

  try {
    data = await response.json() as { snapshotVersion?: unknown; workspace?: unknown };
  } catch {
    return null;
  }

  if (data.workspace === undefined) {
    return null;
  }

  try {
    const rawWorkspace = JSON.stringify(data.workspace);

    if (!rawWorkspace) {
      throw new Error('invalid shared workspace payload');
    }

    const parsed = parseWorkspaceImport(rawWorkspace);

    if (parsed.valid) {
      return {
        state: parsed.state,
        snapshotVersion: readPositiveInteger(data.snapshotVersion) ?? 1,
        warnings: parsed.warnings,
      };
    }
  } catch {
    // Fall through to the validation error below.
  }

  throw new Error('공유 워크스페이스 데이터가 검증에 실패했습니다.');
}

export async function submitSharedDraft(
  workspaceId: string,
  draft: SharedDraftSubmitInput,
): Promise<SharedDraftSubmitResult> {
  const response = await fetchSharedDraftResponse(`/api/workspaces/${encodeURIComponent(workspaceId)}/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });

  await throwIfSharedDraftFailed(response);

  try {
    const data = await response.json() as { id?: unknown; createdAt?: unknown };

    if (typeof data.id === 'string' && typeof data.createdAt === 'string') {
      return {
        id: data.id,
        createdAt: data.createdAt,
      };
    }
  } catch {
    // Fall through to the typed error below.
  }

  throw new SharedWorkspaceRequestError('초안 제출 응답이 올바르지 않습니다.', {
    status: response.status,
  });
}

export async function fetchSharedDrafts(workspaceId: string): Promise<SharedWorkspaceDraft[]> {
  const response = await fetchSharedDraftResponse(`/api/workspaces/${encodeURIComponent(workspaceId)}/drafts`);

  await throwIfSharedDraftFailed(response, '제출된 초안 목록 조회에 실패했습니다.');

  try {
    const data = await response.json() as { drafts?: unknown };

    if (!Array.isArray(data.drafts)) {
      throw new Error('shared draft response is missing drafts');
    }

    const drafts = data.drafts.map(toSharedWorkspaceDraft);

    if (drafts.some((draft) => draft === null)) {
      throw new Error('shared draft response contains invalid draft');
    }

    return drafts.filter((draft): draft is SharedWorkspaceDraft => draft !== null);
  } catch {
    throw new SharedWorkspaceRequestError('제출된 초안 목록 응답이 올바르지 않습니다.', {
      status: response.status,
    });
  }
}

export async function updateSharedDraftStatus(
  workspaceId: string,
  draftId: string,
  input: SharedDraftStatusUpdateInput,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (input.manageToken) {
    headers['x-manage-token'] = input.manageToken;
  }

  const body: {
    status: SharedDraftStatus;
    anonymousKey?: string;
  } = { status: input.status };

  if (input.anonymousKey) {
    body.anonymousKey = input.anonymousKey;
  }

  const response = await fetchSharedDraftResponse(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/drafts/${encodeURIComponent(draftId)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    },
  );

  await throwIfSharedDraftFailed(response, '공유 초안 상태 변경에 실패했습니다.');
}

export async function fetchBlockParticipation(
  workspaceId: string,
  decisionBlockId: string,
  anonymousKey?: string,
  snapshotVersion?: number,
): Promise<SharedParticipation> {
  const query = new URLSearchParams({ decisionBlockId });

  if (anonymousKey) {
    query.set('anonymousKey', anonymousKey);
  }

  if (snapshotVersion !== undefined) {
    query.set('version', String(snapshotVersion));
  }

  const response = await fetchParticipationResponse(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/participation?${query.toString()}`,
  );

  return readParticipation(response);
}

export async function submitSharedVote(
  workspaceId: string,
  snapshotVersion: number,
  decisionBlockId: string,
  optionId: string,
  anonymousKey: string,
): Promise<SharedParticipation> {
  const response = await fetchParticipationResponse(`/api/workspaces/${encodeURIComponent(workspaceId)}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisionBlockId, optionId, anonymousKey, snapshotVersion }),
  });

  return readParticipation(response);
}

export async function submitSharedOpinion(
  workspaceId: string,
  snapshotVersion: number,
  decisionBlockId: string,
  content: string,
  anonymousKey: string,
): Promise<SharedParticipation> {
  const response = await fetchParticipationResponse(`/api/workspaces/${encodeURIComponent(workspaceId)}/opinions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisionBlockId, content, anonymousKey, snapshotVersion }),
  });

  return readParticipation(response);
}
