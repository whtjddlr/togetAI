# 팀 협업 전환 설계 — 초안 원격 제출과 피드백 영속화

팀 사용성 감사에서 확인된 차단급 문제 두 가지를 푸는 설계다:

- **차단 1**: 팀원이 공유 링크에서 할 수 있는 일이 투표·의견뿐이라, 초안은 한 명이 자기 브라우저에 전부 붙여넣어야 한다.
- **차단 2**: 재분석 → 재공유가 매번 새 워크스페이스 ID를 만들어 기존 투표·의견이 전부 고아가 된다. 소유자는 자기 화면에서 피드백을 볼 수 없다.

## 설계 원칙

1. **Auth를 기다리지 않는다.** 공유 링크 만료·회수에서 만든 관리 토큰(manage token) 모델이 이미 "소유자 증명"을 제공한다. 차단 1·2는 이 토큰으로 풀고, Auth(Stage B)는 이 구조를 흡수한다.
2. **투표는 이어붙이지 않고 버전으로 보존한다.** 재분석은 Decision Block ID를 재생성하므로, 옛 투표를 새 선택지에 "매핑"하는 것은 어떤 휴리스틱을 쓰든 유권자의 의사를 왜곡한다. 정직한 모델은: 스냅샷을 버전으로 쌓고, 투표·의견은 자기 버전에 남으며, 소유자는 이전 버전 피드백을 조회할 수 있다.
3. **원격 초안은 다른 초안과 똑같이 불신한다.** 제출된 초안은 기존 파이프라인의 untrusted-input 방어(프롬프트 문구 + 구조 검증)를 그대로 통과한다. 새 방어층이 필요 없도록 기존 경로로만 흘린다.

---

## Stage A1 — 초안 원격 제출

### 데이터 모델 (prisma/schema.prisma)

```prisma
model SharedWorkspaceDraft {
  id           String   @id @default(uuid())
  workspaceId  String
  authorName   String
  aiModel      String
  taskTitle    String
  rawText      String
  status       String   @default("pending") // pending | imported | dismissed
  anonymousKey String
  createdAt    DateTime @default(now())

  workspace SharedWorkspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, status, createdAt])
}
```

정규화 테이블(`DraftSubmission`)을 쓰지 않는 이유: 그 테이블은 `Project` FK를 요구하는데 Project 행이 아직 존재하지 않는다. Stage B에서 `SharedWorkspaceDraft` → `DraftSubmission`으로 승격한다.

### API

| 엔드포인트 | 권한 | 규칙 |
|---|---|---|
| `POST /api/workspaces/[id]/drafts` | 링크 접근자 | 만료/회수 검사(410), rate limit 5/분, `rawText` ≤ 50,000자, 워크스페이스당 pending ≤ 50건(초과 시 409), 필드 검증은 `parsePlanMergeAnalysisPayload`의 draft 규칙과 동일 한도 |
| `GET /api/workspaces/[id]/drafts` | 링크 접근자 | pending 목록(투명성 — 팀원끼리 서로의 제출을 볼 수 있다), 본문은 앞 200자 미리보기 + 전체는 소유자만? → v1은 전체 반환(링크 소지 = 열람 권한이 현 모델) |
| `PATCH /api/workspaces/[id]/drafts/[draftId]` | **관리 토큰** | status 변경(imported/dismissed). 제출자 본인(`anonymousKey` 일치)은 자기 pending 초안 dismissed 가능 |

### UX

- **공유 뷰**: "초안 제출" 폼 추가(작성자 이름, 사용한 AI, 주제, 본문). 읽기 전용 배너 문구 갱신: "투표·의견·초안 제출만 반영됩니다."
- **소유자(로컬 모드)**: 초안 입력 페이지에 "공유로 제출된 초안 N건" 패널. 각각 미리보기 + [가져오기] → 로컬 초안으로 추가(authorName 보존) + 서버 status=imported. [무시] → dismissed.
- 소유자가 공유 중인지 여부는 `sharedWorkspaceOwnerStore`(관리 토큰 저장소)로 판별한다.

