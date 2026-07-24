# 로드맵

> **최종 갱신**: 2026-07-24  
> 단계가 끝날 때마다 이 표와 해당 phase 문서를 함께 갱신한다.

---

## 현재 위치

**4단계 완료** → 다음은 **4.5 RLS 침투 테스트** (Presence로 바로 가지 않음)

---

## 단계표

| 단계 | 내용 | 상태 | 문서 / 코드 |
|------|------|------|-------------|
| 1~3 | 개척·우주·미니홈피 도메인 (웹 검증 + mobile 스캐폴드) | ✅ | [01](./01-product-flow.md), migrations 007–009 |
| US 피벗 | English UI, Apple-first, Your Diary | ✅ | [03](./03-us-market.md) |
| 중간 | 공지·투표 UI, Presence 점, 신고·차단 경로 | ✅ | mobile notice/presence/reports |
| **4** | **3인 추천 가입** (RPC·RLS 우선) | ✅ | [04](./04-phase-4-join.md), migration **010** |
| **4.5** | **권한·RLS 침투 테스트** | 🔜 다음 | `supabase/tests/010_join_rls_checklist.sql` |
| 5 | Realtime 초록 배지 | ⬜ | — |
| 6 | 공지·투표 + 주홍 배지 (Realtime 연동 강화) | ⬜ | local UI는 先行, 서버 Realtime 남음 |
| 7 | 신고·차단 기반 강화 | ⬜ | 기본 경로 있음, 모더레이션/한도 보강 |
| 8 | 가명 게시판·가명 쪽지 | ⬜ | **7 이후만** |
| 9 | Spotify 카드 | ⬜ | — |
| 10 | Expo 전환 정리 / EAS·TestFlight | ⬜ | mobile/ 이미 Expo — 출시 파이프 |

---

## 순서 원칙

```text
4  3인 추천 가입
4.5 권한·RLS 침투 테스트   ← 지금 여기로
5  Realtime 초록 배지
6  공지·투표와 주홍 배지
7  신고·차단 기반
8  가명 게시판·가명 쪽지
9  Spotify 카드
10 Expo / 스토어 출시 정리
```

가명(8) 전에 신고·차단(7)이 먼저다.  
4 직후 Presence(5)로 점프하지 말고 **4.5**를 한 번 더 한다.

---

## 레포 매핑

| 경로 | 역할 |
|------|------|
| `mobile/` | US 제품 (Expo) |
| `src/` + `e2e/` | Vite v1 도메인 검증 |
| `supabase/migrations/` | 007+ (007·008 동결) |
| `docs/your-diary/` | **현행 기획·지침** |
| `docs/PRD.md` 등 | 구 Zalo 레거시 |

---

## 변경 로그 (문서)

| 날짜 | 내용 |
|------|------|
| 2026-07-24 | `docs/your-diary/` 신설. 1~4·US·로드맵 저장. 4단계 ✅ |
