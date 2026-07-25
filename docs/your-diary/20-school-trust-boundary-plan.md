# 20 — 학교 신뢰 경계 기획 (School Trust Boundary)

> **상태**: 기획 확정 · 구현 전 (Phase A 감사 완료)  
> **최종 갱신**: 2026-07-25  
> **선행 마이그레이션**: `018` 이후 **forward-only** (`019+`). `007–018` 수정 금지.

---

## 제품 문장

> **Your Diary는 같은 학교라는 신뢰의 경계 안에서 작은 서클을 만들고, 각자의 하루를 조용히 남기고 방문하는 폐쇄형 관계 다이어리다.**

내부 설계 원칙:

> **학교는 들어올 수 있는 사람의 범위를 정하고, 서클은 가까운 관계를 정하며, 다이어리는 그 사람의 하루를 보여준다.**

계층:

```text
학교 = 입장 가능한 관계의 바깥 경계
서클 = 실제로 활동하는 작은 관계 단위
다이어리 = 제품의 중심
```

---

## 하지 않을 것 (Anti-product)

학교를 넣는다고 해서 아래를 **만들지 않는다**.

| 금지 | 이유 |
|------|------|
| 학교 전체 피드 / 반별 피드 | 커뮤니티 SNS로 변질 |
| 학교 전체 익명·인기 게시판 | 다이어리 중심 붕괴 |
| 전교생 검색·학생 목록 | 폐쇄성·안전 위반 |
| 팔로워·좋아요·조회수·랭킹 | 관계 다이어리와 반대 |
| 실시간 채팅·타이핑·읽음 확인 | 편지(쪽지) 모델과 충돌 |
| 다이어리 방문 알림·방문자 목록 | 감시 압박 |
| 꾸미기 상점·코인·경쟁 커스텀 | 감성 오브제 ≠ 경제 |

**매일 머무는 장소는 학교가 아니라 서클·다이어리다.**

올바른 경로:

```text
학교 인증
→ 내 우주
→ 내가 승인받은 서클
→ 서클 멤버
→ 각자의 다이어리
```

---

## Phase A — 현재 상태 감사

### 1) 이미 구현됨

