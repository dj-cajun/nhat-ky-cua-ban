# 베타 출시 체크리스트

> **대상**: 30~60명 · 약 10개 서클 · 4주 비공개 베타  
> **기준일**: 2026-07-24 (phase 11 이후)  
> **원칙**: 기능 수보다 **서로의 다이어리를 찾아가는지**를 본다.

---

## A. 보안 하드 게이트 (하나라도 실패 → 공개 보류)

| # | 게이트 | 확인 |
|---|--------|------|
| 1 | 비멤버가 서클 데이터 접근 불가 | ☐ |
| 2 | 가명 실제 작성자 비노출 | ☐ |
| 3 | 차단 후 개인 콘텐츠 접근 불가 | ☐ |
| 4 | 쪽지 sender ID 유출 없음 | ☐ |
| 5 | 신고 스냅샷 누락 없음 | ☐ |
| 6 | service role 키 번들 미포함 | ☐ |
| 7 | 세션 전환 후 이전 계정 데이터 미노출 | ☐ |
| 8 | private 사진 정책 우회 불가 | ☐ |
| 9 | 앱 크래시 반복 없음 | ☐ |
| 10 | 운영자 신고 처리 가능 (`/ops/reports`) | ☐ |

자동화: `npm run test:security` · `npm run mobile:test`

---

## B. 제품 흐름 (수동)

| 흐름 | 웹 | iOS | Android |
|------|----|-----|---------|
| 가입 → 다이어리 첫 작성 | ☐ | ☐ | ☐ |
| 3인 서클 개설 | ☐ | ☐ | ☐ |
| 3인 추천 가입 | ☐ | ☐ | ☐ |
| Presence 초록 · 주홍 | ☐ | ☐ | ☐ |
| 공지·투표 | ☐ | ☐ | ☐ |
| 가명 글 · 신고 · 차단 | ☐ | ☐ | ☐ |
| 실명/가명 쪽지 | ☐ | ☐ | ☐ |
| Spotify 저장 | ☐ | ☐ | ☐ |
| 로그아웃 · 재로그인 | ☐ | ☐ | ☐ |
| 오프라인 초안 → 복구 저장 | ☐ | ☐ | ☐ |
| 죽은 알림 딥링크 → “더 이상 볼 수 없어요” | ☐ | ☐ | ☐ |

---

## C. 안정화 UI

| 항목 | 상태 |
|------|------|
| loading / empty / error / forbidden / offline | 코드 ✅ · 기기 ☐ |
| Realtime 끊겨도 서클 열람 | 코드 ✅ · 기기 ☐ |
| Feature flag kill switch | 설정 화면 ✅ · 원격 ☐ |
| 민감 로그 미포함 | 코드 ✅ |

---

## D. 분석 (콘텐츠 원문 금지)

필수 이벤트:

```text
onboarding_completed
circle_creation_completed
circle_join_approved
circle_opened
diary_saved
diary_viewed
notice_responded
anonymous_post_created
private_note_sent
spotify_track_saved
report_submitted
block_created
```

주간 지표: 3인 개설 완료율 · 7일 활성 서클 · 서클→미니홈피 · 주간 작성률 · 신고율 · 차단률 · 유지율

---

## E. 운영

| 항목 | 확인 |
|------|------|
| 신고 목록 · 스냅샷 · 숨김 | ☐ |
| 사용자 제한/정지/해제 | ☐ (로컬 ops + RPC) |
| 감사 로그 | ☐ |
| Edge/Outbox 실패 확인 | ☐ |
| 개인정보 처리방침 ↔ 구현 일치 | ☐ |
| 개발 DB / 운영 DB 분리 | ☐ |

---

## F. 베타 중 kill switch

급증 시 앱 업데이트 없이 OFF:

- `anonymous_board_enabled`
- `alias_messages_enabled`
- `spotify_search_enabled`
- `realtime_badges_enabled`
- `circle_creation_enabled`

설정: 앱 `Account` 화면 (베타) · 운영은 서버 플래그로 덮어쓰기.

---

## 다음

체크리스트가 초록이면 초대 링크를 열고, 4주간 **방문·작성·신고**만 관찰한다.  
새 기능 PR은 베타 피드백 이후에 연다.
