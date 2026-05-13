# PlanMerge 의견 비교 분석 모델 v0.1

상태: Draft  
목표: 서로 다른 기획 의견을 사용자가 쉽게 비교하고 판단할 수 있도록 AI 분석 구조와 화면 구조를 정의한다.

## 1. 핵심 문제

서로 다른 의견을 그대로 보여주면 사용자는 다시 모든 초안을 읽고 비교해야 한다.

나쁜 방식:

```text
다른 의견:
- Notion 연동을 하자.
- Slack 연동을 하자.
- 실시간 공동 편집을 하자.
- 텍스트 붙여넣기만 하자.
```

이 방식은 사용자가 아래 질문을 직접 풀어야 한다.

```text
무엇이 같은 의견인가?
무엇이 다른 의견인가?
어떤 의견이 진짜 충돌하는가?
어떤 기준으로 비교해야 하는가?
채택하면 무엇이 바뀌는가?
```

PlanMerge는 이 해석 작업을 AI가 먼저 해줘야 한다.

## 2. 해결 방향

의견 비교는 `의견 목록`이 아니라 `판단 질문 + 비교 축 + 선택지`로 보여준다.

핵심 구조:

```text
섹션
→ 판단 주제
→ 판단 질문
→ 의견 그룹
→ 비교 축
→ AI 선택안
→ 대안
→ 충돌 의견
→ 사람이 결정할 질문
```

예시:

```text
섹션: MVP 범위

판단 주제:
초기 기능 범위

판단 질문:
초기 MVP에 외부 연동을 포함할 것인가?

AI 선택안:
텍스트 붙여넣기 + 병합 리포트 생성까지만 포함한다.

다른 의견:
Notion 연동 포함
Slack 연동 포함
실시간 공동 편집 포함

핵심 차이:
초기 MVP를 검증 도구로 볼 것인가, 협업 워크스페이스로 볼 것인가?
```

## 3. AI가 만들어야 하는 비교 단위

서로 다른 의견은 먼저 `Opinion Candidate`로 정규화한다.

```ts
type OpinionCandidate = {
  id: string;
  sectionKey: string;
  topic: string;
  decisionQuestion: string;
  content: string;
  normalizedClaim: string;
  opinionType:
    | "same_direction"
    | "compatible_alternative"
    | "tradeoff"
    | "direct_conflict"
    | "out_of_scope";
  sourceIdeaIds: string[];
  sourceExcerpts: string[];
};
```

의견 타입 설명:

```text
same_direction:
표현은 다르지만 같은 방향의 의견

compatible_alternative:
선택안과 다르지만 나중에 함께 갈 수 있는 의견

tradeoff:
장점과 단점이 명확히 갈리는 대안

direct_conflict:
선택안과 동시에 성립하기 어려운 의견

out_of_scope:
좋은 의견일 수 있지만 현재 MVP 기준에서 벗어난 의견
```

## 4. 비교 축

AI는 각 판단 주제마다 비교 축을 만들어야 한다.

기본 비교 축:

```text
1. 목표 적합성
2. 사용자 가치
3. MVP 실현 가능성
4. 개발 범위 영향
5. 리스크
6. 검증 속도
7. 나중에 확장 가능성
```

기획 도메인에 따라 추가 가능한 비교 축:

```text
타깃 사용자 적합성
비즈니스 임팩트
운영 부담
데이터 필요성
법적 / 보안 리스크
UX 복잡도
```

MVP 기본 비교 테이블:

```text
| 비교 기준 | AI 선택안 | 대안 A | 대안 B | 충돌 의견 |
| --- | --- | --- | --- | --- |
| 목표 적합성 | 높음 | 중간 | 중간 | 낮음 |
| 사용자 가치 | 높음 | 중간 | 중간 | 높음 |
| 실현 가능성 | 높음 | 낮음 | 낮음 | 매우 낮음 |
| 개발 범위 | 작음 | 중간 | 중간 | 큼 |
| 리스크 | 낮음 | 중간 | 중간 | 높음 |
| 검증 속도 | 빠름 | 느림 | 느림 | 매우 느림 |
| 핵심 차이 | 병합 검증 집중 | 문서 연동 포함 | 커뮤니케이션 연동 포함 | 협업 제품으로 확장 |
```

