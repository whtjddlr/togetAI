import { getDb } from './db';

const WORKSPACE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidWorkspaceId(value: string) {
  return WORKSPACE_ID_PATTERN.test(value);
}

export function readRequiredString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : undefined;
}

export type SharedBlockParticipation = {
  votes: Record<string, number>;
  myOptionId?: string;
  opinions: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
};

export async function findSharedWorkspaceId(workspaceId: string) {
  const db = getDb();
  const workspace = await db.sharedWorkspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  return workspace?.id;
}

export type SharedDecisionBlockTarget =
  | {
    status: 'found';
    votableOptionIds: string[];
  }
  | {
    status: 'workspace_not_found' | 'invalid_decision_block';
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getVotableOptionIds(block: Record<string, unknown>) {
  const selectedOptionId = hasText(block.selectedOptionId) ? block.selectedOptionId : undefined;
  const options = Array.isArray(block.options) ? block.options : undefined;

  if (!selectedOptionId || !options) {
    return undefined;
  }

  const optionIds = new Set<string>([selectedOptionId]);
  const seenOptionIds = new Set<string>();
  let selectedOptionCount = 0;

  for (const option of options) {
    if (!isRecord(option) || !hasText(option.id) || !hasText(option.optionType)) {
      return undefined;
    }

    if (seenOptionIds.has(option.id)) {
      return undefined;
    }

    seenOptionIds.add(option.id);

    if (option.optionType === 'selected') {
      selectedOptionCount += 1;

      if (option.id !== selectedOptionId) {
        return undefined;
      }
    } else if (option.optionType === 'alternative' || option.optionType === 'conflict') {
      optionIds.add(option.id);
    } else {
      return undefined;
    }
  }

  return selectedOptionCount === 1 ? [...optionIds] : undefined;
}

function findDecisionBlockOptionIds(snapshot: unknown, decisionBlockId: string) {
  if (!isRecord(snapshot) || !isRecord(snapshot.analysisResult)) {
    return undefined;
  }

  const decisionBlocks = snapshot.analysisResult.decisionBlocks;

  if (!Array.isArray(decisionBlocks)) {
    return undefined;
  }

  for (const block of decisionBlocks) {
    if (isRecord(block) && block.id === decisionBlockId) {
      return getVotableOptionIds(block);
    }
  }

  return undefined;
}

export async function getSharedDecisionBlockTarget(
  workspaceId: string,
  decisionBlockId: string,
): Promise<SharedDecisionBlockTarget> {
  const db = getDb();
  const workspace = await db.sharedWorkspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, snapshot: true },
  });

  if (!workspace) {
    return { status: 'workspace_not_found' };
  }

  const votableOptionIds = findDecisionBlockOptionIds(workspace.snapshot, decisionBlockId);

  if (!votableOptionIds) {
    return { status: 'invalid_decision_block' };
  }

  return {
    status: 'found',
    votableOptionIds,
  };
}

export async function getBlockParticipation(
  workspaceId: string,
  decisionBlockId: string,
  anonymousKey?: string,
): Promise<SharedBlockParticipation> {
  const db = getDb();
  const [voteGroups, myVote, opinionRows] = await Promise.all([
    db.sharedWorkspaceVote.groupBy({
      by: ['optionId'],
      where: { workspaceId, decisionBlockId },
      _count: { _all: true },
    }),
    anonymousKey
      ? db.sharedWorkspaceVote.findUnique({
        where: {
          workspaceId_decisionBlockId_anonymousKey: {
            workspaceId,
            decisionBlockId,
            anonymousKey,
          },
        },
        select: { optionId: true },
      })
      : Promise.resolve(null),
    db.sharedWorkspaceOpinion.findMany({
      where: { workspaceId, decisionBlockId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, content: true, createdAt: true },
    }),
  ]);

  const votes: Record<string, number> = {};

  voteGroups.forEach((group) => {
    votes[group.optionId] = group._count._all;
  });

  return {
    votes,
    myOptionId: myVote?.optionId,
    opinions: opinionRows.map((opinion) => ({
      id: opinion.id,
      content: opinion.content,
      createdAt: opinion.createdAt.toISOString(),
    })),
  };
}
