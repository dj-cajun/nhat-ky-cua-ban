# 20 — 학교 신뢰 경계 기획 (School Trust Boundary)

> **상태**: Phase A·B·C·D(최소) 완료 · **B.1/H DEFERRED** · **Phase E** ([22](./22-phase-e-space-design.md))
> **최종 갱신**: 2026-07-25  
> **선행 마이그레이션**: `018` 이후 **forward-only** (`019+`). `007–018` 수정 금지.  
> **레거시**: `001` `schools`/`classes`는 **재사용하지 않는다** (의미·모델 혼선 방지).  
> **구현**: `supabase/migrations/019_school_trust_boundary.sql`

---

## 제품 문장

> **Your Diary는 같은 학교라는 신뢰의 경계 안에서 작은 서클을 만들고, 각자의 하루를 조용히 남기고 방문하는 폐쇄형 관계 다이어리다.**

역할 분리:

> 학교는 “누가 이 생태계 안으로 들어올 수 있는가”를 정하고,  
> 서클은 “누구와 실제 관계를 맺는가”를 정하며,  
> 다이어리는 “그 관계 안에서 무엇을 하는가”를 담당한다.

```text
학교 = 접근 경계 (커뮤니티 아님)
서클 = 실제 관계 단위
다이어리 = 제품의 중심
```

올바른 경로:

```text
학교 인증
→ 내 우주
→ 내가 승인받은 서클
→ 서클 멤버
→ 각자의 다이어리
```

---

## `019` 전에 고정하는 네 원칙

이 네 가지는 RLS·RPC·Edge·클라이언트 **전 계층**에 그대로 들어가야 한다.  
문서·코드 리뷰에서 하나라도 어기면 Phase B는 미완료다.

### 1) 학교 인증 ≠ 서클 가입

```text
학교 인증 완료
≠
서클 가입 가능
```

- 학교 인증은 **같은 학교라는 사실만** 증명한다.
- 서클 접근은 여전히 **초대 → 추천 → 승인 → 서버 최종 판단**을 거친다.
- 같은 학교 verified 사용자라도 **비서클이면** 그 서클의 다이어리·공지·투표·가명보드·쪽지를 읽지 못한다.
- 학교 멤버십만으로 전교(또는 해당 학교의 모든 서클)에 접근하는 구조는 **버그**다.

### 2) `school_id`는 클라이언트 값을 믿지 않는다

클라이언트가 보내는:

```text
school_id = ...
```

를 **그대로 저장·인가에 쓰지 않는다.**

| 연산 | 서버 동작 |
|------|-----------|
| 서클 생성 | `auth.uid()`의 **활성 verified** `school_memberships`를 조회해 `circles.school_id`를 **서버가 결정** |
| 초대 생성 | 초대자 membership.school_id == 서클.school_id 재확인 |
| 초대 수락 / 추천 / 승인 | **양쪽** 사용자 membership과 서클 school_id 일치 재확인 |
| 가입·멤버 삽입 | 위와 동일 + 기존 3인 추천 규칙 |
| 읽기 경로 | RLS에서 membership ∩ circle.school_id ∩ circle membership |

위조된 `school_id`는 무시되거나 `FORBIDDEN`이다.

### 3) 학교 변경은 프로필 수정이 아니다

학교 변경은 **권한 라이프사이클 이벤트**다. 기존 서클을 **자동 이전하지 않는다.**

베타 보수 정책 (**채택**):

```text
전학/변경 요청
→ 기존 membership = pending_change (또는 동등 상태)
→ 즉시: 새 서클 가입·개척·초대·추천 불가
→ 기존 서클: 운영 승인 전까지 읽기 유지 가능,
             쓰기·초대·추천 권한은 제한
→ 운영 승인
→ 새 학교 verified
→ 기존 서클 멤버십: 자동 이전 없음
   (유지 / 종료 / 수동 처리 — 운영 결정, 기본은 종료 또는 읽기 전용 후 sunset)
```

핵심: **자동으로 옛 서클을 새 학교로 옮기지 않는다.**

### 4) 학교 코드는 인증의 한 요소일 뿐이다

```text
학교 코드 입력
→ 학교 후보 확인
→ 추천 또는 운영 승인
→ 서버 검증
→ verified
```

- 코드 유출만으로 **학교 학생 전체 입장 불가**.
- 코드만으로 즉시 `verified` 금지 (운영자 전용 초소형 테스트 스쿨 예외는 별도 문서화·감사 로그).
- 평문 코드 DB 저장 금지 → 해시 + rate limit + 감사 이벤트.

