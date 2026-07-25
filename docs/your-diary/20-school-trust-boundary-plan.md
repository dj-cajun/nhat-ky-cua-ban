# 20 — 학교 신뢰 경계 기획 (School Trust Boundary)

> **상태**: 기획 확정 · Phase A 감사 완료 · **Phase B(`019`) 착수 전 원칙 고정**  
> **최종 갱신**: 2026-07-25  
> **선행 마이그레이션**: `018` 이후 **forward-only** (`019+`). `007–018` 수정 금지.  
> **레거시**: `001` `schools`/`classes`는 **재사용하지 않는다** (의미·모델 혼선 방지).

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

- [ ] 서클 생성 시 **서버가** school을 결정 (클라이언트 `school_id` 무시)
- [ ] 교차학교 가입·추천·초대가 **모두** 거절
- [ ] 학교 미인증자는 기존 서클 내부 데이터 접근 불가
- [ ] 다이어리·공지·투표·가명보드·쪽지 인가에 학교 경계 적용
- [ ] 위 deny 테스트 전부
- [ ] 기존 서클 데이터 백필 + `school_id NOT NULL` 적용 완료
- [ ] 계정 전환·캐시 제거 테스트 통과
- [ ] typecheck / unit / security / mobile tests / build 그린

UI·포커스룸·꾸미기는 Phase B 범위 밖. **권한 모델 결합이 먼저.**

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
| **B** | `019` 스키마·RLS·백필·deny 테스트·권한 결합 | 다음 |
| **C** | 온보딩·코드·pending/rejected·변경 요청 UI | 대기 |
| **D** | 서클 UX에 school 가드 노출 (규칙은 B에서 이미 강제) | 대기 |
| **E–G** | 다이어리·기척·쪽지 회귀 | 대기 |
| **H** | staging·실기기·교차학교 공격 | 대기 |

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

## 다음 액션

1. 본 문서의 **네 원칙 + Phase B 완료 기준** 합의 유지  
2. **Phase B 구현 착수**: `019` (nullable → 백필 → NOT NULL) + deny 테스트  
3. UI/포커스룸은 B 완료 전에는 확장하지 않음
