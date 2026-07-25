# 07 — 6단계: 공지·투표 + 주홍 배지

> **상태**: ✅ 완료 (2026-07-24)  
> **핵심**: **응답의 기준은 Presence가 아니라 DB.** DB 저장 성공 후에만 `responded` track → 주홍.

---

## 흐름

```text
서클 진입 → 초록
→ 공지 확인 / 투표 응답
→ RPC로 DB 저장 성공
→ Presence { state: responded, activePostId }
→ 주홍
```

금지: UI 먼저 주홍 → 나중에 DB.

---

## 서버 (`013_circle_posts_and_responses.sql`)

| RPC | 역할 |
|-----|------|
| `create_circle_post` | 활성 1개 제약 + 옵션 트랜잭션 · 만료 active 정리 |
| `acknowledge_circle_notice` | 공지 확인 (멱등) |
| `respond_circle_poll` | 투표 (종료 전 변경 가능) |
| `get_circle_post_summary` | 집계만 (개인 선택 목록 없음 · 응답 전 투표 수 숨김) |
| `close_circle_post` | 종료 |

- 직접 DML REVOKE · `circle_responses` SELECT 차단  
- 기존 007 테이블 진화 (`type` 컬럼 유지)  
- `013` 이후만 추가 · 007~012 수정 없음

---

## Presence payload

```ts
{ userId, circleId, activePostId, state: 'present' | 'responded', sessionId }
```

배지: `deriveMemberBadge` / `getMemberBadgeFromMap`  
- 현재 활성 `postId`와 `activePostId` 일치 + `responded` → 주홍  
- Presence 없음 → 배지 없음 (DB 응답만으로는 주홍 없음)  
- 다중 기기: 한 세션이라도 responded → 주홍

---

## 클라이언트

- `mobile/src/features/circle-posts/` — 생성·응답·summary  
- `mobile/src/features/presence/derive-member-badge.ts`  
- 로컬 미러: `repository`의 RPC shape 함수  
- UI: 공지 확인 후 비활성 · 투표는 응답 후 집계 · 생성 권한자만 CTA

---

## 보안 메모 (6.5)

Presence `responded`는 피어가 위조할 수 있다. 1.0은 DB 성공 후에만 track + `activePostId` 매칭.  
서버 Broadcast / DB 조인 검증은 **6.5**.

---

## 다음

```text
6.5 Presence 주홍 위조 방어 → 7 신고·차단 → 8 가명 …
```