| 영역 | 근거 |
|------|------|
| 3인 개척 · 3인 추천 가입 | `007–011`, Edge `open-circle` / `approve-circle-member`, mobile circles/* |
| My Universe → 그래프 → 다이어리 | `universe.tsx`, `circles/[id]/graph.tsx`, `diary/[userId]` |
| 다이어리·방명록·자유게시판·가명 게시판 | diary-home, guestbook, free-board, anonymous-board |
| Presence (초록) · 응답 배지 (주홍) | `012`, `014` |
| 공지·투표 (서클당 활성 1) | `013` |
| 실명·가명 쪽지 | `017`, `messages/*` |
| 신고·차단·모더레이션 | `015` |
| Spotify 오늘의 음악 | `018` |

### 2) 부분 구현 (학교 경계와 미연결)

| 항목 | 상태 |
|------|------|
| `001` `schools` / `classes` · `004` `class_foundings` | 레거시 스키마. **007+ 서클과 FK 없음** |
| `src/pages/founding.tsx` · class-founding | 웹에 **미마운트**. Zalo/학급 잔재 |
| Ops 신고 화면 | 데모용 `isModerator` 하드코딩 |
| “학교 스타일” 게시판 UI | **비유만**. 데이터는 서클/홈피 스코프 |

### 3) 없음 (이번 기획 범위)

- 학교 멤버십 · 인증 상태 (`pending/verified/rejected/suspended/expired`)
- 서클의 `school_id` · 교차 학교 거부
- 학교 코드 + 추천 기반 베타 온보딩
- 학교 변경 요청 · 졸업/전학/만료 라이프사이클
- 일시적 서클 기척 배너 (저장·알림함 비사용)
- 운영자 학교 인증 검토 콘솔
- 다이어리 히어로·오브제형 진입의 학교 맥락 노출(최소)

### 4) 재사용 가능

- 서클 멤버십 RLS/RPC 패턴 (`008`/`009`/`011`)
- 가입 추천 파이프라인 (`010`)
- `circle_aliases` · 쪽지 누수 테스트 계약
- Presence 버스 + verified-response
- Universe → graph → diary 내비 (`circle-visit.ts`)
- `tests/security/*` 페르소나 확장 자리

### 5) 마이그레이션

- **최신**: `018_diary_spotify_music.sql`
- 다음: **`019_school_trust_boundary.sql`** (신규만)
- `007–018` **수정 금지**
- `001` schools는 참고만. 신규 테이블은 circle v1과 정합되게 다시 정의(레거시 Zalo 프로필과 분리)

---

## 기능 매트릭스

| 기능 | 상태 | 비고 |
|------|------|------|
| 학교 선택·코드 입장 | ❌ Missing | 베타 1단계 |
| 학교 소속 인증 상태 | ❌ | membership 상태머신 |
| 같은 학교만 서클 초대/추천 | ❌ | RPC에 school check |
| 다른 학교 서클 접근 차단 | ❌ | RLS + 테스트 |
| 전교 검색·로스터 | — | **의도적으로 없음** |
| 3인 개척/추천 | ✅ | 유지 + school 가드 |
| My Universe → 멤버 → 다이어리 | ✅ | 유지·단축 유지 |
| Presence | ✅ | 유지 |
| 일시적 서클 기척 배너 | ❌ | Presence와 분리 |
| 다이어리 방문 알림 | — | **만들지 않음** |
| 쪽지=편지 · 다이어리에서만 시작 | 부분 | UX 강화 (Phase E/G) |
| 가명 게시판 (서클만) | ✅ | 학교 전체 보드 금지 |
| 학교 변경·만료 | ❌ | 모더레이션 리뷰 |
| 운영자 인증 검토 | ❌ | least privilege |

---

## 제안 스키마 (요약)

> 상세 DDL은 Phase B 구현 시 `019`에 둔다. 여기선 개념만.

### `yd_schools` (운영자 등록 학교)

- `id`, `display_name`, `slug`, `status` (`active`/`archived`)
- `beta_invite_code_hash` (평문 코드 저장 금지)
- `created_at`

### `yd_school_memberships`

- `id`, `school_id`, `user_id`
- `status`: `pending` | `verified` | `rejected` | `suspended` | `expired`
- `grade` / `class_label` (optional, nullable)
- `verified_at`, `expires_at`, `suspended_at`
- `verification_method`: `beta_code` | `member_vouch` | `email_domain` | `manual_review` …
- unique `(school_id, user_id)`

### `yd_school_change_requests`

- `user_id`, `from_school_id`, `to_school_id`, `reason`, `status`, 모더레이터 필드
- **승인해도 기존 서클 멤버십을 자동 이전하지 않음**

### `circles` 확장 (신규 컬럼은 새 마이그레이션)

- `school_id uuid not null` (신규 서클부터 필수; 기존 행 백필 전략 Phase B에서 결정)
- 인덱스 `(school_id)`

### 감사/운영

- `yd_school_verification_audits` (증거는 스토리지 private, 클라이언트 미노출)
- 기존 reports/blocks에 `school_identity_abuse` reason 추가 가능

**절대 없음**: 전교생 directory 테이블·뷰, 학교 공개 피드 테이블.

---

## 인가·RLS 매트릭스

모든 서버 연산에서 **클라이언트 `school_id`를 신뢰하지 않는다**.  
`auth.uid()` → verified membership → 같은 `school_id` → (추가로) circle membership.

| 액터 | 서클 생성 | 서클 읽기 | 초대/추천 | 다이어리(공유) | 가명보드 | 쪽지 |
|------|-----------|-----------|-----------|----------------|----------|------|
| 같은 학교 · 서클 멤버 | ✅ | ✅ | ✅ | 가시성 규칙 | ✅ | ✅ |
| 같은 학교 · 비서클 | ✅(개척) / 가입은 추천 필요 | ❌ | 초대받은 경우만 | ❌ | ❌ | ❌ |
| 다른 학교 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| unverified / pending | ❌ | ❌ | ❌ | 본인 다이어리만 | ❌ | ❌ |
| suspended / expired | ❌ | ❌ | ❌ | 본인만(정책 확정) | ❌ | ❌ |
| blocked | 기존 차단 규칙 우선 | | | | | |
| moderator | 검토 콘솔만 (모바일 광역 어드민 금지) | | | | | |

학교 멤버십만으로 **모든 서클 입장 불가**.

---

## 화면·라우트 변경 (예정)

| 화면 | 변경 |
|------|------|
| `(auth)/onboarding` | 학교 선택 + 베타 코드 → pending/verified |
| 신규 `school/pending`, `school/rejected` | 대기·거절 상태 |
| `settings` | 학교 변경 요청 (즉시 이동 없음) |
| `circles/create`, join, recommendations | 같은 학교 검증 실패 UI |
| `universe` | 인증 전에는 서클 생성 비활성 |
| `diary/[userId]` | 최소 맥락: `학년 · 같은 서클` (이메일·학번·반 상세 기본 비공개) |
| ops | 학교 인증 큐 (least privilege) |

**첫 화면을 학교 게시판/인기글/학생목록으로 만들지 않는다.**

---

## 베타 학교 인증 (현실적 1단계)

```text
운영자가 테스트 학교 사전 등록
→ 학교별 베타 초대 코드
→ 가입자가 코드 입력 (membership = pending)
→ 기존 verified 멤버의 vouch/추천 또는 운영 승인
→ 서버가 verified로 승격
```

규칙:

- **코드만으로 즉시 verified 금지** (또는 아주 작은 운영자 테스트 스쿨만 예외를 문서화)
- 학생증 사진 업로드는 **후순위** (개인정보·운영 부담)
- 이후 확장 슬롯: 학교 이메일 도메인 · 수동 검토 · 공식 초대

---

## 서클 규칙 (유지 + 학교 가드)

기존 신뢰 모델 **유지**:

1. 첫 서클: 필요 개척 인원 수락 후에만 open  
2. 신규 멤버: 설정된 추천 수 + **서버 최종 승인**  
3. 초대 링크만으로 멤버십 부여 금지  

추가:

- 서클은 **학교 1곳**에 속함  
- 초대·추천·수락·멤버 삽입·서클/다이어리/보드/쪽지 접근에 **같은 학교 verified** 검사  
- **교차 학교 서클은 이 페이즈에서 구현하지 않음**

옵션 라벨(검색 디렉터리 아님): `Class 2`, `Art club`, `Close friends` …

---

## 다이어리 (중심 유지)

- 히어로: 그날의 기분·짧은 문장·사진·음악이 **한 분위기**  
- 보조: 앨범·달력·편지함·방명록을 **오브제형**으로 (상호작용은 명확)  
- 금지: 좋아요·조회수·방문자·랭킹·팔로워  
- 쪽지: **상대 다이어리에서만** 새 편지 시작 · 채팅 UI 금지  

프로필 노출 예시:

```text
민지
2학년 · 같은 서클
```

---

## 일시적 서클 기척 (Ephemeral signals)

Presence(초록/주홍)와 **별도** 개념.

| 규칙 | |
|------|--|
| 예 | “Mina entered the circle.” / “A new poll has opened.” |
| TTL | 약 2–3초 배너 |
| 저장 | ❌ 알림함·히스토리 없음 |
| 다이어리 방문 | ❌ 신호 없음 |
| 범위 | 해당 서클 active 멤버만 |
| 목적 | 살아 있음 ≠ 감시 |

---

## 학교 변경·라이프사이클

| 이벤트 | 원칙 |
|--------|------|
| 전학·잘못 선택 | change request → 모더레이션. **조용한 자동 이동 금지** |
| 승인 후 | 새 학교 membership. **옛 서클 멤버십 자동 이전 없음** |
| 졸업/만료 | `expired`; 서클 접근 정책 문서화 후 RLS 반영 |
| suspended | 즉시 서클/보드/쪽지 write 차단 |
| 학교 삭제·중복 병합 | 운영자 only · 감사 로그 |

문서화 대상: 기존 서클, 다이어리 가시성, 쪽지, 가명, 공지/투표, 캐시 미디어, 푸시 구독.

---

## 보안 리스크 목록

1. 학교 로스터 열거 (membership 목록 API)  
2. 초대 코드 무차별 대입  
3. user id 열거로 프로필 수집  
4. 클라이언트 `school_id` 스푸핑  
5. 가명→실계정 누수 (로그·스토리지·realtime·푸시)  
6. 로그아웃/계정 전환 후 캐시 잔존  
7. 차단 사용자 콘텐츠 캐시  
8. 접근 회수 후 이미지 URL 잔존  
9. 학교 변경으로 옛 서클 권한 잔류  
10. suspended/expired의 stale JWT/세션  
11. 레거시 `001–005` class RLS `OR true`와의 혼선 (공유 DB 시)

---

## 테스트 계획 (R최소)

RLS/보안 페르소나:

1. verified 같은 학교 · 서클 멤버  
2. verified 같은 학교 · 비서클  
3. 다른 학교  
4. unverified  
5. suspended  
6. blocked  
7. moderator  
8. 같은 기기 계정 전환  

회귀: 기존 `tests/security/*`, mobile repository tests, e2e 데모 플로우.

---

## 구현 페이즈

| Phase | 내용 | 완료 조건 |
|-------|------|-----------|
| **A** | 감사·본 기획 문서 | ✅ 이 문서 |
| **B** | `019` 스키마·RLS·교차학교 deny 테스트 | typecheck + security tests |
| **C** | 온보딩(학교+코드)·pending/rejected·변경 요청 | 모바일 플로우 + 서버 검증 |
| **D** | 서클 생성/초대/추천에 school 가드 | 기존 3인 규칙 유지 증명 |
| **E** | 다이어리 히어로·오브제 내비·최소 학교 맥락 | 접근성 유지 |
| **F** | ephemeral circle signals | 알림함 미저장 테스트 |
| **G** | 쪽지·푸시·가명·차단 회귀 | 누수 테스트 그린 |
| **H** | staging·실기기 게이트 | 체크리스트 통과 |

**UI만 있으면 완료가 아니다.** 서버 인가 + RLS + 실패 상태 + 테스트가 있어야 완료.

---

## 예상 변경 파일 (페이즈별 스케치)

### B (스키마)

- `supabase/migrations/019_school_trust_boundary.sql` (신규)
- `supabase/tests/` 또는 `tests/security/school-*.test.ts`
- Edge/RPC: circle create/join/recommend에 membership assert

### C (온보딩)

- `mobile/app/(auth)/onboarding.tsx`
- `mobile/app/school/*` (신규)
- `mobile/src/features/school/*` (신규)
- i18n `en.ts` / `ko.ts`

### D (서클 통합)

- `mobile/app/circles/create.tsx`, `join.tsx`, recommendations
- `mobile/src/features/local/repository.ts` (로컬 데모 미러)
- Edge `open-circle`, `approve-circle-member`

### E–G

- `diary-hompy-home.tsx`, messages compose 진입점
- presence/signals 모듈 (신규, notification inbox와 분리)
- ops school review (최소)

### 문서

- 본 문서 · `README.md` · `roadmap.md` · `01-product-flow.md` 개정

---

## 분석 (베타)

허용: 인증 완료율, 서클 개척 완료, 다이어리 작성, 서클→친구 다이어리 방문율, 7/30일 활성 서클, 쪽지 발송, 신고/차단, 인증 실패율.

금지: 누가 누구 다이어리를 봤는지, 방문자 히스토리, 인기도, 투표 참여의 사회적 비교용 이력.

---

## 다음 액션

1. 이 기획 리뷰·합의  
2. Phase B: `019` 스키마 + RLS deny 테스트부터 착수  
3. 11.5 실기기 게이트와 일정 충돌 시: **학교 레이어는 베타 직후 트랙**으로 둘지, 베타 초대 학교로 좁혀 넣을지 결정

베타를 학교 코드로 한정하면 “왜 아무나 못 들어오는지”가 설명되고, 전교 피드 없이도 폐쇄성이 전달된다.
