# 23 — Phase E2 Prototype Checklist

> **상태**: E2 **조건부 미승인** — E3 금지  
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

### 1. 일반 SNS가 아닌가 — **PASS (약함)**

* PASS: 피드/지표 없음. 중앙 YOU + 주변 서클 공간 배치.
* 잔여 FAIL 신호: 서클이 아직 **라벨 달린 원형 버튼**에 가깝고, 별/깊이감이 얇음. “공간”보다 “아이콘 배치”에 가까울 때 있음.

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

1. **Friend/My Diary 장면 미디어**  
   - fixture용 **실제 분위기 이미지**(또는 강한 그라데이션·빛 얼룩·질감)로 placeholder 제거  
   - 친구/내 다이어리 **시각적으로 다른 장면**이 한눈에 구분
2. **Universe 서클 오브**  
   - 메뉴 버튼감 완화: 크기/광채/거리감 차이, 라벨을 버튼 캡션처럼 보이게 하지 않기
3. 프로토타입 상단 레일은 리뷰용으로 유지하되, **첫인상 판정 시 시각적 노이즈**임을 감안 (제품 UI 아님)

모션으로 A를 덮지 말 것. 정적 장면에 하루가 보여야 함.

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
| Notes | Structure principles OK; emotional visit FAIL on empty diary scene |
