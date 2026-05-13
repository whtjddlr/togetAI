# PlanMerge 비교 UX 구조 v0.1

상태: Draft  
목표: AI가 선택한 기획안은 기본 결론으로 보여주되, 사람이 다른 플랜과 충돌 의견을 쉽게 비교하고 검토할 수 있는 사용 구조를 정의한다.

## 1. 핵심 원칙

PlanMerge의 화면 구조는 아래 원칙을 따른다.

```text
AI가 선택한다.
사람은 비교한다.
출처는 추적된다.
충돌은 숨기지 않는다.
```

UX 목표:

```text
1. 사용자는 최종안부터 바로 읽을 수 있어야 한다.
2. 사용자는 왜 선택됐는지 한눈에 이해할 수 있어야 한다.
3. 선택되지 않은 다른 플랜을 숨기면 안 된다.
4. 다른 플랜은 같은 기준으로 비교되어야 한다.
5. 충돌이 큰 섹션은 먼저 눈에 띄어야 한다.
6. 모든 선택지에는 출처 초안이 연결되어야 한다.
```

## 2. 화면 정보 구조

MVP의 Merge Result 화면은 3개 영역으로 구성한다.

```text
┌──────────────────────────────────────────────────────────────┐
│ 상단 요약 바                                                   │
│ 전체 요약 / 검토 필요 섹션 수 / 충돌 수 / AI 확신도             │
├──────────────────────┬───────────────────────────────────────┤
│ 최종 기획서           │ 선택 및 비교 패널                       │
│                      │                                       │
│ 섹션 목록             │ AI 선택안                              │
│ 섹션별 최종 내용       │ 선택 이유                              │
│ 검토 필요 표시         │ 비교 테이블                             │
│                      │ 대안 플랜                               │
│                      │ 충돌 의견                               │
│                      │ 출처 초안                               │
└──────────────────────┴───────────────────────────────────────┘
```

기본 사용 흐름:

```text
1. 사용자는 왼쪽에서 최종 기획서를 읽는다.
2. 특정 섹션을 클릭한다.
3. 오른쪽에서 AI 선택안과 선택 이유를 본다.
4. 같은 섹션의 대안과 충돌 의견을 비교한다.
5. 필요하면 출처 초안을 펼쳐본다.
6. 사람이 승인하거나 선택안을 바꾼다.
```

## 3. 상단 요약 바

상단에는 전체 상태만 빠르게 보여준다.

표시 항목:

```text
병합 요약
전체 섹션 수
AI 자동 선택 섹션 수
검토 필요 섹션 수
충돌 있음 섹션 수
전체 위험도
```

예시:

```text
전체 초안은 방향성이 유사하지만 MVP 범위와 초기 타깃 사용자에서 충돌이 있습니다.

12개 섹션
8개 자동 선택
4개 검토 필요
3개 충돌 있음
위험도: medium
```

## 4. 왼쪽: 최종 기획서 영역

왼쪽 영역은 사용자가 결과물을 빠르게 읽는 공간이다.

섹션 카드 표시 정보:

```text
섹션 제목
최종 기획서 내용
AI 확신도
검토 필요 여부
충돌 수준
대안 개수
```

섹션 상태 표시:

```text
auto_selected: AI 선택 완료
needs_review: 사람 검토 필요
approved: 사람이 승인함
overridden: 사람이 선택안을 바꿈
```

정렬 원칙:

```text
기본 정렬은 기획서 섹션 순서다.
단, 상단 필터로 "검토 필요만 보기", "충돌 있음만 보기"를 제공한다.
```

왼쪽 섹션 예시:

```text
7. MVP 범위

초기 MVP는 텍스트 붙여넣기와 병합 리포트 생성에 집중한다.

검토 필요
충돌: high
대안 2개
```

## 5. 오른쪽: 선택 및 비교 패널

오른쪽 패널은 선택 과정을 보는 공간이다.

탭 구조:

```text
1. 선택 근거
2. 대안 비교
3. 충돌 의견
4. 출처 초안
```

