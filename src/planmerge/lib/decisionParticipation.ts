import type { AnonymousOpinion, DecisionTrace } from '../data/mergeResult';

const PARTICIPATION_STORAGE_KEY = 'planmerge_decision_participation_v1';

export type VoteGroup = 'selected' | 'alternative' | 'conflict';

export type VoteOption = {
  id: string;
  label: string;
  description: string;
  group: VoteGroup;
  baseVotes: number;
};

export type DecisionVote = {
  voterKey: string;
  selectedOptionId?: string;
  overrides: Record<string, number>;
};

export type ParticipationState = {
  analysisRunId: number;
  votesByDecisionBlock: Record<string, DecisionVote>;
  opinionsByDecisionBlock: Record<string, AnonymousOpinion[]>;
};

export const emptyParticipationState: ParticipationState = {
  analysisRunId: 0,
  votesByDecisionBlock: {},
  opinionsByDecisionBlock: {},
};

export function createEmptyParticipationState(analysisRunId: number): ParticipationState {
  return {
    analysisRunId,
    votesByDecisionBlock: {},
    opinionsByDecisionBlock: {},
  };
}

export function buildVoteOptions(trace: DecisionTrace): VoteOption[] {
  return [
    {
      id: `${trace.decisionBlockId}:selected`,
      label: 'AI 선택안',
      description: trace.selectedContent,
      group: 'selected',
      baseVotes: trace.conflicts.length > 0 ? 5 : 7,
    },
    ...trace.alternatives.map((alternative, index) => ({
      id: `${trace.decisionBlockId}:alternative:${index}`,
      label: alternative.title,
      description: alternative.description,
      group: 'alternative' as const,
      baseVotes: Math.max(2, 4 - index),
    })),
    ...trace.conflicts.map((conflict, index) => ({
      id: `${trace.decisionBlockId}:conflict:${index}`,
      label: conflict.title,
      description: conflict.description,
      group: 'conflict' as const,
      baseVotes: Math.max(1, 2 - index),
    })),
  ];
}

export function groupLabel(group: VoteGroup) {
  if (group === 'selected') return '선택안';
  if (group === 'alternative') return '대안';
  return '충돌';
}

export function getVoteCount(option: VoteOption, decisionVote?: DecisionVote) {
  return decisionVote?.overrides[option.id] ?? option.baseVotes;
}

export function getTotalVotes(options: VoteOption[], decisionVote?: DecisionVote) {
  return options.reduce((sum, option) => sum + getVoteCount(option, decisionVote), 0);
}

export function voteOnOption(trace: DecisionTrace, currentVote: DecisionVote | undefined, optionId: string, voterKey: string) {
  const options = buildVoteOptions(trace);
  const validOption = options.some((option) => option.id === optionId);

  if (!validOption) {
    return currentVote;
  }

  const overrides: Record<string, number> = {};

  for (const option of options) {
    overrides[option.id] = getVoteCount(option, currentVote);
  }

  if (currentVote?.selectedOptionId === optionId) {
    return currentVote;
  }

  if (currentVote?.selectedOptionId) {
    overrides[currentVote.selectedOptionId] = Math.max(0, overrides[currentVote.selectedOptionId] - 1);
  }

  overrides[optionId] += 1;

  return {
    voterKey,
    selectedOptionId: optionId,
    overrides,
  };
}

export function addAnonymousOpinion(
  trace: DecisionTrace,
  currentOpinions: AnonymousOpinion[] | undefined,
  content: string,
  anonymousKey: string,
) {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return currentOpinions ?? trace.opinions;
  }

  const nextOpinion: AnonymousOpinion = {
    id: `${trace.decisionBlockId}:opinion:${Date.now()}`,
    anonymousKey,
    content: trimmedContent,
    createdAtLabel: '방금',
  };

  return [nextOpinion, ...(currentOpinions ?? trace.opinions)];
}

export function loadParticipationState(analysisRunId = 0) {
  if (typeof window === 'undefined') {
    return createEmptyParticipationState(analysisRunId);
  }

  const rawState = window.localStorage.getItem(PARTICIPATION_STORAGE_KEY);

  if (!rawState) {
    return createEmptyParticipationState(analysisRunId);
  }

  try {
    const parsedState = JSON.parse(rawState) as Partial<ParticipationState>;
    const storedRunId = parsedState.analysisRunId ?? 0;

    if (storedRunId !== analysisRunId) {
      return createEmptyParticipationState(analysisRunId);
    }

    return {
      analysisRunId: storedRunId,
      votesByDecisionBlock: parsedState.votesByDecisionBlock ?? {},
      opinionsByDecisionBlock: parsedState.opinionsByDecisionBlock ?? {},
    };
  } catch {
    return createEmptyParticipationState(analysisRunId);
  }
}

export function saveParticipationState(state: ParticipationState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PARTICIPATION_STORAGE_KEY, JSON.stringify(state));
}
