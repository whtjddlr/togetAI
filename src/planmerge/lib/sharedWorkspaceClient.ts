import type { AnonymousOpinion } from '../data/mergeResult';
import { parseWorkspaceImport, type LocalWorkspaceState } from './localWorkspace';

export type SharedParticipation = {
  votes: Record<string, number>;
  myOptionId?: string;
  opinions: AnonymousOpinion[];
};

export type SharedWorkspaceLoadResult = {
  state: LocalWorkspaceState;
  warnings: string[];
};

export type SharedWorkspaceCreateResult = {
  id: string;
  manageToken: string;
  expiresAt: string;
};

type SharedWorkspaceRequestErrorOptions = {
  status?: number;
  retryAfter?: string;
};

export const SHARED_LINK_UNAVAILABLE_MESSAGE = '공유 링크가 만료되었거나 회수되었습니다.';
export const SHARED_RATE_LIMIT_MESSAGE = '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.';
export const SHARED_PARTICIPATION_FAILED_MESSAGE = '처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';

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

function getRetryAfter(response: Response) {
  return response.headers.get('Retry-After') ?? undefined;
}

function throwIfSharedParticipationFailed(response: Response) {
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

  throw new SharedWorkspaceRequestError(SHARED_PARTICIPATION_FAILED_MESSAGE, {
    status: response.status,
  });
}

async function readParticipation(response: Response) {
  throwIfSharedParticipationFailed(response);

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
    expiresAt?: string;
  };

  if (!data.id || !data.manageToken || !data.expiresAt) {
    throw new Error('공유 링크 생성 응답이 올바르지 않습니다.');
  }

  return {
    id: data.id,
    manageToken: data.manageToken,
    expiresAt: data.expiresAt,
  };
}

export async function revokeSharedWorkspace(workspaceId: string, manageToken: string): Promise<void> {
  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: 'DELETE',
    headers: { 'x-manage-token': manageToken },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '공유 링크 회수에 실패했습니다.'));
  }

  const data = await response.json() as { revoked?: boolean };

  if (data.revoked !== true) {
    throw new Error('공유 링크 회수 응답이 올바르지 않습니다.');
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

  let data: { workspace?: unknown };

  try {
    data = await response.json() as { workspace?: unknown };
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
        warnings: parsed.warnings,
      };
    }
  } catch {
    // Fall through to the validation error below.
  }

  throw new Error('공유 워크스페이스 데이터가 검증에 실패했습니다.');
}

export async function fetchBlockParticipation(
  workspaceId: string,
  decisionBlockId: string,
  anonymousKey: string,
): Promise<SharedParticipation> {
  const query = new URLSearchParams({ decisionBlockId, anonymousKey });
  const response = await fetchParticipationResponse(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/participation?${query.toString()}`,
  );

  return readParticipation(response);
}

export async function submitSharedVote(
  workspaceId: string,
  decisionBlockId: string,
  optionId: string,
  anonymousKey: string,
): Promise<SharedParticipation> {
  const response = await fetchParticipationResponse(`/api/workspaces/${encodeURIComponent(workspaceId)}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisionBlockId, optionId, anonymousKey }),
  });

  return readParticipation(response);
}

export async function submitSharedOpinion(
  workspaceId: string,
  decisionBlockId: string,
  content: string,
  anonymousKey: string,
): Promise<SharedParticipation> {
  const response = await fetchParticipationResponse(`/api/workspaces/${encodeURIComponent(workspaceId)}/opinions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisionBlockId, content, anonymousKey }),
  });

  return readParticipation(response);
}
