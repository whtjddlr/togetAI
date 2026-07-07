import {
  runLocalPlanMergeHarness,
  validatePlanMergeAnalysis,
} from './planmergeProtocol';
import type {
  PlanMergeAnalysisPayload,
  PlanMergeAnalysisResult,
} from './planmergeProtocol';

class AnalysisApiError extends Error {
  readonly fallbackWarning: string;

  constructor(message: string, fallbackWarning: string) {
    super(message);
    this.name = 'AnalysisApiError';
    this.fallbackWarning = fallbackWarning;
  }
}

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
      const apiError = await createAnalysisApiError(response);

      throw apiError;
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
    const warning = error instanceof AnalysisApiError
      ? error.fallbackWarning
      : `분석 API 호출 실패로 로컬 하네스를 사용했습니다. ${message}`;

    return {
      ...fallback,
      warnings: [
        warning,
        ...fallback.warnings,
      ],
    };
  }
}

async function createAnalysisApiError(response: Response) {
  const errorPayload = await readErrorPayload(response);
  const errors = extractErrors(errorPayload);

  if (response.status === 429) {
    return new AnalysisApiError(
      `analysis api failed: ${response.status}`,
      '분석 요청이 너무 잦아 로컬 하네스를 사용했습니다. 잠시 후 다시 시도해 주세요.',
    );
  }

  if (response.status === 400) {
    const detail = errors.length
      ? errors.join('; ')
      : '서버가 입력을 거절했습니다.';

    return new AnalysisApiError(
      `analysis api failed: ${response.status}`,
      `입력 검증 실패: ${detail}`,
    );
  }

  return new AnalysisApiError(
    `analysis api failed: ${response.status}`,
    `분석 API 호출 실패로 로컬 하네스를 사용했습니다. 서버 응답 상태: ${response.status}`,
  );
}

async function readErrorPayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(text);

    return parsed;
  } catch {
    return text;
  }
}

function extractErrors(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.errors)) {
    return [];
  }

  return payload.errors
    .filter((error): error is string => typeof error === 'string' && error.trim().length > 0)
    .map((error) => error.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
