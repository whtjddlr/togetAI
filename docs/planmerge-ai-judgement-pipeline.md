# PlanMerge AI 판단 구조 v0.1

상태: Draft (초기 설계안)  
목표: OpenAI API를 연결해 여러 기획안 초안을 AI가 섹션별로 판단, 병합, 설명하게 하는 구조를 정의한다.

> **구현 현황 (2026-07)**: 이 문서는 초기 설계안으로, 실제 구현과 다음이 다릅니다.
> - 환경변수: `OPENAI_API_KEY` → **`GMS_API_KEY`** (GMS Responses 호환 엔드포인트), 모델 기본값 `gpt-4.1`
> - API 라우트: `POST /api/analyze` → **`POST /api/analyze/planmerge`**
> - 코드 위치: `src/lib/ai/` → **`src/planmerge/lib/ai/`**
> - 검증: Zod → **수제 검증 함수** (`validatePlanMergeAnalysis` 등, 의존성 최소화)
> - 문서에 없는 추가 구현: 검증 실패 시 repair 프롬프트 재시도, 서버측 보정(postProcess), 로컬 하네스 폴백
>
> 2단계 호출 구조(추출 → 병합)와 판단 원칙은 문서대로 구현되어 있습니다.

## 1. 핵심 방향

PlanMerge의 AI는 단순 요약기가 아니라 의사결정 보조자다.

AI의 역할:

```text
1. 초안에서 아이디어를 추출한다.
2. 아이디어를 기획서 섹션별로 분류한다.
3. 비슷한 의견과 다른 의견을 구분한다.
4. 충돌하는 의견을 표시한다.
5. 병합 기준에 따라 선택안을 고른다.
6. 선택 이유와 사람 검토 필요 여부를 남긴다.
7. 선택된 Decision Block을 기반으로 최종 기획서 초안을 만든다.
```

중요한 원칙:

```text
AI가 결론을 내리되, 판단 근거와 탈락 의견을 함께 남긴다.
```

## 2. API 호출 구조

MVP에서는 API 호출을 2단계로 나눈다.

```text
Call 1. Extract Ideas
초안 원문 여러 개
→ 섹션별 아이디어 목록

Call 2. Merge Decisions
아이디어 목록 + 프로젝트 목표 + 병합 기준
→ Decision Blocks + 최종 기획서
```

2단계로 나누는 이유:

```text
1. 디버깅이 쉽다.
2. 어떤 아이디어가 추출됐는지 사용자에게 보여줄 수 있다.
3. 병합 판단이 잘못됐을 때 원인이 추출 단계인지 판단 단계인지 분리할 수 있다.
4. 나중에 extracted_ideas 테이블에 저장하기 쉽다.
```

## 3. 추천 모델 사용 방식

MVP 기본값:

```text
OPENAI_MODEL=gpt-5.2
```

구조:

```text
Next.js API Route 또는 Server Action
→ OpenAI Responses API
→ Structured Outputs JSON Schema
→ Zod 검증
→ MergeViewModel 반환
```

운영 시에는 모델명을 코드에 박지 않고 환경변수로 관리한다.

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.2
```

## 4. 병합 판단 기준

각 아이디어는 아래 기준으로 평가한다.

```text
1. 프로젝트 목표 적합성: 25점
2. MVP 실현 가능성: 20점
3. 사용자 문제 해결력: 20점
4. 구체성: 15점
5. 초안 간 지지 정도: 10점
6. 리스크 감소: 10점
```

판단 규칙:

```text
1. 다수결만으로 선택하지 않는다.
2. 프로젝트 목표와 MVP 제약을 가장 우선한다.
3. 초안에 없는 내용을 새로 만들지 않는다.
4. 선택되지 않은 의견도 alternatives 또는 conflicts에 보존한다.
5. 서로 동시에 참일 수 없는 의견은 conflict로 표시한다.
6. 확신이 낮거나 근거가 부족하면 needsHumanReview를 true로 둔다.
```

## 5. Call 1. Extract Ideas

입력:

```ts
type ExtractIdeasInput = {
  project: {
    title: string;
    goal: string;
    documentType: string;
    contextPack?: string;
    forbiddenDirections?: string;
  };
  sections: {
    sectionKey: string;
    title: string;
    description?: string;
  }[];
  drafts: {
    draftId: string;
    authorName: string;
    authorRole?: string;
    aiModel?: string;
    taskTitle?: string;
    rawText: string;
  }[];
};
```

출력:

```ts
type ExtractIdeasOutput = {
  ideas: {
    ideaId: string;
    draftId: string;
    sectionKey: string;
    sectionTitle: string;
    topic: string;
    ideaType:
      | "problem"
      | "target_user"
      | "pain_point"
      | "solution"
      | "feature"
      | "scope"
      | "flow"
      | "requirement"
      | "metric"
      | "risk"
      | "open_question";
    normalizedText: string;
    sourceExcerpt: string;
    confidence: number;
  }[];
  extractionWarnings: string[];
};
```

## 6. Call 1 시스템 프롬프트

```text
당신은 여러 AI 기획서 초안에서 제품 기획 아이디어를 추출하는 분석가입니다.

