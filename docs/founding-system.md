# 3인 최초 개척단 시스템 (Class Founding)

> **데모 URL**: `/?founding=demo`  
> **초대 링크**: `/?founding=join&token=fc_...`

## 개요

빈 교실(미개설 학급)의 부트스트랩 문제를 해결하기 위한 4단계 플로우입니다.

1. **선점** — 최초 유저가 학급 선택 → `pending` (잠금)
2. **Zalo 인증** — 초대 링크를 반 단톡에 공유, 3명 모이면 `forming`
3. **퀴즈 등록** — 3명이 공동으로 암호 3개 입력 → `active`
4. **게이트** — 4번째 유저부터 퀴즈 통과 필요

가짜 개설자(타반 스파이·교사)는 해당 반 Zalo 단톡에 링크를 올릴 수 없어 24시간 내 3명을 모으지 못하면 `expired` 됩니다.

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/types/founding.ts` | 타입·상수 (`FOUNDING_REQUIRED_MEMBERS=3`) |
| `src/lib/class-founding.ts` | localStorage CRUD, claim/join/quiz/gate |
| `src/lib/founding-params.ts` | URL 파싱 (`?founding=demo`, `?founding=join`) |
| `src/pages/founding.tsx` | 4단계 데모 UI |
| `src/app.tsx` | `founding` 페이지 라우팅 (로그인 전에도 데모 가능) |

## 상태 머신

```
(없음) --claim--> pending --3명--> forming --quizzes--> active
                      |                                    |
                      +-------- 24h TTL --------> expired
```

## localStorage 키

- `diary_class_foundings` — `Record<classKey, ClassFoundingRecord>`
- `?reset=1` 또는 `clearAppData()` 시 함께 삭제됨

## API (프로덕션 연동 시)

현재는 `class-founding.ts`가 전부 담당합니다. Supabase 연동 시 아래 함수 시그니처를 유지하고 내부만 교체하세요.

```ts
claimFounding(school, class, userId, userName)
joinFoundingByToken(token, userId, userName)
submitFoundingQuizzes(school, class, quizzes[])
verifyFoundingGate(school, class, answers[])
isClassActive(school, class)
getInviteUrl(token)
```

### 권장 DB 스키마 (추후)

- `class_foundings` — class_key, status, founder_id, invite_token, expires_at
- `founding_members` — founding_id, user_id, joined_at
- `founding_quizzes` — founding_id, question, sort_order

## 온보딩 연동 (TODO)

온보딩 완료 시 `isClassActive(profile.school, profile.class)` 검사:

- `false` → `FoundingPage` 또는 해당 학급 pending UI로 유도
- `true` → 기존 홈 진입

## 데모 전용 기능

- **시뮬레이션 입장**: `simulateFoundingJoin()` — Zalo 없이 친구 2명 자동 합류
- **Reset**: `?founding=demo`는 전체 초기화, 페이지 내 버튼은 해당 학급만 초기화

## 테스트

```bash
npm test -- tests/class-founding.test.ts
```