---

## 공통 인가 술어 (전 기능)

서클 스코프 데이터(공지·투표·가명보드·쪽지·공유 다이어리·Presence)에 접근하려면 **모두** 만족:

```text
active verified school membership
AND circle.school_id matches membership.school_id
AND active circle membership
AND not blocked / not school-suspended
```

학교 일치만 확인하고 서클 멤버십을 빼먹으면 → **사실상 학교 전체 접근** → 치명 결함.

---

## 하지 않을 것 (Anti-product)

| 금지 | 이유 |
|------|------|
| 학교 전체 피드 / 반별 피드 | 커뮤니티 SNS |
| 학교 전체 익명·인기 게시판 | 다이어리 중심 붕괴 |
| 전교생 검색·학생 목록 | 폐쇄성·안전 위반 |
| 팔로워·좋아요·조회수·랭킹 | 관계 다이어리와 반대 |
| 실시간 채팅·타이핑·읽음 | 편지 모델과 충돌 |
| 다이어리 방문 알림·방문자 목록 | 감시 압박 |
| 꾸미기 상점·코인 | 감성 오브제 ≠ 경제 |
| `001` schools 억지 재사용 | 레거시·서클 v1 혼선 |

---

## Phase A — 현재 상태 감사 (요약)

| 구분 | 내용 |
|------|------|
| ✅ 있음 | 3인 개척/추천, Universe→graph→diary, Presence, 공지/투표, 가명보드, 쪽지, 신고/차단, Spotify |
| 부분 | `001` schools(미연결), founding UI(미마운트), ops 데모 게이트 |
| ❌ 없음 | school membership, circles.school_id, 교차학교 deny, 코드+추천 온보딩, 변경 라이프사이클, ephemeral signals |
| 재사용 | RLS/RPC 패턴, 추천 파이프라인, alias/쪽지 누수 테스트, circle-visit 내비 |
| 마이그레이션 | 최신 `018` → 다음 **`019` 신규**. `007–018` 수정 금지 |

---

## Phase B — `019` 최소 구조

> 테이블 이름은 구현 시 `yd_` 접두 여부를 코드 컨벤션에 맞춘다. 아래는 **필수 개념**.

```text
schools
school_memberships
school_invite_codes
school_verification_requests
school_change_requests
school_audit_events
```

### 역할

| 테이블 | 역할 |
|--------|------|
| `schools` | 운영자 등록 학교 (`active`/`archived`) |
| `school_memberships` | user↔school. status: `pending` / `verified` / `rejected` / `suspended` / `expired` / `pending_change` |
| `school_invite_codes` | 코드 해시·만료·사용 한도·school_id (평문 없음) |
| `school_verification_requests` | 코드 제출·vouch·수동 검토 큐 |
| `school_change_requests` | 전학/정정. 자동 서클 이전 없음 |
| `school_audit_events` | 인증·거절·정지·코드 사용·변경 승인 감사 |

### `circles.school_id` 마이그레이션 순서 (안전)

바로 `NOT NULL`을 걸지 않는다.

1. **nullable** `circles.school_id` 추가 + FK → `schools`  
2. 베타/시드 학교 생성 후 **기존 서클 백필**  
3. 무결성 검사: null 행 0, orphan 0  
4. 이후 마이그레이션(또는 같은 `019` 후반)에서 **`NOT NULL`**  
5. 신규 서클 생성 RPC는 서버가 school_id를 채움 (클라이언트 입력 무시)

`001`의 schools 테이블과 **조인·공존 의존 금지**. 신규 데이터만 참고 가능.

---

## 인가·RLS 매트릭스

| 액터 | 서클 생성 | 서클 읽기 | 초대/추천 | 공유 다이어리 | 가명보드 | 쪽지 |
|------|-----------|-----------|-----------|---------------|----------|------|
| 같은 학교 · 서클 멤버 | ✅ | ✅ | ✅ | 가시성 규칙 | ✅ | ✅ |
| 같은 학교 · 비서클 | 개척만 해당 규칙 | ❌ | 초대받은 경우만 진행 | ❌ | ❌ | ❌ |
| 다른 학교 verified | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| unverified / pending | ❌ | ❌ | ❌ | 본인 다이어리만 | ❌ | ❌ |
| suspended / expired | ❌ | ❌ | ❌ | 본인만 | ❌ | ❌ |
| pending_change (베타) | ❌ 신규 가입·개척 | 기존 서클 읽기 가능 | ❌ | 기존 공유 읽기 / 쓰기 제한 | 쓰기 제한 | 쓰기 제한 |
| blocked | 기존 차단 우선 | | | | | |
| moderator | 검토 콘솔만 (모바일 광역 어드민 금지) | | | | | |

