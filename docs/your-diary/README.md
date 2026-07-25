# Your Diary / 「너의 다이어리」 — 현행 기획·지침

> **제품**: Your Diary (US App Store 우선) · 한국어 내부명 「너의 다이어리」  
> **한 줄**: 같은 학교라는 신뢰의 경계 안에서 작은 서클을 만들고, 서로의 하루를 조용히 방문하는 폐쇄형 관계 다이어리  
> **이 폴더 + `src/` + `mobile/`**: **유일한 현행 제품 기준**.  
> **계층**: 학교(바깥 경계) → 서클(관계 단위) → 다이어리(중심). 학교 전체 피드·전교 검색은 만들지 않는다. 상세: [20](./20-school-trust-boundary-plan.md)

---

## 웹 홈피 (Vite 기본)

`npm run dev` → **`/`** = Your Diary  
파스텔 미니홈피 UI에 서클 다이어리 기능을 입힌다.

| 유지 | 버림 |
|------|------|
| 프로필 카드 · 파스텔 프레임 · 캘린더/앨범/방명록 분위기 | 학교·Zalo · TODAY/TOTAL · 도토리 · 수사 · 선물 |

매핑 상세: [18-minihome-ui-mapping.md](./18-minihome-ui-mapping.md)  
시각 참고만: `legacy-minihome-reference/` (`443d8b3^`)

---

## 제품 정체성

**Your Diary** = 세 사람의 신뢰로 열리는 폐쇄형 서클 다이어리.  
「미니홈피」는 한 사람의 하루를 방문하는 **구조·UI 비유**이지, 학급 꾸미기 제품이 아니다.  
**mobile/** = 앱스토어용 네이티브 경로.

---

## 문서 목록

| 문서 | 내용 |
|------|------|
| [01-product-flow.md](./01-product-flow.md) | 기능 플로우 · 도메인 원칙 |
| [02-tech-guidelines.md](./02-tech-guidelines.md) | 기술 스택 · 서버 신뢰 · RLS/RPC |
| [03-us-market.md](./03-us-market.md) | 미국 앱 가정 · 카피 · 인증 |
| [04-phase-4-join.md](./04-phase-4-join.md) | 4단계: 3인 추천 가입 (완료) |
| [05-phase-4.5-rls.md](./05-phase-4.5-rls.md) | 4.5단계: RLS 침투 테스트 |
| [06-phase-5-realtime-presence.md](./06-phase-5-realtime-presence.md) | 5단계: Realtime 초록 배지 |
| [07-phase-6-circle-posts.md](./07-phase-6-circle-posts.md) | 6단계: 공지·투표 + 주홍 배지 |
| [08-phase-6.5-verified-response-badges.md](./08-phase-6.5-verified-response-badges.md) | 6.5단계: 주홍 위조 방어 |
| [09-phase-7-reports-blocks.md](./09-phase-7-reports-blocks.md) | 7단계: 신고·차단 기반 |
| [10-phase-8-anonymous-board.md](./10-phase-8-anonymous-board.md) | 8단계: 가명 게시판 |
| [11-phase-9-private-messages.md](./11-phase-9-private-messages.md) | 9단계: 실명·가명 쪽지 |
| [12-phase-10-spotify-music.md](./12-phase-10-spotify-music.md) | 10단계: Spotify 오늘의 음악 |
| [13-phase-10.5-legacy-cleanup.md](./13-phase-10.5-legacy-cleanup.md) | 10.5단계: 레거시 정리 |
| [14-phase-11-beta-stabilization.md](./14-phase-11-beta-stabilization.md) | 11단계: 통합 안정화·베타 준비 |
| [15-beta-launch-checklist.md](./15-beta-launch-checklist.md) | 비공개 베타·**11.5 실기기** 출시 체크리스트 |
| [16-phase-11.5-device-launch-gate.md](./16-phase-11.5-device-launch-gate.md) | 11.5단계: 실기기 출시 게이트 |
| [17-i18n-en-ko.md](./17-i18n-en-ko.md) | 1차 UI 언어: English · 한국어 |
| [18-minihome-ui-mapping.md](./18-minihome-ui-mapping.md) | 미니홈피 UI → Your Diary 매핑 |
| [19-universe-intro-3d.md](./19-universe-intro-3d.md) | 내 우주 인트로 영상 → 3D 핸드오프 |
| [20-school-trust-boundary-plan.md](./20-school-trust-boundary-plan.md) | **학교 신뢰 경계** 기획·감사·페이즈 |
| [21-phase-b1-staging-signoff.md](./21-phase-b1-staging-signoff.md) | Phase H staging JWT 런북 (DEFERRED) |
| [22-phase-e-space-design.md](./22-phase-e-space-design.md) | **Phase E** 우주·다이어리 네 화면 콘셉트 |
| [23-phase-e2-prototype-checklist.md](./23-phase-e2-prototype-checklist.md) | **E2** 프로토타입 리뷰 체크리스트 |
| [e2-prototype/index.html](./e2-prototype/index.html) | E2 브라우저 정적 미러 |
| [roadmap.md](./roadmap.md) | 단계별 로드맵 · 완료/다음 |

**갱신 규칙**: 단계가 끝날 때마다 `roadmap.md` 상태와 해당 phase 문서를 같이 고친다. 새 중간 지침이 오면 이 폴더에 추가·개정하고 커밋한다.
