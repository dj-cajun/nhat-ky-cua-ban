# 08 — 6.5단계: Presence 주홍 위조 방어

> **상태**: ✅ 완료 (2026-07-24)  
> **핵심**: Presence의 `responded`는 **표시 신호가 아니다.** 주홍은 **서버 검증 응답 상태**만으로 만든다.

---

## 구조

```text
Presence          → 지금 서클 안에 있는가 (present only)
Verified badge    → 현재 활성 게시물에 DB 응답이 있는가
결합              → 초록 / 주홍 / 없음
```

금지: 클라이언트가 `state: responded`를 track 해서 주홍 생성.

---

## 서버 (`014_verified_response_badges.sql`)

| 항목 | 역할 |
|------|------|
| `realtime_outbox` | 응답 성공 후 이벤트 큐 (클라 접근 불가) |
| acknowledge / respond REPLACE | 응답 저장 → outbox 1건 (013 파일 무수정) |
| `get_active_post_badge_states` | 진입·재연결 시 응답자 ID만 동기화 |
| Broadcast RLS | 멤버 SELECT · 일반 INSERT 없음 |
| Edge `publish-circle-response-event` | outbox drain → private Broadcast |

선택지·응답 시각은 payload/RPC에 넣지 않는다. Broadcast 실패로 DB 응답을 롤백하지 않는다.

---

## 클라이언트

- Presence payload: `{ userId, circleId, state: 'present', sessionId }` (`responded` 무시)
- Presence key의 userId와 payload 불일치 시 드롭
- `verified-response.*` + `deriveMemberBadge(isPresent, verified)`
- 진입/재연결 시 badge state RPC → Broadcast로 증분
- 새 게시물 / 종료 시 verified map 초기화

---

## 다음

**7단계 신고·차단** (가명·쪽지 전에 필수)
