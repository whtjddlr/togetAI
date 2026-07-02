import {
  runLocalPlanMergeHarness,
  validatePlanMergeAnalysis,
} from './planmergeProtocol';
import type {
  PlanMergeAnalysisPayload,
  PlanMergeAnalysisResult,
} from './planmergeProtocol';

export async function generatePlanMergeAnalysis(
  payload: PlanMergeAnalysisPayload,
): Promise<PlanMergeAnalysisResult> {
  try {
    const response = await fetch('/api/analyze/planmerge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`analysis api failed: ${response.status}`);
    }

    const result = await response.json() as PlanMergeAnalysisResult;
    const validation = validatePlanMergeAnalysis(payload, result);

    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown client analysis error.';
    const fallback = runLocalPlanMergeHarness(payload);

    return {
      ...fallback,
      warnings: [
        `분석 API 호출 실패로 로컬 하네스를 사용했습니다. ${message}`,
        ...fallback.warnings,
      ],
    };
  }
}
