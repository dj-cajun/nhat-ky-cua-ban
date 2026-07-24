# 02 — 기술 구현 지침

> **상태**: 현행  
> **최종 갱신**: 2026-07-24  
> **출처**: 기술 구현 지침서 + Expo/Supabase 합의

---

## 스택

| 레이어 | 선택 | 비고 |
|--------|------|------|
| 제품 표면 (US) | **Expo + React Native** (`mobile/`) | Expo Router, TanStack Query, Zustand, Zod |
| 도메인 검증 (웹) | Vite + React (`src/` v1) | 1~4단계 도메인 로직 검증용. 제품 표면 아님 |
| 백엔드 | **Supabase** | Auth, Postgres, RLS, Realtime, Storage, Edge Functions |
| 로케일 | en-US 우선 | `mobile/src/i18n/en.ts` |

```text
mobile/          US 제품 UI
supabase/        migrations 007+ · Edge Functions
src/             legacy / v1 웹 프로토타입 (도메인 검증)
docs/your-diary/ 현행 기획·지침 (이 폴더)
docs/your-diary/ 현행 기획
docs/archive/     구 Zalo 기획 (보관)
```

---

## 절대 규칙: 클라이언트를 믿지 말 것

다음을 클라이언트만으로 확정하지 않는다.

- 서클 개척 완료  
- 가입 승인  
- 추천 수 집계  
- rate limit  
- 신고 생성·스냅샷  
- 멤버십 insert  

→ **RPC / Edge Function / RLS**가 단일 진실.

앱에는 anon key만. 시크릿은 Edge Function env.

---

## 주요 RPC / Functions

| 이름 | 역할 | 마이그레이션 |
|------|------|--------------|
| `open_circle_from_draft` | 3인 수락 → 서클 open | 009 |
| `create_circle_join_request` | 가입+추천 3건 트랜잭션 | **010** |
| `respond_circle_recommendation` | 추천 → 3이면 자동 멤버 | **010** |
| `get_join_request_progress` | 신청자용 숫자만 | 010 |
| `get_circle_invite_preview` | 비멤버 최소 정보 | 010 |
| `get_poll_summary` | 투표 합계만 | 009 |
| `recommend_join_request` | 구 래퍼 (호환) | 009→010 |
| Edge: open-circle, approve-circle-member, notify, report, delete-account | | `supabase/functions/` |

**마이그레이션 규칙**: `007`·`008`은 수정하지 않는다. 변경은 `009` 이후 번호로만 추가.

---

## RLS 요지

- 서클 콘텐츠(멤버 목록, 공지, 투표, 가명, Presence): **활성 멤버만**  
- 가입 신청: 신청자 본인 행만 SELECT (추천 상세 조인 불가)  
- 추천 행: `recommender_id = auth.uid()` 만 SELECT; decision UPDATE는 RPC만  
- `circle_members` 임의 INSERT 금지 — SECURITY DEFINER RPC만  
- 익명 게시: `author_user_id` 컬럼 SELECT revoke  

침투 체크리스트: `supabase/tests/010_join_rls_checklist.sql` (4.5단계)

---

## 로컬 미러

Supabase 미연결 시:

- Mobile: `mobile/src/features/local/repository.ts` — 서버 규칙 미러  
- Web: `src/lib/v1-store.ts` — 동일  

테스트는 미러 규칙이 서버와 어긋나지 않게 유지.

---

## 인증 (US)

1. Sign in with Apple (필수 우선)  
2. Google (Android)  
3. Email  
4. Demo (개발)  

Google를 넣으면 Apple도 App Review 요구.

---

## 관측 / 품질

- 이벤트: `track(...)` (market: `US` 태그)  
- typecheck / unit / E2E 통과를 단계 완료 조건에 포함  
- 시크릿·`.env` 실값 커밋 금지 (`.env.example`만)
