# 로드맵

> **최종 갱신**: 2026-07-24  
> 단계가 끝날 때마다 이 표와 해당 phase 문서를 함께 갱신한다.

---

## 현재 위치

**5단계 Realtime 초록 배지 구현** → 다음은 **6 공지·투표 + 주홍**  
(Presence payload는 아직 `present`만; 주홍은 DB 응답 후 `track` 갱신)

---

## 단계표

| 단계 | 내용 | 상태 | 문서 / 코드 |
|------|------|------|-------------|
| 1~3 | 개척·우주·미니홈피 | ✅ | [01](./01-product-flow.md) |
| US 피벗 | English · Apple-first | ✅ | [03](./03-us-market.md) |
| **4** | 3인 추천 가입 | ✅ | [04](./04-phase-4-join.md), 010 |
| **4.5** | RLS 침투 | ✅ | [05](./05-phase-4.5-rls.md), 011 |
| **5** | Realtime 초록 배지 | ✅ | [06](./06-phase-5-realtime-presence.md), **012**, `features/presence/` |
| **6** | 공지·투표 + 주홍 배지 | 🔜 다음 | DB 응답 후 Presence `responded` |
| 7 | 신고·차단 강화 | ⬜ | — |
| 8 | 가명 | ⬜ | 7 이후 |
| 9 | Spotify | ⬜ | — |
| 10 | EAS / TestFlight | ⬜ | — |

---

## 5단계 완료 체크

| 조건 | 상태 |
|------|------|
| private channel + topic `circle:{uuid}` | ✅ |
| `012` realtime.messages RLS | ✅ |
| 연 서클 1개만 구독 | ✅ |
| AppState / unmount leave | ✅ |
| 다중 세션 → 배지 1 | ✅ normalize |
| DB last_seen 없음 | ✅ |
| payload 최소 | ✅ |
| 토픽 변조 테스트 | ✅ |
| Dashboard public access off | ⚠️ 운영 설정 (문서화) |
| live JWT 비멤버 구독 | ⚠️ `supabase/tests/realtime-presence-rls.test.sql` |

---

## 순서

```text
4 → 4.5 → 5 → 6 → 7 → 8 → 9 → 10
```

---

## 변경 로그

| 날짜 | 내용 |
|------|------|
| 2026-07-24 | your-diary 문서 폴더 · 4 · 4.5 |
| 2026-07-24 | 5단계 Presence 012 + mobile feature |
