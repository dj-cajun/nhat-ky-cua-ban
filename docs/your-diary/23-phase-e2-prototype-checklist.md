# 23 — Phase E2 Prototype Checklist

> **상태**: E2 **승인 (조건부 구조 PASS)** — E2.1·E2.2 반영 · E3 허용  
> **리뷰어**: cloud agent (실제 HTML 미러 캡처 후 판정)  
> **캡처**: `/opt/cursor/artifacts/screenshots/e2-prototype/e2-{universe,circle,friend,mine}.png`  
> **앱 경로**: `/prototype/e2`  
> **브라우저 미러**: [`e2-prototype/index.html`](./e2-prototype/index.html)  
> **콘셉트**: [22](./22-phase-e-space-design.md)

실데이터·migration·RLS·RPC·인가 로직 **미연결**. fixture only.

---

## 필수 3항 (하나라도 FAIL이면 E3 금지)

| # | 필수 조건 | 판정 | 근거 (캡처 기준) |
|---|-----------|------|------------------|
| A | 친구 다이어리에서 그 사람의 오늘이 먼저 보인다 | **PASS** | 따뜻한 **오후 창** 장면(빛·책상·잔)이 히어로. 문장·기분·음악이 그 장소에 붙음. “레이아웃 데모”가 아니라 **방문한 하루**로 읽힘 |
| B | 작은 카드 그리드로 돌아가지 않았다 | **PASS** | 큰 장면 1개가 지배. album/letters/days는 하단 보조 칩. 기능 대시보드 그리드 아님 |
| C | 네 화면이 같은 세계로 연결된다 | **PASS** | 밤 공간·Fraunces/Outfit·다크 워시·동일 레일. 우주→서클→다이어리로 톤이 이어짐 |

**결론: E3 착수 허용.** (구조 교체 단계 — 실데이터/인가 연결은 E5)

핵심 질문 — *기능을 확인한 게 아니라 정말 그 친구의 하루를 방문한 느낌이 드는가?*  
→ **그렇다.** (창빛·책상 장면 + 오늘 문장이 한 호흡)

---

## 7문항 상세

### 1. 일반 SNS가 아닌가 — **PASS**

* PASS: 피드/지표 없음. E2.1 이후 중앙 YOU + **크기·거리가 다른** 관계 계층(가까운 컬러 오브 / near / distant 군집).
* 메뉴형 동등 원형 버튼감은 완화됨. 서클 룸 화면은 여전히 보조 경로.

### 2. 서클 ≠ 채팅/게시판 — **PASS**

* 멤버 오브가 중심, notice/board는 하단 보조, 친구 탭→다이어리 경로 명확.
* 메시지/활동 목록 없음.

### 3. 친구의 오늘이 먼저 — **PASS**

* 구조(장면→문장→기분→음악) 유지.
* E2.2: 친구=따뜻한 오후 창 / 나=차가운 아침 책상·노트·램프 — **한눈에 다른 장소**.
* placeholder 빈 블록 제거.

### 4. 작은 박스 쪼개짐 — **PASS**

* 동등 카드 나열 아님. 시선 중심 = 장면.

### 5. 같은 세계 — **PASS**

* 타이포·다크 공간·전환 카피(“from universe”, “same world”)로 연속성 유지.

### 6. 학교 = 경계만 — **PASS**

* 학교명/반/학년/탐색/전교 요소 없음.

### 7. 다음 행동 — **PASS (약함)**

* 우주→서클, 서클→친구, 내 다이어리→쓰기 카피 명확.
* 하단 오브제(album/letters/days)는 장식/버튼 경계가 약함(프로토타입 한계 · E5).

---

## E2 재작업 이력

1. **Friend/My Diary 장면 미디어** — **PASS (E2.2 · 2026-07-26)**  
   - `SceneArt`: `friendWindow` / `myDesk` (SVG 분위기 장면)  
   - HTML 미러 동일 · 친구/내 다이어리 시각 차별 명확
2. **Universe E2.1 공간 계층** — **PASS (2026-07-25)**  
   - 중앙 나 + close-3 · near · distant · 자동 친밀도 금지
3. 프로토타입 상단 레일은 리뷰용 노이즈로 감안

---

## E2.1 spatial review (Universe only)

| 항목 | 판정 |
|------|------|
| 크기 + 거리로 층위 표현 | **PASS** |
| close-3 수동·비공개 카피/규칙 | **PASS** |
| distant 이름 숨김 → 포커스 시 공개 | **PASS** (HTML/앱 동작) |
| 거리 ≠ 온라인/인기/호감 자동점수 | **PASS** |
| Friend today 장면(A) | **PASS** (E2.2) |

---

## Deliverables (구현 위치)

| 항목 | 위치 |
|------|------|
| Design tokens | `mobile/src/features/e2-prototype/tokens.ts` |
| Fixture data | `mobile/src/features/e2-prototype/fixtures.ts` |
| Scene art | `mobile/src/features/e2-prototype/SceneArt.tsx` |
| Screens | `mobile/app/prototype/e2/*` |
| HTML mirror | `docs/your-diary/e2-prototype/index.html` |
| Captures | `/opt/cursor/artifacts/screenshots/e2-prototype/` |

---

## Reviewer sign-off

| | |
|--|--|
| Result | ☑ **PASS** · ☐ FAIL |
| E3 allowed | **Yes** |
| Reviewed at (UTC) | 2026-07-26 |
| Notes | E2.1 spatial PASS + E2.2 distinct atmospheres PASS. Next: E3 structural implementation (no production data yet). |
