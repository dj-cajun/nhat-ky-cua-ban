# Tasks — 개발 작업 목록

> **프로젝트**: 너의 다이어리 (Nhật ký của bạn)
> **상태**: MVP 완료

---

## Phase 0: 프로젝트 셋업

| ID | 태스크 | 상태 |
|----|--------|------|
| T-00 | Vite + React + TS ZMP 프로젝트 초기화 | ✅ |
| T-01 | Tailwind, ESLint, Prettier, Vitest 설정 | ✅ |
| T-02 | Supabase 프로젝트 연결 (env + 클라이언트) | ✅ |
| T-03 | DB 마이그레이션 SQL (`supabase/migrations/`) | ✅ |

---

## Phase 1: 온보딩 (S-01)

| ID | 태스크 | 상태 |
|----|--------|------|
| T-10 | Zalo getUserInfo 연동 | ✅ |
| T-11 | 학교·학급 선택 UI | ✅ |
| T-12 | 힌트 데이터 암호화 저장 | ✅ |

---

## Phase 2: 100vh 홈 셸 (S-02)

| ID | 태스크 | 상태 |
|----|--------|------|
| T-20 ~ T-26 | 5층 레이아웃 전체 | ✅ |

---

## Phase 3: 피드·익명 (S-05)

| ID | 태스크 | 상태 |
|----|--------|------|
| T-30 | 익명 카드 UI | ✅ |
| T-31 | 상세 모달 + 댓글 | ✅ |
| T-32 | 워프 + 전면광고 | ✅ |

---

## Phase 4: 투표·필터·실시간

| ID | 태스크 | 상태 |
|----|--------|------|
| T-40 | 5시 투표 Lock (12문항) | ✅ |
| T-41 | 힌트 실드 4종 | ✅ |
| T-42 | Profanity Shield | ✅ |
| T-43 | Realtime 모달 + Supabase 채널 스텁 | ✅ |

---

## Phase 5: 수익화·마무리

| ID | 태스크 | 상태 |
|----|--------|------|
| T-50 | Zalo Ads mock/연동 | ✅ |
| T-51 | 도토리 충전소 (S-03) | ✅ |
| T-52 | Playwright E2E | ✅ |

---

## Phase 4: 성장 저해 요인 교정 (v1.1)

| ID | 태스크 | 상태 |
|----|--------|------|
| T-60 | 힌트 XOR → SHA-256 단방향 봉인 (`hint-crypto.ts`) | ✅ |
| T-61 | 레거시 XOR 자동 마이그레이션 (`ensureHintSealOnProfile`) | ✅ |
| T-62 | 시드·mock 데이터 베트남 구어체 통일 | ✅ |
| T-63 | 사용자 UI 문자열 `vi.ts` 단일화 감사 | 🔄 |
| T-64 | `presets/hanoi.ts` 등 지역 프리셋 VI-only 가이드 | ⬜ |

---

## 현재 스프린트

**목표**: 프로덕션 완료 ✅
**다음**: `VITE_*` env 설정 후 `npm run deploy`