---

## Phase B 필수 deny 테스트

허용 테스트보다 **거절**이 핵심이다.

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 같은 학교 · 서클 비멤버 | 서클 내부 데이터 거절 |
| 2 | 다른 학교 verified | 전면 거절 |
| 3 | 학교 미인증 | 전면 거절 (본인 다이어리 제외) |
| 4 | suspended membership | 거절 |
| 5 | expired membership | 거절 |
| 6 | 클라이언트가 다른 `school_id` 위조해 서클 생성 | 서버가 무시/거절, 저장 school_id = 실제 membership |
| 7 | 초대 링크만 가진 다른 학교 사용자 | 수락 거절 |
| 8 | 추천자가 다른 학교 사용자를 추천 | 추천 거절 |
| 9 | 계정 전환 후 이전 학교·서클 캐시 접근 | 미스/거절 · 캐시 무효 |
| 10 | 차단된 사용자가 “학교만 같음”으로 접근 | 차단 우선 거절 |

회귀: 기존 `tests/security/*` + 다이어리·공지·투표·가명보드·쪽지 경로에 school predicate 적용 확인.

---

## Phase B 완료 기준

테이블이 생긴 것만으로는 **완료가 아니다.**

- [x] 서클 생성 시 **서버가** school을 결정 (클라이언트 `school_id` 무시)
- [x] 교차학교 가입·추천·초대가 **모두** 거절
- [x] 학교 미인증자는 기존 서클 내부 데이터 접근 불가
- [x] 다이어리·공지·투표·가명보드·쪽지 인가에 학교 경계 적용
- [x] 위 deny 테스트 작성 (Vitest 계약 + local mirror + SQL 체크리스트)
- [x] 기존 서클 데이터 백필 + `school_id NOT NULL` 적용 완료
- [x] 계정 전환·캐시 제거는 기존 session isolation + school membership 재조회 경로로 유지
- [x] typecheck / unit / security / mobile tests (본 PR에서 실행)

UI·포커스룸·꾸미기·학교 홈/검색은 Phase B 범위 밖. **권한 모델 결합이 먼저.**

---

## Phase B 완료 보고

### `019` 신규 마이그레이션

| 항목 | 내용 |
|------|------|
| 파일 | `supabase/migrations/019_school_trust_boundary.sql` |
| 테이블 | `schools_v2`, `school_memberships`, `school_invite_codes`, `school_verification_requests`, `school_change_requests`, `school_audit_events` |
| 레거시 격리 | `001` `schools`/`classes` 미참조 |
| `circles.school_id` | nullable 추가 → 베타 시드 학교로 백필 → 무결성 검사 → `NOT NULL` |
| 시드 | `Your Diary Beta School` + 코드 해시(`BETA-SCHOOL-2026`) |

### 공통 권한 함수

```text
is_verified_school_member(user, school)     -- write 자격
is_school_member_for_access(user, school)   -- verified | pending_change
can_access_circle(user, circle)             -- 읽기
can_write_circle(user, circle)              -- 쓰기
assert_can_write_circle(circle)
can_write_shared_with(other)                -- 방명록 등 공유 쓰기
can_write_circle_from_topic(topic, user)    -- Presence publish
```

`is_circle_member` / `is_active_circle_member` / `shares_open_circle` / Presence subscribe는 **access**로 재정의.  
`pending_change`는 읽기 가능 · 쓰기/초대/추천 불가.

### 추가·교체된 RPC 목록