목표:
- 초안 원문에서 의미 있는 아이디어를 추출하세요.
- 각 아이디어를 주어진 기획서 섹션 중 하나에 매핑하세요.
- 초안에 없는 내용을 새로 만들지 마세요.
- 같은 초안에 중복 표현이 있으면 하나의 정규화된 아이디어로 합치세요.
- 원문 추적을 위해 sourceExcerpt를 반드시 남기세요.

분류 기준:
- problem: 해결하려는 문제
- target_user: 타깃 사용자
- pain_point: 사용자 불편
- solution: 해결 방식
- feature: 기능 아이디어
- scope: MVP 또는 범위
- flow: 사용자 흐름
- requirement: 요구사항
- metric: 성공 지표
- risk: 리스크
- open_question: 미결정 사항

출력은 반드시 주어진 JSON Schema를 따르세요.
```

## 7. Call 2. Merge Decisions

입력:

```ts
type MergeDecisionsInput = {
  project: {
    title: string;
    goal: string;
    documentType: string;
    contextPack?: string;
    forbiddenDirections?: string;
    outputStyle?: string;
  };
  sections: {
    sectionKey: string;
    title: string;
    description?: string;
    sortOrder: number;
  }[];
  ideas: ExtractIdeasOutput["ideas"];
};
```

출력:

```ts
type MergeDecisionsOutput = {
  summary: string;
  missingSections: string[];
  overallRiskLevel: "low" | "medium" | "high";
  finalDocument: {
    title: string;
    sections: {
      sectionKey: string;
      title: string;
      content: string;
      sortOrder: number;
    }[];
  };
  decisionBlocks: {
    sectionKey: string;
    sectionTitle: string;
    topic: string;
    selectedSummary: string;
    selectionReason: string;
    score: {
      goalFit: number;
      mvpFeasibility: number;
      userProblemFit: number;
      specificity: number;
      supportAcrossDrafts: number;
      riskReduction: number;
      total: number;
    };
    confidence: number;
    conflictLevel: "none" | "low" | "medium" | "high";
    needsHumanReview: boolean;
    options: {
      optionType: "selected" | "alternative" | "conflict" | "rejected";
      content: string;
      differenceFromSelected?: string;
      rationale?: string;
      severity?: "low" | "medium" | "high";
      sourceIdeaIds: string[];
      sourceExcerpts: string[];
    }[];
  }[];
};
```

## 8. Call 2 시스템 프롬프트

```text
당신은 여러 기획서 초안을 하나의 기획서로 병합하는 제품 전략 AI입니다.

당신의 임무:
1. 섹션별로 관련 아이디어를 묶으세요.
2. 비슷한 아이디어는 하나의 선택지로 합치세요.
3. 프로젝트 목표와 MVP 제약에 가장 잘 맞는 선택안을 고르세요.
4. 선택되지 않은 의견은 alternative 또는 rejected로 보존하세요.
5. 선택안과 동시에 성립하기 어려운 의견은 conflict로 표시하세요.
6. 선택 이유를 사람이 납득할 수 있게 설명하세요.
7. 근거가 약하거나 충돌이 크면 needsHumanReview를 true로 설정하세요.
8. Decision Block을 기반으로 최종 기획서 초안을 작성하세요.

평가 기준:
- 프로젝트 목표 적합성: 25점
- MVP 실현 가능성: 20점
- 사용자 문제 해결력: 20점
- 구체성: 15점
- 초안 간 지지 정도: 10점
- 리스크 감소: 10점

