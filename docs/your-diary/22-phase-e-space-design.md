# 22 — Phase E 우주·다이어리 공간 디자인 콘셉트

> **상태**: E1 확정 · **E2 정적 프로토타입 리뷰 대기** ([23](./23-phase-e2-prototype-checklist.md))
> **원칙**: 장식 추가가 아니라 **공간 구조**를 다시 잡는다.  
> **금지**: 같은 크기 카드 나열 · 학교 피드 · 방문자 목록 · 인기/좋아요

---

## 왜 E가 중요한가

학교 경계(B–D)는 신뢰를 만든다.  
제품이 **쓰고 싶게** 만드는 것은 첫인상과 개인 공간이다.

흐름:

```text
시네마틱 우주 인트로
→ 공간에 떠 있는 나의 원형 오브
→ 내 주변의 서클
→ 서클 안 친구 선택
→ 친구의 다이어리 공간 방문
```

---

## 네 화면 시안 (E1 고정)

코딩·모션 전에 이 네 화면의 역할·계층·금지 요소를 잠근다.

### 1) 우주 홈 (My Universe)

| | |
|--|--|
| **한 가지 일** | “나는 우주에 있고, **관계마다 거리감이 있다**” |
| **히어로** | 중앙 **나의 원형 오브** |
| **주변** | 사람 노드의 **크기 + 거리** (서클 메뉴 버튼 아님) |
| **CTA** | 가까운 친구 오브 → 바로 다이어리 / 먼 점 → 포커스 후 방문 |
| **모션** | 인트로 핸드오프 → 오브 호흡 → 포커스 시 점 당김 (E4) |
| **금지** | 통계 스트립, 친밀도 자동 점수, 선택 알림, 학교 홈 |

#### E2.1 Spatial relationship hierarchy

```text
Spatial relationship hierarchy:

- The authenticated user remains the central anchor.
- Up to three privately selected close friends appear as large, uniquely colored orbs positioned nearest to the user.
- Other authorized circle members appear as smaller graph-like nodes at greater distances.
- Node size and distance communicate private spatial emphasis, not a public friendship score.
- Close-friend placement is manually selected and never inferred from visits, notes, presence, or engagement.
- Selection, replacement, size, and distance are private to the viewing user.
- Distant nodes reveal names only when focused or tapped.
- Selecting a distant node may temporarily bring it closer and reveal a diary entry action.
- Spatial distance must never represent online status, popularity, responsiveness, or reciprocal affection.
```

```text
             ·  distant

      🟣 close A (front)
                         ·
                나
   🟠 close B                    · near
                     🟢 close C (back)
          ·       ·        ·  cluster
```

### 2) 서클 (Circle graph)

| | |
|--|--|
| **한 가지 일** | “이 서클 안에서 누구의 다이어리로 갈지” |
| **히어로** | 서클 이름/색/심볼이 공간을 물들이고, **친구 오브**가 떠 있음 |
| **선택** | 친구 탭 → 그 사람의 다이어리 공간 |
| **보조** | 공지·투표·가명보드·쪽지는 **오브제/코너** (동등 카드 X) |
| **금지** | 멤버 표 나열, 학교 소속 배지 나열, 피드형 타임라인 |

```text
[ circle atmosphere ]
   name / symbol wash
     ●  ●  ●  friends
  [notice] [board] — small objects
```

### 3) 친구 다이어리

| | |
|--|--|
| **한 가지 일** | “오늘 그 사람의 하루를 느낀다” |
| **히어로** | **오늘의 사진 · 문장 · 기분** 크게 + 음악이 분위기 |
| **오브제** | 사진첩 · 편지함 · 달력 — 작고 구석/하단 |
| **없음** | 토마토(집중방) — **내 다이어리에만** |
| **금지** | 기능 그리드, 방문 알림, 좋아요/조회수 |

```text
[ mood wash + music ]
   PHOTO
   short sentence
   mood
  ·album ·letter ·cal   (objects)
```

### 4) 내 다이어리

| | |
|--|--|
| **한 가지 일** | “오늘을 쓰고, 내 공간에 머문다” |
| **히어로** | 친구 다이어리와 같은 계층 + **편집 가능** |
| **토마토** | 집중방 입구 — 유일한 큰 보조 오브 (남용 금지) |
| **사람마다** | 색/질감/음악/사진으로 **분위기가 분명히 달라짐** |
| **금지** | 설정 메뉴처럼 보이는 카드 벽 |

```text
[ personal atmosphere ]
   PHOTO / sentence / mood
   tomato focus door
  ·album ·letter ·cal
```

---

## 시각·모션 가드 (E2+에 유지)

- 브랜드/제품명이 첫 뷰포트에서 약해지지 않게 (우주 = Your Diary 공간)
- 카드 기본값 = 없음. 상호작용 컨테이너일 때만
- 첫 뷰포트에 통계·일정·프로모 금지
- 의도적 모션 2–3개 이상 (인트로, 오브 호흡, 서클/다이어리 진입)
- AI 기본 룩 회피: 보라 그라데이션·크림+세리프+테라코타·신문형 다단

---

## E 진행 순서

```text
E1  이 문서 콘셉트 확정          ✅
E2  정적 프로토타입 (4화면)     리뷰 FAIL(친구 오늘 장면) — E3 금지
E2.1 우주 관계 거리(크기+거리)  PASS · 수동 close-3 · 자동 친밀도 금지
E2.2 친구/내 다이어리 장면 미디어 ← 다음 (A FAIL 해소)
E3  핵심 화면 구현 (구조 교체)  ⛔ E2 승인 전 금지
E4  모션·인트로·오브제
E5  실제 기능 연결 (공지/편지/달력/토마토)
```

E2는 Figma/정적 RN 목 중 하나로 **네 화면이 한 호흡으로 읽히는지** 검증한 뒤 E3에 들어간다.

---

## 완료 정의 (E)

> 기능이 다 있어도, **첫 우주 진입과 다이어리 공간이 “작은 박스 모음”이 아니라 “머물고 싶은 자리”로 느껴질 때** Phase E를 닫는다.
