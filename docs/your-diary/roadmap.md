# 로드맵

> **최종 갱신**: 2026-07-25  
> 단계가 끝날 때마다 이 표와 해당 phase 문서를 함께 갱신한다.

---

## 현재 위치

**11단계 코드 완료** · **11.5 실기기 출시 게이트**와 병행해, 제품 방향을 **학교=바깥 신뢰 경계**로 명확화했다.  
학교 레이어: **B·C 완료 · D 최소 ops 완료 · B.1/H DEFERRED**.  
지금은 **Phase E2** — 네 화면 정적 프로토타입 리뷰 ([23](./23-phase-e2-prototype-checklist.md)). E3는 승인 전 금지.

> 11.5: staging·실기기 **출시 블로커**만.  
> 학교 신뢰 경계: **신규 트랙** — 기존 서클/다이어리를 대체하지 않고, 입장 범위만 설명한다. 학교 전체 피드·전교 검색은 하지 않는다.

---

## 단계표

| 단계 | 내용 | 상태 | 문서 / 코드 |
|------|------|------|-------------|
| 1~3 | 개척·우주·미니홈피 | ✅ | [01](./01-product-flow.md) |
| US 피벗 | English · Apple-first | ✅ | [03](./03-us-market.md) |
| **4** | 3인 추천 가입 | ✅ | [04](./04-phase-4-join.md), 010 |
| **4.5** | RLS 침투 | ✅ | [05](./05-phase-4.5-rls.md), 011 |
| **5** | Realtime 초록 배지 | ✅ | [06](./06-phase-5-realtime-presence.md), **012** |
| **6** | 공지·투표 + 주홍 | ✅ | [07](./07-phase-6-circle-posts.md), **013** |
| **6.5** | 주홍 위조 방어 | ✅ | [08](./08-phase-6.5-verified-response-badges.md), **014** |
| **7** | 신고·차단 기반 | ✅ | [09](./09-phase-7-reports-blocks.md), **015** |
| **8** | 가명 게시판 | ✅ | [10](./10-phase-8-anonymous-board.md), **016** |
| **9** | 실명·가명 쪽지 | ✅ | [11](./11-phase-9-private-messages.md), **017** |
| **10** | Spotify 오늘의 음악 | ✅ | [12](./12-phase-10-spotify-music.md), **018** |
| **10.5** | 레거시 정리 | ✅ | [13](./13-phase-10.5-legacy-cleanup.md) |
| **11** | 통합 안정화·베타 | ✅ | [14](./14-phase-11-beta-stabilization.md) |
| **11.5** | 실기기 출시 게이트 | 🔜 | [16](./16-phase-11.5-device-launch-gate.md), [15](./15-beta-launch-checklist.md) |
| **i18n 1차** | English · 한국어 | ✅ | [17](./17-i18n-en-ko.md) |
| **12·A** | 학교 신뢰 경계 기획·감사 | ✅ | [20](./20-school-trust-boundary-plan.md) |
| **12·B** | `019` 권한 결합 · deny 테스트 · school_id 백필 | ✅ | [20](./20-school-trust-boundary-plan.md) · `019` |
| **12·B.1 / H** | staging JWT·실기기 출시 게이트 | ⏸ DEFERRED | [21](./21-phase-b1-staging-signoff.md) · Phase H |
| **12·C** | 학교 온보딩·상태 UX · 최소 ops | ✅ | [20](./20-school-trust-boundary-plan.md) · `021` |
| **12·D** | 베타 ops 최소 완성 (overview·안전·역할) | ✅ | `022` · `/ops/overview` · `/ops/safety` |
| **12·E** | 우주·다이어리 공간 재설계 | ⏳ E2 리뷰 | [22](./22-phase-e-space-design.md) · [23](./23-phase-e2-prototype-checklist.md) · `/prototype/e2` |
| **12·F–G** | 포커스룸·통합·오류 | ⏳ | E 이후 |
| **12·H** | staging JWT·실기기 | ⏸ DEFERRED | [21](./21-phase-b1-staging-signoff.md) |
| 베타 | 학교 코드 한정 초대 · 서클 중심 | 대기 | 11.5 + 12·B~D 최소 통과 후 권장 |