| RPC | 변경 |
|-----|------|
| `open_circle_from_draft` | 서버가 proposer verified school 할당 · 개척자 동일 학교 |
| `create_circle_join_request` | 신청자 학교 = 서클 학교 |
| `respond_circle_recommendation` | 추천자 write + 신청자 학교 |
| `create_circle_post` | `assert_can_write_circle` |
| `acknowledge_circle_notice` / `respond_circle_poll` / `close_circle_post` | write 게이트 |
| `create_anonymous_post` / `get_or_create_circle_alias` / `delete_anonymous_post` | write |
| `send_named_message` / `send_alias_message` / `reply_to_private_message` / `_send_private_message` | sender write · recipient access |
| `can_view_diary_entry` | `can_access_circle` |
| `get_circle_invite_preview` | 타교/미인증 → `NOT_FOUND` (메타 누수 차단) |
| `submit_school_invite_code` | **pending만** (자동 verified 금지) |
| `get_my_school_membership` | 상태 조회 |
| `ops_review_school_verification` / `ops_list_school_verification_requests` | 승인·거절 |
| `request_school_change` / `ops_review_school_change` | 변경 검토 · 서클 자동 이전 없음 |

RLS: `guestbook_insert` → `can_write_shared_with`. Presence publish → write topic helper.

### 기존 서클 백필 결과

```text
nullable school_id 추가
→ 시드 베타 학교로 NULL 행 UPDATE
→ SCHOOL_BACKFILL_INCOMPLETE 가드
→ NOT NULL
```

베타 단일 시드이므로 교차학교 혼합 서클은 발생하지 않음. 향후 다학교 환경에서는 **자동 백필 금지 · 운영 검토 큐**가 필요 (잔여 리스크).

### 교차학교 deny / 미인증·정지·변경 테스트

| 계층 | 위치 |
|------|------|
| 도메인 계약 | `tests/security/school-boundary-access.test.ts` |
| 로컬 미러 공격 | `mobile/src/features/local/school-boundary.test.ts` |
| SQL 수동 체크리스트 | `supabase/tests/019_school_boundary_checklist.sql` |

핵심 공격: **다른 학교 verified + 유효 초대 링크 + 알려진 circle/content id** → 미리보기·가입·가명보드·다이어리·쪽지·사진 전부 거절.

### 최소 UI (Phase B)

| 화면 | 경로 |
|------|------|
| 코드 입력·상태 | `mobile/app/school/index.tsx` |
| ops 승인·거절 | `mobile/app/ops/school-verifications.tsx` |

학교 목록·학생 검색·학교 홈 **없음**.

### 남은 운영 리스크 → Phase B.1 차단 항목

출시 전 차단으로 격상. 상세는 아래 **Phase B.1** 절.

1. staging 실제 JWT 침투 (`020` 체크리스트)
2. 혼재 서클 ops 큐 (`020` incidents + freeze)
3. ops role 하드코딩 제거 (`is_app_moderator` / local `operatorUserIds`)
4. Presence subscribe vs publish 분리(의도) — staging 재확인
5. 개척자 draft accept 서버 RPC 부재 시 `019+` 보강
6. 계정 전환·stale cache staging 재확인

---

## 베타 학교 인증 흐름

```text
운영자: schools + invite codes 등록
→ 사용자: 코드 입력 (verification_request)
→ membership pending
→ vouch(기존 verified) 또는 운영 승인
→ 서버 verified
→ 그 후에야 서클 개척/초대 대상이 될 수 있음
   (여전히 서클 가입 ≠ 자동)
```

---

## 화면·라우트 (Phase C+, 참고)

| 화면 | 변경 |
|------|------|
| onboarding | 학교 코드 → pending |
| `school/pending` · `rejected` | 상태 화면 |
| settings | 변경 요청 (즉시 이동 없음) |
| circles create/join/recommend | school mismatch 에러 |
| universe | 미인증 시 개척 비활성 |
| diary | `학년 · 같은 서클` 수준만 |
| ops | 인증·변경 큐 (least privilege) |

첫 화면을 학교 게시판/인기글/학생목록으로 만들지 않는다.

---

## 다이어리 · 기척 · 쪽지 (후속 페이즈 요약)

- 다이어리 중심·방문 알림 없음·오브제형 보조 진입 → Phase E  
- Ephemeral circle signals (2–3초, 비저장, 방문 신호 없음) → Phase F  
- 쪽지=편지, 다이어리에서만 시작, 푸시/가명 회귀 → Phase G  

---

## 구현 페이즈

| Phase | 내용 | 상태 |
|-------|------|------|
| **A** | 감사·기획·네 원칙 고정 | ✅ |
| **B** | `019` 스키마·RLS·백필·deny 테스트·권한 결합 | ✅ |
| **B.1 / H** | staging JWT·실기기 출시 게이트 (런북 준비됨) | ⏸ DEFERRED |
| **C** | 학교 온보딩·상태 UX · 최소 ops | ✅ `021` |
| **D** | 베타 ops 최소 (overview·안전·역할) — 성장 분석 없음 | ✅ `022` |
| **E** | 우주·다이어리 공간 재설계 | ⏳ [22](./22-phase-e-space-design.md) |
| **F–G** | 포커스룸·통합 | 대기 |
| **H** | staging JWT·실기기 | ⏸ DEFERRED |