처음 열리는 기본 탭은 `선택 근거`다.

## 6. 선택 근거 탭

AI가 고른 결론을 가장 먼저 보여준다.

표시 정보:

```text
AI 선택안
선택 이유
점수 요약
AI 확신도
검토 필요 이유
```

예시:

```text
AI 선택안
초기 MVP는 텍스트 붙여넣기와 병합 리포트 생성까지만 포함한다.

선택 이유
프로젝트 목표가 병합 기능의 유용성 검증이므로 외부 연동보다 핵심 병합 흐름을 먼저 검증하는 것이 적절하다.

점수
목표 적합성 24/25
MVP 실현 가능성 19/20
문제 해결력 18/20
구체성 13/15
초안 간 지지 8/10
리스크 감소 9/10
총점 91/100
```

## 7. 대안 비교 탭

대안 비교는 반드시 같은 기준으로 보여준다.

비교 테이블 컬럼:

```text
플랜
내용
목표 적합성
MVP 가능성
문제 해결력
리스크
차이점
출처
```

예시:

```text
| 플랜 | 내용 | 목표 적합성 | MVP 가능성 | 문제 해결력 | 리스크 | 차이점 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| AI 선택안 | 텍스트 붙여넣기 + 병합 리포트 | 높음 | 높음 | 높음 | 낮음 | 가장 작게 검증 가능 |
| 대안 A | Notion 연동 포함 | 중간 | 낮음 | 중간 | 중간 | 외부 문서 도구 연동 필요 |
| 대안 B | Slack 연동 포함 | 중간 | 낮음 | 중간 | 중간 | 팀 커뮤니케이션 연동 필요 |
```

대안은 단순 목록이 아니라 비교 가능한 플랜으로 보여준다.

대안 카드에 필요한 정보:

```text
대안 이름
대안 내용
선택안과 다른 점
장점
단점
리스크
출처 초안
```

## 8. 충돌 의견 탭

충돌은 대안과 구분한다.

구분 기준:

```text
alternative:
선택안과 다르지만 나중에 붙일 수 있는 의견

conflict:
선택안과 동시에 성립하기 어렵거나 방향을 바꾸는 의견
```

예시:

```text
선택안:
초기 MVP는 텍스트 붙여넣기 기반으로 한다.

alternative:
2차 버전에서 Notion 연동을 추가한다.

conflict:
초기 MVP부터 실시간 공동 편집을 핵심 기능으로 제공한다.
```

충돌 카드 표시 정보:

```text
충돌 의견
무엇과 충돌하는지
충돌 심각도
채택 시 바뀌는 범위
사람이 결정해야 할 질문
출처 초안
```

예시:

```text
충돌 의견
초기 MVP부터 실시간 공동 편집을 포함한다.

충돌 이유
현재 선택안은 붙여넣기 기반 단일 페이지 MVP인데, 실시간 공동 편집은 팀 기능과 권한 관리까지 요구한다.

채택 시 바뀌는 범위
MVP 범위, DB 설계, 인증, 동시 편집 처리

결정 질문
초기 검증 목표가 병합 품질 검증인가, 협업 워크스페이스 검증인가?
```

## 9. 출처 초안 탭

출처는 기본적으로 접어두고, 필요할 때 펼친다.

표시 정보:

```text
작성자
작성자 역할
사용한 AI
작업 주제
관련 원문 발췌
연결된 선택지
```

출처 표시 예시:

```text
민수 / PM / ChatGPT / MVP 범위
"초기 MVP는 텍스트 붙여넣기 기반으로 빠르게 검증해야 한다."

지현 / Designer / Claude / 협업 흐름
"Notion이나 Slack에 연결되어야 팀이 실제로 사용할 가능성이 높다."
```

## 10. 사용자가 보기 쉬운 라벨

DB enum을 그대로 노출하지 않는다.

화면 라벨:

