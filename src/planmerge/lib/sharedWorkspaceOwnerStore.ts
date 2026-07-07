export type SharedWorkspaceOwnerAccess = {
  workspaceId: string;
  manageToken: string;
  expiresAt: string;
};

const OWNER_ACCESS_STORAGE_KEY = 'planmerge_shared_workspace_owner_v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSharedWorkspaceOwnerAccess(value: unknown): value is SharedWorkspaceOwnerAccess {
  return (
    isRecord(value) &&
    typeof value.workspaceId === 'string' &&
    typeof value.manageToken === 'string' &&
    typeof value.expiresAt === 'string' &&
    value.workspaceId.trim().length > 0 &&
    value.manageToken.trim().length > 0 &&
    value.expiresAt.trim().length > 0
  );
}

export function loadSharedWorkspaceOwnerAccess(workspaceId?: string): SharedWorkspaceOwnerAccess | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawAccess = window.localStorage.getItem(OWNER_ACCESS_STORAGE_KEY);

    if (!rawAccess) {
      return null;
    }

    const access = JSON.parse(rawAccess) as unknown;

    if (!isSharedWorkspaceOwnerAccess(access)) {
      return null;
    }

    if (workspaceId && access.workspaceId !== workspaceId) {
      return null;
    }

    return access;
  } catch {
    return null;
  }
}

export function saveSharedWorkspaceOwnerAccess(access: SharedWorkspaceOwnerAccess) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(OWNER_ACCESS_STORAGE_KEY, JSON.stringify(access));
  } catch (error) {
    console.warn('공유 링크 관리 토큰 저장에 실패했습니다:', error);
  }
}

export function clearSharedWorkspaceOwnerAccess(workspaceId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const access = loadSharedWorkspaceOwnerAccess(workspaceId);

  if (access) {
    window.localStorage.removeItem(OWNER_ACCESS_STORAGE_KEY);
  }
}
