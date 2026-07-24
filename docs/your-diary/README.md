# Your Diary / 「너의 다이어리」 — 현행 기획·지침

> **제품**: Your Diary (US App Store 우선) · 한국어 내부명 「너의 다이어리」  
> **한 줄**: 세 사람이 신뢰의 문을 열고, 서로의 하루를 조용히 방문하는 폐쇄형 서클 다이어리  
> **이 폴더 + `src/` + `mobile/`**: **유일한 현행 제품 기준**.  
> **레거시**: `docs/archive/zalo-demo/` — 구 Zalo·학급 제품 역사 자료. **제품 기준으로 쓰지 말 것.**

---

## 제품 정체성 (혼동 방지)

**Your Diary는 세 사람의 신뢰로 열리는 폐쇄형 서클 다이어리다.**  
아는 사람의 하루를 조용히 방문하고, 다이어리·사진·방명록·공지·투표·가명 게시판·편지형 쪽지를 사용한다.

「미니홈피」는 앱스토어 카테고리가 아니라, **사람의 페이지를 찾아가 하루를 보는 구조**를 설명하는 비유다.

### 현행 제품에 없는 것

- Afterbell 브랜딩  
- yearbook · Capsule · Daily Drop 포지셔닝  
- 학교 인증 중심 구조  
- TODAY / TOTAL 방문자  
- Sparks · 도토리 · 선물 경제  
- 꾸미기 상점  
- 신원 추리 힌트 · InvestigationPanel  
- 실시간 채팅  
- 포모도로 · 공부방  

### 현행 vs 아카이브

| 구분 | 현행 Your Diary | 아카이브 (`docs/archive/zalo-demo`) |
|------|-----------------|-------------------------------------|
| 관계 구조 | 신뢰 기반 폐쇄 서클 | 학교·학급 중심 |
| 핵심 행동 | 친구의 하루 방문 | 반 커뮤니티·관계 놀이 |
| 표현 방식 | 다이어리·사진·음악 | 꾸미기·선물·수사극 |
| 익명성 | 안전한 가명 표현 | 추리·힌트 놀이 |
| 지표 | 조용한 방문, 조회수 없음 | TODAY/TOTAL·보상 요소 |
| 메시지 | 편지형 실명·가명 쪽지 | 과거 DM/쪽지 규칙 (문서만) |
| 현재 상태 | **실제 제품** | **역사 자료만** |

한 줄: **옛 제품은 학교용 관계 놀이 미니홈피였고, 현재 제품은 조용한 폐쇄 서클 다이어리다.**

AI·기여자 규칙: 스펙·카피·구현 판단은 `docs/your-diary`와 `src` / `mobile`만 본다. archive를 현행과 합치지 않는다.

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
| [roadmap.md](./roadmap.md) | 단계별 로드맵 · 완료/다음 |

**갱신 규칙**: 단계가 끝날 때마다 `roadmap.md` 상태와 해당 phase 문서를 같이 고친다. 새 중간 지침이 오면 이 폴더에 추가·개정하고 커밋한다.