## 5. 쉬운 비교를 위한 화면 구조

오른쪽 비교 패널의 `대안 비교` 탭은 아래 순서로 보여준다.

```text
1. 판단 질문
2. AI 한 줄 결론
3. 핵심 차이 요약
4. 비교 테이블
5. 선택지별 장단점 카드
6. 사람이 결정할 질문
7. 출처 보기
```

화면 예시:

```text
판단 질문
초기 MVP에 외부 연동을 포함할 것인가?

AI 결론
포함하지 않는 것이 적절합니다.

핵심 차이
선택안은 병합 기능 검증에 집중하고,
다른 의견들은 협업/연동 제품으로 범위를 확장합니다.

사람이 결정할 질문
이번 MVP의 목적은 병합 품질 검증인가, 협업 워크스페이스 검증인가?
```

## 6. 의견 비교 카드

각 의견 카드는 같은 형식으로 보여준다.

```text
플랜 이름
한 줄 요약
선택안과 다른 점
좋은 점
아쉬운 점
채택 시 바뀌는 것
AI 판단
출처
```

예시:

```text
대안 A: Notion 연동 포함

한 줄 요약
초기 MVP에서 Notion으로 결과를 내보낼 수 있게 한다.

선택안과 다른 점
붙여넣기 기반 MVP에 외부 문서 도구 연동이 추가된다.

좋은 점
실제 팀 업무 흐름에 더 가까워진다.

아쉬운 점
API 연동, 인증, 예외 처리가 필요해 초기 개발 범위가 커진다.

채택 시 바뀌는 것
MVP 범위, 인증 여부, 외부 API 처리

AI 판단
2차 기능으로 미루는 것이 적절하다.
```

## 7. 충돌 분석 카드

충돌 의견은 더 강하게 구조화해서 보여준다.

```text
충돌 의견
충돌 대상
왜 충돌하는가
채택하면 무엇이 바뀌는가
결정해야 할 질문
AI 권고
```

예시:

```text
충돌 의견
초기 MVP부터 실시간 공동 편집을 제공한다.

충돌 대상
텍스트 붙여넣기 기반 단일 페이지 MVP

왜 충돌하는가
실시간 공동 편집은 팀 초대, 권한, 동기화, 충돌 해결 기능을 요구한다.

채택하면 무엇이 바뀌는가
서비스 정의가 병합 도구에서 협업 문서 편집 도구로 넓어진다.

결정해야 할 질문
우리가 먼저 검증하려는 것은 AI 병합 판단인가, 실시간 협업 경험인가?

AI 권고
현재 MVP에서는 제외하고 추후 확장 후보로 남긴다.
```

## 8. AI 응답 구조

Merge Decisions 응답에 `comparisonGroups`를 추가한다.

```ts
type ComparisonGroup = {
  id: string;
  sectionKey: string;
  sectionTitle: string;
  topic: string;
  decisionQuestion: string;
  aiConclusion: string;
  keyDifferenceSummary: string;
  humanDecisionQuestion: string;
  selectedOptionId: string;
  options: ComparisonOption[];
};

type ComparisonOption = {
  id: string;
  optionType:
    | "selected"
    | "same_direction"
    | "compatible_alternative"
    | "tradeoff"
    | "direct_conflict"
    | "out_of_scope";
  label: string;
  summary: string;
  content: string;
  differenceFromSelected: string;
  strengths: string[];
  weaknesses: string[];
  scopeImpact: string[];
  riskLevel: "low" | "medium" | "high";
  aiRecommendation:
    | "select"
    | "keep_as_alternative"
    | "defer"
    | "reject_for_mvp"
    | "needs_human_decision";
  scores: {
    goalFit: number;
    userValue: number;
    mvpFeasibility: number;
    scopeControl: number;
    riskReduction: number;
    validationSpeed: number;
    total: number;
  };
  sourceIdeaIds: string[];
  sourceExcerpts: string[];
};
```

