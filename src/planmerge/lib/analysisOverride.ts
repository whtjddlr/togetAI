import {
  documentSectionDefinitions,
  type DocumentSectionKey,
  type PlanMergeAnalysisResult,
  type ProtocolDecisionBlock,
  type ProtocolDecisionOption,
} from './ai/planmergeProtocol';

export function applyDecisionOptionOverride(
  analysisResult: PlanMergeAnalysisResult,
  decisionBlockId: string,
  optionId: string,
): PlanMergeAnalysisResult {
  const targetBlock = analysisResult.decisionBlocks.find((block) => block.id === decisionBlockId);
  const targetOption = targetBlock?.options.find((option) => option.id === optionId);

  if (!targetBlock || !targetOption) {
    return analysisResult;
  }

  const nextDecisionBlocks = analysisResult.decisionBlocks.map((block) => {
    if (block.id !== decisionBlockId) {
      return block;
    }

    return applyOverrideToBlock(block, optionId, targetOption.content);
  });
  const nextTargetBlock = nextDecisionBlocks.find((block) => block.id === decisionBlockId) ?? targetBlock;
  const nextSelectedOption = nextTargetBlock.options.find((option) => option.id === nextTargetBlock.selectedOptionId);

  return {
    ...analysisResult,
    decisionBlocks: nextDecisionBlocks,
    finalDocumentSections: updateFinalDocumentSection(
      analysisResult,
      nextTargetBlock.sectionKey,
      decisionBlockId,
      nextSelectedOption?.content ?? targetOption.content,
    ),
    missingSections: analysisResult.missingSections.filter((sectionKey) => sectionKey !== nextTargetBlock.sectionKey),
  };
}

function applyOverrideToBlock(
  block: ProtocolDecisionBlock,
  optionId: string,
  selectedContent: string,
): ProtocolDecisionBlock {
  const previousSelectedOptionId = block.selectedOptionId;
  const nextOptions = block.options.map((option) => {
    if (option.id === optionId) {
      return {
        ...option,
        optionType: 'selected' as const,
        severity: undefined,
      };
    }

    if (option.id === previousSelectedOptionId) {
      return {
        ...option,
        optionType: 'alternative' as const,
        differenceFromSelected: '사용자 변경 전 AI 선택안입니다.',
        severity: undefined,
      };
    }

    return option;
  });

  return {
    ...block,
    selectedOptionId: optionId,
    selectionReason: `사용자가 "${selectedContent}"을 이 섹션의 선택안으로 적용했습니다.`,
    conflictLevel: inferConflictLevel(nextOptions),
    needsHumanReview: false,
    confidence: Math.max(block.confidence, 0.8),
    options: nextOptions,
  };
}

function inferConflictLevel(options: ProtocolDecisionOption[]): ProtocolDecisionBlock['conflictLevel'] {
  const conflictSeverities = options
    .filter((option) => option.optionType === 'conflict')
    .map((option) => option.severity);

  if (conflictSeverities.includes('high')) return 'high';
  if (conflictSeverities.includes('medium')) return 'medium';
  if (conflictSeverities.includes('low')) return 'low';
  return 'none';
}

function updateFinalDocumentSection(
  analysisResult: PlanMergeAnalysisResult,
  sectionKey: DocumentSectionKey,
  decisionBlockId: string,
  content: string,
) {
  const sectionTitle = documentSectionDefinitions.find((section) => section.key === sectionKey)?.title ?? sectionKey;
  const nextSection = {
    sectionKey,
    title: sectionTitle,
    content,
    sourceDecisionBlockIds: [decisionBlockId],
  };
  const existingIndex = analysisResult.finalDocumentSections.findIndex((section) => section.sectionKey === sectionKey);

  if (existingIndex === -1) {
    return [...analysisResult.finalDocumentSections, nextSection];
  }

  return analysisResult.finalDocumentSections.map((section, index) => (
    index === existingIndex ? nextSection : section
  ));
}
