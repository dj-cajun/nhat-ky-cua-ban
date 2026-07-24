# Your Diary / 「너의 다이어리」 — 현행 기획·지침

> **제품**: Your Diary (US App Store 우선) · 한국어 내부명 「너의 다이어리」  
> **한 줄**: 세 사람이 신뢰의 문을 열고, 서로의 하루를 조용히 방문하는 폐쇄형 서클 다이어리  
> **이 폴더 + `src/` + `mobile/`**: **유일한 현행 제품 기준**.

---

## 웹 홈피 (Vite 기본)

`npm run dev` → **`/`** 는 원래 **5층 홈피**다.

StatusBar · ProfileCard · Calendar · PhotoAlbum · SwipeCardStack  
(파스텔·손그림 스킨)

서클 v1 데모만 보려면 `/?v1=1`.

> Phase 10.5에서 홈피가 “레거시”로 잘못 삭제됐다가 복구했다. 삭제하지 말 것.

---

## 제품 정체성

**Vite 홈피** = 방문·일기·앨범·피드가 한 화면에 있는 원래 인터페이스.  
**mobile/** = 서클·다이어리·쪽지·Spotify 등 앱스토어용 네이티브 경로.

기획 아카이브(`docs/archive`)는 저장소에서 제거됐다. 코드의 홈피 UI는 제품의 일부다.

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
| [roadmap.md](./roadmap.md) | 단계별 로드맵 · 완료/다음 |

**갱신 규칙**: 단계가 끝날 때마다 `roadmap.md` 상태와 해당 phase 문서를 같이 고친다. 새 중간 지침이 오면 이 폴더에 추가·개정하고 커밋한다.
