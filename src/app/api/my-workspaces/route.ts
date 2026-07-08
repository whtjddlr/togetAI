import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb, isDatabaseConfigured } from '@/server/db';
import { checkRateLimit, getClientKey } from '@/server/rateLimit';

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
const MAX_WORKSPACE_COUNT = 50;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();

  if (!userId) {
    return NextResponse.json(
      { errors: ['로그인이 필요합니다.'] },
      { status: 401 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { errors: ['데이터베이스가 설정되지 않아 내 공유 링크를 조회할 수 없습니다.'] },
      { status: 503 },
    );
  }

  const rateLimit = await checkRateLimit(
    'my-workspaces',
    getClientKey(request, userId),
    RATE_LIMIT,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { errors: ['요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'] },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const db = getDb();
    const workspaces = await db.sharedWorkspace.findMany({
      where: {
        createdById: userId,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_WORKSPACE_COUNT,
      select: {
        id: true,
        title: true,
        snapshotVersion: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    if (workspaces.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const currentSnapshotFilters = workspaces.map((workspace) => ({
      workspaceId: workspace.id,
      snapshotVersion: workspace.snapshotVersion,
    }));
    const [voteVoterGroups, opinionGroups] = await Promise.all([
      db.sharedWorkspaceVote.groupBy({
        by: ['workspaceId', 'anonymousKey'],
        where: { OR: currentSnapshotFilters },
        _count: { _all: true },
      }),
      db.sharedWorkspaceOpinion.groupBy({
        by: ['workspaceId'],
        where: { OR: currentSnapshotFilters },
        _count: { _all: true },
      }),
    ]);
    const totalVotersByWorkspaceId = new Map<string, number>();
    const totalOpinionsByWorkspaceId = new Map<string, number>();

    voteVoterGroups.forEach((group) => {
      totalVotersByWorkspaceId.set(
        group.workspaceId,
        (totalVotersByWorkspaceId.get(group.workspaceId) ?? 0) + 1,
      );
    });

    opinionGroups.forEach((group) => {
      totalOpinionsByWorkspaceId.set(group.workspaceId, group._count._all);
    });

    return NextResponse.json({
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        title: workspace.title,
        snapshotVersion: workspace.snapshotVersion,
        expiresAt: workspace.expiresAt?.toISOString() ?? null,
        revokedAt: workspace.revokedAt?.toISOString() ?? null,
        createdAt: workspace.createdAt.toISOString(),
        participation: {
          totalVoters: totalVotersByWorkspaceId.get(workspace.id) ?? 0,
          totalOpinions: totalOpinionsByWorkspaceId.get(workspace.id) ?? 0,
        },
      })),
    });
  } catch (error) {
    console.error('[my-workspaces] read failed:', error);

    return NextResponse.json(
      { errors: ['내 공유 링크 목록을 불러오지 못했습니다.'] },
      { status: 500 },
    );
  }
}