```text
selected → AI 선택안
alternative → 다른 플랜
conflict → 충돌 의견
rejected → 제외된 의견

none → 충돌 없음
low → 낮음
medium → 중간
high → 높음

auto_selected → AI 선택
needs_review → 검토 필요
approved → 승인됨
overridden → 변경됨
```

## 11. 비교 가능성을 위한 데이터 구조

프론트 ViewModel은 최종 문서와 비교 패널을 바로 그릴 수 있어야 한다.

```ts
type MergeComparisonViewModel = {
  summary: {
    text: string;
    sectionCount: number;
    autoSelectedCount: number;
    needsReviewCount: number;
    conflictCount: number;
    overallRiskLevel: "low" | "medium" | "high";
  };

  finalDocument: {
    title: string;
    sections: {
      sectionId: string;
      sectionKey: string;
      title: string;
      content: string;
      sortOrder: number;
      status: "auto_selected" | "needs_review" | "approved" | "overridden";
      confidence: number;
      conflictLevel: "none" | "low" | "medium" | "high";
      alternativeCount: number;
      conflictCount: number;
    }[];
  };

  decisionTraceBySection: Record<
    string,
    {
      sectionId: string;
      sectionKey: string;
      sectionTitle: string;
      topic: string;
      selectedPlan: ComparedPlan;
      alternatives: ComparedPlan[];
      conflicts: ConflictPlan[];
      sources: SourceExcerpt[];
      needsHumanReview: boolean;
      reviewReason: string;
    }
  >;
};

type ComparedPlan = {
  id: string;
  label: string;
  type: "selected" | "alternative" | "rejected";
  content: string;
  differenceFromSelected: string;
  strengths: string[];
  weaknesses: string[];
  risk: "low" | "medium" | "high";
  scores: {
    goalFit: number;
    mvpFeasibility: number;
    userProblemFit: number;
    specificity: number;
    supportAcrossDrafts: number;
    riskReduction: number;
    total: number;
  };
  sourceIdeaIds: string[];
  sourceExcerpts: string[];
};

type ConflictPlan = {
  id: string;
  content: string;
  conflictsWith: string;
  conflictReason: string;
  severity: "low" | "medium" | "high";
  scopeImpact: string[];
  decisionQuestion: string;
  sourceIdeaIds: string[];
  sourceExcerpts: string[];
};

type SourceExcerpt = {
  sourceId: string;
  authorName: string;
  authorRole?: string;
  aiModel?: string;
  taskTitle?: string;
  excerpt: string;
  linkedPlanIds: string[];
};
```

## 12. AI 응답에 추가해야 할 필드

기존 Decision Block 응답에 아래 필드를 추가하면 비교 UI가 쉬워진다.

```ts
type DecisionOption = {
  optionType: "selected" | "alternative" | "conflict" | "rejected";
  content: string;
  differenceFromSelected: string;
  strengths: string[];
  weaknesses: string[];
  risk: "low" | "medium" | "high";
  scores: {
    goalFit: number;
    mvpFeasibility: number;
    userProblemFit: number;
    specificity: number;
    supportAcrossDrafts: number;
    riskReduction: number;
    total: number;
  };
  conflictReason?: string;
  scopeImpact?: string[];
  decisionQuestion?: string;
  sourceIdeaIds: string[];
  sourceExcerpts: string[];
};
```

## 13. AI 프롬프트 추가 지시문

Merge Decisions 프롬프트에 아래 지시문을 추가한다.

```text
각 선택지는 사람이 비교할 수 있도록 같은 기준으로 설명하세요.

각 option에는 다음을 포함하세요.
- 선택안과의 차이점
- 장점
- 단점
- 리스크 수준
- 기준별 점수
- 출처 ideaId
- 출처 원문 발췌

conflict option에는 추가로 다음을 포함하세요.
- 무엇과 충돌하는지
- 왜 충돌하는지
- 채택하면 어떤 범위가 바뀌는지
- 사람이 결정해야 할 질문

대안은 숨기지 마세요.
AI가 선택한 플랜을 기본 결론으로 제시하되, 다른 플랜을 비교 가능한 형태로 보존하세요.
```