---

## 11.5 규칙

| 규칙 | |
|------|--|
| 코드 확장 | ❌ 새 모듈·꾸미기·채팅·알림·보상·공개·앱내 Spotify |
| 허용 패치 | ✅ 실기기에서 발견된 **출시 블로커만** 최소 수정 |
| 플로우 | ❌ 데모 단축·관리자 DB로 “통과” 처리 |
| 통과 후 | 코드상 베타 준비 종료 → 초대 → 버그·치명 UX만 |

---

## 순서

```text
4 → … → 11 → 11.5 (실기기)
                 ↘ 12 학교 신뢰 경계 (A✅ → B 스키마 → C·D 온보딩·서클 → …)
→ private beta (학교 코드 + 서클 추천) → 피드백
```

---

## 변경 로그

| 날짜 | 내용 |
|------|------|
| 2026-07-25 | **학교 신뢰 경계 기획** Phase A ([20](./20-school-trust-boundary-plan.md)) — 학교≠커뮤니티, 다이어리 중심 유지 |
| 2026-07-25 | [20] 네 원칙 고정: 인증≠가입 · school_id 서버 결정 · 변경 시 권한 · 코드 역할 제한 + Phase B 완료 기준 |
| 2026-07-25 | **Phase B 완료**: `019` schools_v2·공통 인가·RPC 교체·백필 NOT NULL·교차학교 deny·최소 school/ops UI |
| 2026-07-25 | **Phase B.1 착수**: `020` 혼재 큐·ops=`is_app_moderator`·staging JWT 체크리스트·deep link 학교 가드 |
| 2026-07-25 | **B.1 sign-off 템플릿** ([21](./21-phase-b1-staging-signoff.md)) — 기획 종료, staging 실측만으로 닫음 · M 데이터 열람 번짐 금지 |
| 2026-07-25 | **B.1 BLOCKED** 유지 — 자격 증명 요청·계정 규칙·증거 위치 ([access-request](./b1-staging-access-request.md)); 조건부 PASS 금지 |
| 2026-07-25 | **B.1 → Phase H DEFERRED** 재표기 · Phase C(학교 상태 UX·ops) 착수 |
| 2026-07-25 | **Phase C 구현**: `021` needs_more_info·변경/코드/audit ops · school 상태 UX · 미인증 서클 가드 |
| 2026-07-25 | **Phase D 최소 완료**: `022` overview 집계·멤버십 정지·허위인증 신고·학교 병합(admin)·역할 액션 · [22](./22-phase-e-space-design.md) E1 |
| 2026-07-25 | **Phase E 착수**: 우주/서클/친구·내 다이어리 네 화면 콘셉트 고정 — 코딩 전 시안 |
| 2026-07-25 | **Phase E2**: 정적 인터랙티브 프로토타입 4화면 + HTML 미러 + [23](./23-phase-e2-prototype-checklist.md) |
| 2026-07-24 | 4 · 4.5 · 5 · 6 · 6.5 |
| 2026-07-24 | 7~10 · 10.5 · 11 |
| 2026-07-24 | 베타 체크리스트 · 계정 설정 보강 |
| 2026-07-24 | **11.5 실기기 출시 게이트** 문서·체크리스트 고정 |
| 2026-07-24 | 제품 정체성 고정: Your Diary ≠ archive Zalo·학급 미니홈피 |
| 2026-07-24 | **archive 문서·zalo-auth·www 잔재 삭제** (혼동 제거) |
| 2026-07-24 | **내 우주 인트로(사용자 제작 MP4) → 3D 핸드오프** 슬롯·합성·fallback ([19](./19-universe-intro-3d.md)) |