---

## 예상 변경 파일 (Phase B)

- `supabase/migrations/019_school_trust_boundary.sql` (+ 필요 시 `020` NOT NULL 분리)
- RPC/Edge: circle create / invite / recommend / approve / open
- RLS: circles, members, posts, anonymous, messages, diary visibility 경로
- `tests/security/school-*.test.ts` (deny 중심)
- local demo mirror: `mobile/src/features/local/repository.ts` (선택, 데모 정합)
- 본 문서 체크리스트 갱신

---

## 분석 (베타)

허용: 인증 완료율, 서클 개척 완료, 다이어리 작성, 서클→친구 다이어리 방문율, 활성 서클, 쪽지, 신고/차단, 인증 실패율.  
금지: 방문자 히스토리, 인기도, 투표 참여 사회적 비교.

---

## Phase B 완료 선언

> **Phase B is complete when school trust checks are enforced across all existing circle-bound reads and writes, not when the schema merely exists.**

구체적으로:

```text
- cross-school access is denied
- same-school non-members are denied
- pending_change users are read-only
- invite links do not bypass school or circle membership
- known IDs do not bypass RLS or RPC checks
- all major legacy RPC paths use the shared school-aware access predicates
```

기능 추가보다 **staging에서 우회가 실제로 안 되는지 증명**이 다음 게이트다.

---

## Phase B.1 — 경계 하드닝 (출시 전 차단)

체크리스트가 있다는 것 ≠ 통과. **실제 JWT 전수 PASS**가 게이트다.

### 구현 / 증거

| # | 항목 | 구현 / 증거 |
|---|------|-------------|
| 1 | staging 실제 JWT 침투 | `supabase/tests/020_staging_jwt_penetration_checklist.sql` |
| 2 | 혼재 서클 ops 큐 | `020` incidents + freeze + `/ops/mixed-circles` (사유·감사 필수) |
| 3 | ops role 서버 판정 | `is_app_moderator()` / `app_moderators`; 클라이언트 하드코딩 제거 |
| 4 | audit log | `school_audit_events` + resolve note/resolver |
| 5 | deep link 우회 | join → `getCircleInvitePreview` (타교 `NOT_FOUND`) |
| 6 | 계정 전환 캐시 | `switchAccountIsolation` + staging 매트릭스 |

### 실제 통과 기준 (페르소나)

| ID | 상태 | 기대 |
|----|------|------|
| **A** | 같은 학교 · 정상 서클 멤버 | 허용 |
| **B** | 같은 학교 · 비서클 멤버 | 거절 |
| **C** | 다른 학교 (+ known id / invite) | 존재 여부까지 숨김 (`NOT_FOUND`) |
| **D** | `pending_change` | 읽기만 · 쓰기 거절 |
| **E** | 정지·만료 (+ known id) | 접근 불가 |
| **M** | `app_moderators` | 명시된 ops만 · **일반 다이어리/쪽지 열람권으로 번지면 안 됨** |

각 페르소나로 아래 경로를 **직접** 확인. shared predicate를 거치지 않으면 B.1 미완료:

```text
circle read/write
diary read/write
notice/poll
pseudonymous board
private notes
guestbook
invite preview
presence publish
deep link
cached screen refresh
account switch
```

### 혼재 서클 정책

`incident → freeze → 수동 resolve` (자동 이전·재배정 금지).

ops 화면 최소 필드: 기준 학교 · 혼재 멤버·학교 상태 · freeze 시각 · 마지막 활동 · 해결 사유 · 처리자 · resolve 결과(+ audit).

---

## Phase C — 학교 진입·상태 UX (지금)

```text
코드 입력
검토 중
추가 확인 필요
승인
거절
학교 변경 검토 중
```

학교 홈 · 학생 목록 · 탐색 **금지**. Staging JWT 실측은 Phase H.

---

## 다음 액션

1. **Phase E**: [22](./22-phase-e-space-design.md) — 네 화면 시안 → 프로토타입 → 구현  
2. F–G: 포커스룸·통합  
3. **Phase H**: [21](./21-phase-b1-staging-signoff.md) staging JWT 실측
