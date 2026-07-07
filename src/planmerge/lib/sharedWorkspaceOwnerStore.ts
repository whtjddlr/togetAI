export type SharedWorkspaceOwnerAccess = {
  workspaceId: string;
  manageToken: string;
  expiresAt: string;
  snapshotVersion: number;
  sharedAnalysisRunId: number;
};

type OwnerAccessStore = {
  entries: Record<string, SharedWorkspaceOwnerAccess>;
  legacyAccess: SharedWorkspaceOwnerAccess | null;
};

const OWNER_ACCESS_STORAGE_KEY = 'planmerge_shared_workspace_owner_v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPositiveInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;
}

function readNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function toSharedWorkspaceOwnerAccess(value: unknown): SharedWorkspaceOwnerAccess | null {
  if (
    !isRecord(value) ||
    typeof value.workspaceId !== 'string' ||
    typeof value.manageToken !== 'string' ||
    typeof value.expiresAt !== 'string' ||
    value.workspaceId.trim().length === 0 ||
    value.manageToken.trim().length === 0 ||
    value.expiresAt.trim().length === 0
  ) {
    return null;
  }

  return {
    workspaceId: value.workspaceId,
    manageToken: value.manageToken,
    expiresAt: value.expiresAt,
    snapshotVersion: readPositiveInteger(value.snapshotVersion, 1),
    sharedAnalysisRunId: readNonNegativeInteger(value.sharedAnalysisRunId, 0),
  };
}

function readOwnerAccessStore(): OwnerAccessStore {
  if (typeof window === 'undefined') {
    return { entries: {}, legacyAccess: null };
  }

  try {
    const rawAccess = window.localStorage.getItem(OWNER_ACCESS_STORAGE_KEY);

    if (!rawAccess) {
      return { entries: {}, legacyAccess: null };
    }

    const parsed = JSON.parse(rawAccess) as unknown;
    const legacyAccess = toSharedWorkspaceOwnerAccess(parsed);

    if (legacyAccess) {
      return { entries: {}, legacyAccess };
    }

    if (!isRecord(parsed) || !isRecord(parsed.entries)) {
      return { entries: {}, legacyAccess: null };
    }

    const entries: Record<string, SharedWorkspaceOwnerAccess> = {};
    const storeLegacyAccess = toSharedWorkspaceOwnerAccess(parsed.legacyAccess);

    Object.entries(parsed.entries).forEach(([localWorkspaceId, value]) => {
      const access = toSharedWorkspaceOwnerAccess(value);

      if (localWorkspaceId.trim() && access) {
        entries[localWorkspaceId] = access;
      }
    });

    return { entries, legacyAccess: storeLegacyAccess };
  } catch {
    return { entries: {}, legacyAccess: null };
  }
}

function writeOwnerAccessStore(store: OwnerAccessStore) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      OWNER_ACCESS_STORAGE_KEY,
      JSON.stringify({
        entries: store.entries,
        ...(store.legacyAccess ? { legacyAccess: store.legacyAccess } : {}),
      }),
    );
  } catch (error) {
    console.warn('공유 링크 관리 토큰 저장에 실패했습니다:', error);
  }
}

function findAccessBySharedWorkspaceId(store: OwnerAccessStore, sharedWorkspaceId: string) {
  return Object.values(store.entries).find((access) => access.workspaceId === sharedWorkspaceId)
    ?? (store.legacyAccess?.workspaceId === sharedWorkspaceId ? store.legacyAccess : null);
}

export function loadSharedWorkspaceOwnerAccess(workspaceId?: string): SharedWorkspaceOwnerAccess | null {
  const store = readOwnerAccessStore();

  if (!workspaceId) {
    return store.legacyAccess ?? Object.values(store.entries)[0] ?? null;
  }

  return store.entries[workspaceId]
    ?? findAccessBySharedWorkspaceId(store, workspaceId);
}

export function loadLegacySharedWorkspaceOwnerAccess(): SharedWorkspaceOwnerAccess | null {
  return readOwnerAccessStore().legacyAccess;
}

export function saveSharedWorkspaceOwnerAccess(
  access: SharedWorkspaceOwnerAccess,
  localWorkspaceId?: string | null,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const store = readOwnerAccessStore();

  if (localWorkspaceId) {
    store.entries[localWorkspaceId] = access;
    store.legacyAccess = null;
  } else {
    store.legacyAccess = access;
  }

  writeOwnerAccessStore(store);
}

export function clearSharedWorkspaceOwnerAccess(workspaceId: string, localWorkspaceId?: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const store = readOwnerAccessStore();

  if (localWorkspaceId && store.entries[localWorkspaceId]?.workspaceId === workspaceId) {
    delete store.entries[localWorkspaceId];
  }

  Object.entries(store.entries).forEach(([entryWorkspaceId, access]) => {
    if (access.workspaceId === workspaceId) {
      delete store.entries[entryWorkspaceId];
    }
  });

  if (store.legacyAccess?.workspaceId === workspaceId) {
    store.legacyAccess = null;
  }

  writeOwnerAccessStore(store);
}