## 9. AI 프롬프트 추가 지시문

```text
서로 다른 의견을 단순히 나열하지 말고 comparisonGroups로 구조화하세요.

각 comparisonGroup은 하나의 판단 질문을 가져야 합니다.
예:
- 초기 MVP에 외부 연동을 포함할 것인가?
- 초기 타깃을 스타트업 팀으로 할 것인가, 대학생 팀으로 할 것인가?
- 최종 문서를 자동 생성할 것인가, 사용자가 직접 조립하게 할 것인가?

각 옵션은 같은 비교 축으로 평가하세요.

반드시 아래를 구분하세요.
- 같은 방향의 의견
- 함께 갈 수 있는 대안
- 장단점이 갈리는 트레이드오프
- 동시에 성립하기 어려운 직접 충돌
- 현재 MVP 범위를 벗어난 의견

사용자가 빠르게 이해할 수 있도록 keyDifferenceSummary를 작성하세요.
사람이 결정해야 할 핵심 질문을 humanDecisionQuestion에 작성하세요.
```

## 10. 프론트 표시 우선순위

사용자가 빨리 이해하게 하려면 정보 우선순위가 중요하다.

우선순위:

```text
1. 판단 질문
2. AI 결론
3. 핵심 차이 한 줄
4. 비교 테이블
5. 충돌 카드
6. 출처 원문
```

출처 원문은 중요하지만 처음부터 크게 보여주지 않는다. 사용자가 "출처 보기"를 누르면 펼친다.

## 11. 좋은 비교 UX의 기준

아래 질문에 바로 답할 수 있으면 성공이다.

```text
이 섹션에서 무엇을 결정해야 하지?
AI는 무엇을 골랐지?
다른 의견은 정확히 뭐가 다르지?
그 의견을 채택하면 무엇이 바뀌지?
진짜 충돌은 어느 부분이지?
내가 사람으로서 판단해야 할 질문은 뭐지?
```

## 12. 결론

서로 다른 의견 비교는 목록 UI가 아니라 결정 UI여야 한다.

```text
의견 나열
→ 판단 질문 생성
→ 같은 기준으로 비교
→ 핵심 차이 요약
→ 충돌 분리
→ 사람 결정 질문 제시
```

이 구조를 쓰면 사용자는 여러 초안을 다시 읽지 않고도, 어떤 의견을 선택해야 하는지 빠르게 판단할 수 있다.

## 13. Hover Preview용 축약 모델

최종 기획서 위에 커서를 올렸을 때 보여줄 팝업은 전체 비교 모델을 축약해서 사용한다.

```ts
type OpinionHoverPreview = {
  sectionKey: string;
  topic: string;
  decisionQuestion: string;
  selectedSummary: string;
  keyDifferenceSummary: string;
  needsHumanReview: boolean;
  conflictLevel: "none" | "low" | "medium" | "high";
  alternativeCount: number;
  conflictCount: number;
  topAlternatives: {
    id: string;
    label: string;
    summary: string;
    differenceFromSelected: string;
  }[];
  topConflicts: {
    id: string;
    summary: string;
    conflictReason: string;
    severity: "low" | "medium" | "high";
  }[];
};
```

생성 규칙:

```text
1. topAlternatives는 최대 2개만 포함한다.
2. topConflicts는 최대 1개만 포함한다.
3. conflictLevel이 high면 topConflicts를 우선 표시한다.
4. keyDifferenceSummary는 1문장으로 제한한다.
5. source 원문은 hover preview에 길게 보여주지 않고, 자세히 보기에서 펼친다.
```

화면 역할:

```text
Hover Preview:
다른 의견이 있었는지 빠르게 감지

Right Comparison Panel:
비교표, 장단점, 출처까지 상세 검토

Pinned Popover:
현재 문장과 관련된 의견만 임시 고정
```
