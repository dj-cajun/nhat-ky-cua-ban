# 로드맵

> **최종 갱신**: 2026-07-24  
> 단계가 끝날 때마다 이 표와 해당 phase 문서를 함께 갱신한다.

---

## 현재 위치

**4.5단계 CI/미러 완료** → 다음은 **5 Realtime 초록**  
(Presence 전: `circle:{id}` 비멤버 구독 차단 설계가 먼저)

---

## 단계표

| 단계 | 내용 | 상태 | 문서 / 코드 |
|------|------|------|-------------|
| 1~3 | 개척·우주·미니홈피 도메인 | ✅ | [01](./01-product-flow.md), 007–009 |
| US 피벗 | English UI, Apple-first, Your Diary | ✅ | [03](./03-us-market.md) |
| 중간 | 공지·투표, Presence 점, 신고·차단 경로 | ✅ | mobile |
| **4** | **3인 추천 가입** | ✅ | [04](./04-phase-4-join.md), **010** |
| **4.5** | **권한·RLS 침투 테스트** | ✅ | [05](./05-phase-4.5-rls.md), **011**, `tests/security/`, `supabase/tests/` |
| 5 | Realtime 초록 배지 | 🔜 다음 | 채널 ACL 먼저 |
| 6 | 공지·투표 + 주홍 배지 (Realtime) | ⬜ | — |
| 7 | 신고·차단 기반 강화 | ⬜ | — |
| 8 | 가명 게시판·쪽지 | ⬜ | **7 이후** |
| 9 | Spotify 카드 | ⬜ | — |
| 10 | Expo / EAS·TestFlight | ⬜ | — |

---

## 순서 원칙

```text
4 → 4.5 → 5 → 6 → 7 → 8 → 9 → 10
```

4 직후 Presence로 점프하지 않음. 가명(8) 전 신고·차단(7).

---

## 4.5 완료 체크리스트

| 조건 | CI/미러 | Live DB SQL |
|------|---------|-------------|
| 승인 전 내부 조회 차단 | ✅ `unauthorized-circle-access` | `join-request-rls` 등 |
| 직접 멤버십 DML 차단 | ✅ 011 REVOKE + 미러 | `membership-escalation` |
| decision 직접 조작 차단 | ✅ 011 REVOKE | 동일 |
| 추천 신원 유출 없음 | ✅ `information-leakage` | progress RPC |
| 위조 create 부분 행 0 | ✅ security-join / tampering | SQL |
| 동시성 membership 1 | ✅ 승인 알림 1건 미러 | `join-concurrency` |
| 만료·취소 | ✅ 미러 cancel 테스트 | SQL |
| 차단 재검사 | ✅ respond 시 미러 + 011 | pending G 계정 |
| Storage | ✅ 011 private bucket | `storage-policies` |
| security definer 권한 | ✅ 011 REVOKE | 수동 점검 |
| CI 자동 실행 | ✅ `test:security` + `mobile:test` | live optional |
| 007/008/010 미수정 | ✅ **011**만 추가 | — |

---

## 변경 로그 (문서)

| 날짜 | 내용 |
|------|------|
| 2026-07-24 | `docs/your-diary/` 신설. 4단계 ✅ |
| 2026-07-24 | 4.5 지시서·011·security 테스트 추가 |
