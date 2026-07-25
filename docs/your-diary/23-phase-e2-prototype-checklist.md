# 23 — Phase E2 Prototype Checklist

> **상태**: E2 **조건부 미승인** — E3 금지 · **E2.1 공간 계층 반영**  
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
| A | 친구 다이어리에서 그 사람의 오늘이 먼저 보인다 | **FAIL** | 문장·기분·음악 계층은 맞지만, 사진이 **빈 둥근 사각형+흐린 원**이라 “방문”이 아니라 “레이아웃 데모”로 읽힘. 이름만 바꾸면 같은 템플릿처럼 보임 |
| B | 작은 카드 그리드로 돌아가지 않았다 | **PASS** | 큰 장면 1개가 지배. album/letters/days는 하단 보조 칩. 기능 대시보드 그리드 아님 |
| C | 네 화면이 같은 세계로 연결된다 | **PASS** | 밤 공간·Fraunces/Outfit·다크 워시·동일 레일. 우주→서클→다이어리로 톤이 이어짐 |

**결론: E3 착수 금지.** A를 PASS로 고친 뒤 재리뷰.

핵심 질문 — *기능을 확인한 게 아니라 정말 그 친구의 하루를 방문한 느낌이 드는가?*  
→ **아니다.** (즉시 “그렇다”가 나오지 않음)

---

## 7문항 상세

### 1. 일반 SNS가 아닌가 — **PASS**

* PASS: 피드/지표 없음. E2.1 이후 중앙 YOU + **크기·거리가 다른** 관계 계층(가까운 컬러 오브 / near / distant 군집).
* 메뉴형 동등 원형 버튼감은 완화됨. 서클 룸 화면은 여전히 보조 경로.

### 2. 서클 ≠ 채팅/게시판 — **PASS**

* 멤버 오브가 중심, notice/board는 하단 보조, 친구 탭→다이어리 경로 명확.
* 메시지/활동 목록 없음.

### 3. 친구의 오늘이 먼저 — **FAIL**

* 구조(사진→문장→기분→음악)는 맞음.
* 시각 매력 실패: 대표 장면이 실사진/분위기 텍스처 없이 placeholder라 감정이 안 붙음.
* 사람마다 달라질 **구조 힌트**(워시·무드 컬러)는 있으나, 빈 미디어 때문에 체감 차별이 약함.

### 4. 작은 박스 쪼개짐 — **PASS**

* 동등 카드 나열 아님. 시선 중심 = 장면.
* 단, placeholder 사진 블록 자체가 “큰 카드 하나”로 느껴질 위험 — A와 같은 원인.

### 5. 같은 세계 — **PASS**

* 타이포·다크 공간·전환 카피(“from universe”, “same world”)로 연속성 유지.
* 우주=공간형, 다이어리=에디토리얼형 차이는 있으나 같은 밤 세계 안.

### 6. 학교 = 경계만 — **PASS**

* 학교명/반/학년/탐색/전교 요소 없음.

### 7. 다음 행동 — **PASS (약함)**

* 우주→서클, 서클→친구, 내 다이어리→쓰기 카피 명확.
* 하단 오브제(album/letters/days)는 장식/버튼 경계가 약함(프로토타입 한계).

---

## E2 재작업 최소 범위 (E3 전)

1. **Friend/My Diary 장면 미디어** *(여전히 열림 — A FAIL)*  
   - fixture용 **실제 분위기 이미지**/질감으로 placeholder 제거  
   - 친구/내 다이어리 **시각적으로 다른 장면**
2. **Universe E2.1 공간 계층** — **PASS (재캡처 2026-07-25)**  
   - 중앙 나 + 가까운 친구 3(큰 컬러 오브·짧은·서로 다른 거리·희미한 선)  
   - near 중간 점 · distant 작은 점(서클별 느슨한 군집)  
   - 먼 점 탭 → 당김 + 이름/서클/방문 · 가까운 오브 → 바로 다이어리  
   - **자동 친밀도·알림·공개 점수 없음** ([22](./22-phase-e-space-design.md) E2.1)
3. 프로토타입 상단 레일은 리뷰용 노이즈로 감안

모션으로 A를 덮지 말 것. 정적 장면에 하루가 보여야 함.

---

## E2.1 spatial review (Universe only)

| 항목 | 판정 |
|------|------|
| 크기 + 거리로 층위 표현 | **PASS** |
| close-3 수동·비공개 카피/규칙 | **PASS** |
| distant 이름 숨김 → 포커스 시 공개 | **PASS** (HTML/앱 동작) |
| 거리 ≠ 온라인/인기/호감 자동점수 | **PASS** |
| Friend today 장면(A) | **FAIL** (별건 — E3 여전히 금지) |

---

## Deliverables (구현 위치)

| 항목 | 위치 |
|------|------|
| Design tokens | `mobile/src/features/e2-prototype/tokens.ts` |
| Fixture data | `mobile/src/features/e2-prototype/fixtures.ts` |
| Screens | `mobile/app/prototype/e2/*` |
| HTML mirror | `docs/your-diary/e2-prototype/index.html` |
| Captures | `/opt/cursor/artifacts/screenshots/e2-prototype/` |

---

## Reviewer sign-off

| | |
|--|--|
| Result | ☐ PASS · ☑ **FAIL — revise A then re-review** |
| E3 allowed | **No** |
| Reviewed at (UTC) | 2026-07-25 |
| Notes | E2.1 universe spatial hierarchy PASS. Emotional visit (A) still FAIL on empty diary scene — E3 blocked. |
