# 11단계 — 통합 안정화·베타 준비

> **상태**: ✅ 완료 (2026-07-24)  
> **원칙**: 새 기능 추가가 아니라 **기다림·실패·빈 상태·세션·캐시·접근성**까지 제품으로 완성.  
> 마이그레이션 `007~018` 무수정. DB drop은 별도 PR.

---

## 목표

성공 화면만이 아니라 다음에서도 길을 잃지 않게 함.

- empty / loading / error / forbidden / offline
- Realtime 실패 시 서클 핵심 기능 유지
- 오프라인 다이어리 초안 보존 + 충돌 시 사용자 선택
- 차단·탈퇴·신고·Spotify 후 캐시 무효화
- 세션 전환 시 이전 계정 데이터 미노출
- 딥링크 세션·권한·존재 재검사
- 기능 플래그 kill switch
- 운영 로그 민감정보 제거
- 최소 ops 신고 콘솔

---

## 추가·변경 코드

| 영역 | 경로 |
|------|------|
| 공통 상태 UI | `mobile/src/components/states/*` |
| Presence a11y 배지 | `mobile/src/components/ui/member-presence-badge.tsx` |
| AppError 확장 | `mobile/src/types/domain.ts`, `mobile/src/lib/errors.ts` |
| Retry / Query keys / Flags / Analytics | `mobile/src/lib/retry-policy.ts`, `query-keys.ts`, `feature-flags.ts`, `analytics-events.ts` |
| Secure logger | `mobile/src/lib/secure-logger.ts` (+ `logger.ts`) |
| Cache invalidation | `mobile/src/lib/cache-invalidation.ts` |
| Deep link | `mobile/src/lib/deep-link.ts` |
| Offline drafts | `mobile/src/features/offline-drafts/*` |
| Session teardown | `mobile/src/features/session/session-lifecycle.ts` |
| Ops reports | `mobile/src/features/ops/*`, `mobile/app/ops/reports.tsx` |
| Screen wiring | universe · circle home · my-diary · diary |
| Stability tests | `mobile/.../stability.test.ts`, `tests/stability/beta-gates.test.ts` |

---

## 빈 화면 카피 (EN)

| 화면 | 카피 |
|------|------|
| 내 우주 | No open circles yet. / When three people gather… |
| 다이어리(본인) | Today is still blank. |
| 다이어리(타인) | A quiet day so far. |
| 공지 | This circle is quiet right now. |
| 가명 | No stories here yet. |
| 쪽지 | No notes have arrived yet. |
| Spotify | No music for today yet. |

---

## 오류 코드

`AUTH_REQUIRED` · `SESSION_EXPIRED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` · `VALIDATION` · `RATE_LIMITED` · `OFFLINE` · `UPLOAD_FAILED` · `REALTIME_FAILED` · `EXTERNAL_SERVICE_FAILED` · `UNKNOWN`

서버 SQL/RLS 원문은 사용자에게 노출하지 않음.

---

## 재시도

- **자동**: 읽기 · Presence 재연결 · Spotify 검색 5xx · signed URL
- **사용자만**: 쪽지 · 가명 글 · 신고 · 투표 · 가입 추천 · 업로드 완료 · 다이어리 저장 · 차단

---

## 기능 플래그

```text
anonymous_board_enabled
alias_messages_enabled
spotify_search_enabled
realtime_badges_enabled
circle_creation_enabled
```

로컬 캐시 + `applyFeatureFlags` 원격 덮어쓰기. 하드코딩만으로 운영하지 않음.

---

## 유지

- 마이그레이션 `007~018`
- 보안 테스트 전체
- Playwright 핵심 E2E
- Vite v1 서클 데모

---

## 검증

```bash
npm run typecheck
npm run build
npm test
npm run test:security
npm run mobile:typecheck
npm run mobile:test
npm run test:e2e
```

---

## 베타 게이트 (하드 블로커)

비멤버 서클 접근 · 가명 작성자 노출 · 차단 우회 · 쪽지 sender 유출 · 신고 스냅샷 누락 · service role 번들 · 세션 교차 노출 · private 사진 우회 · ops 신고 처리 불가 · 반복 크래시

하나라도 실패하면 베타 공개 보류.

---

## 다음

**비공개 베타가 아니라 먼저 11.5 실기기 출시 게이트.**  
상세: [16-phase-11.5-device-launch-gate.md](./16-phase-11.5-device-launch-gate.md) · 통합 체크리스트: [15](./15-beta-launch-checklist.md)