## 14. MVP에서 꼭 필요한 인터랙션

1차 구현에 필요한 인터랙션:

```text
1. 섹션 클릭
2. 선택 근거 보기
3. 대안 비교 탭 보기
4. 충돌 의견 탭 보기
5. 출처 초안 펼치기
6. 검토 필요 섹션만 필터링
```

2차 구현에 추가할 인터랙션:

```text
1. AI 선택안 승인
2. 대안으로 선택안 변경
3. 변경 이유 입력
4. 변경 후 최종 기획서 섹션 내용 재생성
```

## 15. 최종 UX 한 문장

```text
PlanMerge는 AI가 선택한 기획안을 기본값으로 보여주고,
사람이 같은 기준으로 다른 플랜과 충돌 의견을 비교한 뒤 승인하거나 바꿀 수 있게 한다.
```

## 16. 의견 비교 분석 확장

서로 다른 의견은 단순 목록이 아니라 `판단 질문 + 비교 축 + 선택지`로 보여준다.

예시:

```text
판단 질문:
초기 MVP에 외부 연동을 포함할 것인가?

AI 결론:
포함하지 않는 것이 적절하다.

핵심 차이:
선택안은 병합 기능 검증에 집중하고, 다른 의견들은 협업/연동 제품으로 범위를 확장한다.
```

자세한 비교 분석 모델은 아래 문서를 따른다.

```text
docs/planmerge-opinion-comparison-model.md
```

## 17. Hover Preview 팝업

최종 기획서의 섹션이나 문장 위에 커서를 올리면, 해당 부분과 연결된 다른 의견을 작은 팝업으로 보여준다.

목표:

```text
사용자가 오른쪽 패널을 열기 전에,
이 내용에 어떤 다른 의견과 충돌이 있었는지 빠르게 훑어볼 수 있게 한다.
```

기본 동작:

```text
hover:
작은 미리보기 팝업을 연다.

click:
팝업을 고정하고 오른쪽 비교 패널을 해당 섹션으로 이동한다.

keyboard focus:
hover와 동일하게 팝업을 연다.

mobile tap:
하단 sheet 또는 작은 drawer로 연다.
```

팝업에 들어갈 정보:

```text
판단 질문
AI 선택안 한 줄
다른 의견 개수
충돌 의견 개수
핵심 차이 한 줄
상위 대안 2개
충돌 의견 1개
자세히 보기 버튼
```

예시:

```text
판단 질문
초기 MVP에 외부 연동을 포함할 것인가?

AI 선택
텍스트 붙여넣기와 병합 리포트 생성에 집중

다른 의견
Notion 연동 포함
Slack 연동 포함

충돌
실시간 공동 편집 포함

핵심 차이
선택안은 병합 검증에 집중하고, 다른 의견은 협업 제품으로 범위를 넓힌다.
```

팝업 규칙:

```text
1. 팝업은 요약만 보여준다.
2. 긴 비교표는 오른쪽 패널에서 보여준다.
3. 대안은 최대 2개만 노출한다.
4. 충돌은 있으면 반드시 1개 이상 노출한다.
5. 충돌이 high이면 팝업 상단에 "검토 필요"를 표시한다.
6. 사용자가 팝업 안으로 마우스를 이동해도 닫히지 않는다.
7. 바깥 영역을 클릭하거나 Esc를 누르면 닫힌다.
```

시각적 강조:

```text
최종 기획서에서 비교 가능한 문장 또는 섹션은 얇은 점선 밑줄로 표시한다.
충돌이 있는 섹션은 왼쪽에 작은 상태 마커를 둔다.
검토 필요 섹션은 섹션 제목 옆에 "검토 필요" 배지를 둔다.
```

권장 컴포넌트:

```text
Desktop:
Popover + HoverCard

Mobile:
Bottom Sheet 또는 Drawer

Pinned comparison:
오른쪽 Side Panel
```

주의:

```text
hover 팝업은 빠른 미리보기다.
최종 판단과 상세 비교는 오른쪽 패널에서 한다.
```