### 한계 (의도된 v1 범위)

- 소유자 알림은 폴링 없음 — 초안 페이지 진입 시 조회. (Phase 4에서 폴링/알림)
- 제출자는 제출 후 수정 불가(삭제 후 재제출).

## Stage A2 — 같은 링크 유지 + 피드백 버전 보존

### 데이터 모델 변경

```prisma
model SharedWorkspace {
  // 기존 필드 유지 +
  snapshotVersion Int @default(1)
}
// SharedWorkspaceVote / SharedWorkspaceOpinion에 각각 +
//   snapshotVersion Int @default(1)
// @@unique([workspaceId, decisionBlockId, anonymousKey]) →
//   @@unique([workspaceId, snapshotVersion, decisionBlockId, anonymousKey])
```

이전 버전 스냅샷 본문은 v1에서는 보관하지 않는다(투표 집계 숫자만 버전별로 남는다). 스냅샷 이력 보관은 Stage B 정규화에서.

### API

- `PUT /api/workspaces/[id]` + `x-manage-token`: 스냅샷 교체, `snapshotVersion` +1, `expiresAt` 재연장(30일). 검증은 POST와 동일(`parseWorkspaceImport`).
- 투표/의견 POST는 현재 `snapshotVersion`을 찍어 저장. 집계(GET participation)는 현재 버전만 기본 반환, `?version=` 쿼리로 과거 버전 집계 조회(소유자 UI용).

### 클라이언트

- **재공유 = 같은 링크 갱신**: `shareWorkspace`는 저장된 관리 토큰이 있으면 PUT(링크 유지, "공유 링크를 새 분석으로 갱신했습니다. 기존 링크가 계속 유효합니다."), 없으면 POST(신규). "새 링크로 공유"는 별도 액션으로 남긴다.
- **소유자 피드백 인라인 표시**: 로컬 모드 DecisionPanel이, 저장된 공유 ID가 있고 현재 `analysisRunId`가 마지막 공유 시점과 일치하면 해당 블록의 투표·의견 집계를 함께 표시한다. 일치하지 않으면 "공유본과 분석 버전이 달라 집계를 표시하지 않습니다 — 공유를 갱신하세요" 안내.
- 공유 뷰는 자신이 보는 스냅샷 버전 기준으로만 투표한다(버전 불일치 투표는 서버가 409로 거부 — 갱신 직후 열린 옛 화면 보호).

## Stage B — Auth 흡수 경로 (요약)

- NextAuth v5 + `User`/`Organization`/`Membership`. `SharedWorkspace.createdById`를 User FK로, 관리 토큰은 폴백 수단으로 강등(소유자 로그인 시 토큰 없이 관리).
- `SharedWorkspaceDraft` → `DraftSubmission`(Project 승격 시 이관), 버전별 투표는 `DecisionBlock`/`AnonymousVote` 정규화 테이블로.
- 익명 키는 "조직 내부 익명"(멤버 인증 후 익명 기록)과 "외부 익명"(링크 기반)으로 분리.

## 배포 순서

1. Stage A1 스키마+코드 (이 브랜치 열차에 추가, `prisma db push` 대기)
2. **db push → share-link-expiry부터 순서대로 merge** ← 현재 유일한 외부 블로커
3. Stage A2 (버전 컬럼은 A1과 같은 push에 포함 가능)
4. Stage B는 별도 설계 리뷰 후

## 검증 계획

- 품질 하네스: 원격 초안도 기존 draft 검증을 통과해야 하므로 신규 케이스 불필요(경로 동일). 단, pending 50건 초과·본문 한도 케이스는 라우트 레벨이라 E2E/수동 확인.
- E2E: DB 없는 CI에서는 제출 API가 503 — 로컬 흐름(소유자 패널 비표시)만 단언. DB 있는 환경 검증은 db push 후 수동 1회 + 추후 DB-포함 E2E 잡.