주의:
- 단순 요약하지 마세요.
- 다수결만으로 결정하지 마세요.
- 초안에 없는 내용을 새로 만들지 마세요.
- 모든 중요한 대안과 충돌 의견을 options에 보존하세요.
- 출처 ideaId와 sourceExcerpt를 유지하세요.
- 출력은 반드시 주어진 JSON Schema를 따르세요.
```

## 9. Next.js API 라우트 구조

권장 파일:

```text
src/app/api/analyze/route.ts
src/lib/ai/openai.ts
src/lib/ai/prompts.ts
src/lib/ai/schemas.ts
src/lib/ai/planmerge.ts
```

처리 흐름:

```text
POST /api/analyze
→ 요청 검증
→ extractIdeas(input)
→ mergeDecisions(project, sections, ideas)
→ MergeViewModel 변환
→ JSON 반환
```

## 10. 의사 코드

```ts
export async function POST(req: Request) {
  const input = await req.json();

  const extractResult = await extractIdeas({
    project: input.project,
    sections: input.sections,
    drafts: input.drafts,
  });

  const mergeResult = await mergeDecisions({
    project: input.project,
    sections: input.sections,
    ideas: extractResult.ideas,
  });

  return Response.json(toMergeViewModel(mergeResult));
}
```

## 11. OpenAI 호출 예시

```ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.responses.create({
  model: process.env.OPENAI_MODEL ?? "gpt-5.2",
  input: [
    {
      role: "system",
      content: MERGE_DECISIONS_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: JSON.stringify(input),
    },
  ],
  text: {
    format: {
      type: "json_schema",
      name: "planmerge_merge_decisions",
      strict: true,
      schema: mergeDecisionsJsonSchema,
    },
  },
});

const result = JSON.parse(response.output_text);
```

## 12. Human Review 규칙

`needsHumanReview`는 아래 조건 중 하나라도 해당하면 `true`로 둔다.

```text
1. conflictLevel이 high다.
2. 최고 점수 선택안과 2위 선택안 점수 차이가 10점 미만이다.
3. 선택안의 출처가 1개뿐이고 confidence가 0.7 미만이다.
4. 프로젝트 목표와 충돌하는 아이디어가 주요 초안에 반복 등장한다.
5. AI가 누락된 섹션을 최종 문서에서 추론으로 채워야 하는 상황이다.
```

## 13. 비교 UX 연결 규칙

AI 응답은 사람이 비교하기 쉬운 화면으로 바로 변환될 수 있어야 한다.

따라서 `decisionBlocks.options`는 단순한 대안 목록이 아니라 비교 가능한 플랜 목록이어야 한다.

각 option에 포함할 비교 필드:

```text
content
differenceFromSelected
strengths
weaknesses
risk
scores
sourceIdeaIds
sourceExcerpts
```

`conflict` option에 추가로 포함할 필드:

```text
conflictsWith
conflictReason
scopeImpact
decisionQuestion
```

화면 매핑:

```text
selected option
→ 선택 근거 탭의 AI 선택안

alternative / rejected option
→ 대안 비교 탭의 비교 테이블

conflict option
→ 충돌 의견 탭의 충돌 카드

sourceIdeaIds / sourceExcerpts
→ 출처 초안 탭
```

관련 UX 문서:

```text
docs/planmerge-comparison-ux-structure.md
```

## 14. MVP 구현 순서

1. `/api/analyze` 하나만 만든다.
2. DB 저장 없이 요청 본문에서 초안을 받아 바로 분석한다.
3. Structured Outputs로 `MergeDecisionsOutput`을 받는다.
4. 프론트에는 `MergeViewModel`로 변환해 반환한다.
5. 결과가 마음에 들면 이후 DB에 `extracted_ideas`, `decision_blocks`, `decision_options`를 저장한다.

## 15. 결론

PlanMerge의 AI 판단 구조는 아래처럼 잡는다.

```text
초안 원문
→ 아이디어 추출
→ 섹션별 묶기
→ 병합 기준 점수화
→ 선택안 / 대안 / 충돌 분리
→ Decision Block 생성
→ 최종 기획서 생성
```

이 구조를 쓰면 AI가 최종 기획서를 생성하는 동시에, 사용자가 왜 그 결론이 나왔는지 추적할 수 있다.
