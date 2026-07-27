# 27 — 책상 장면 레이어드 스프라이트 기획 (방법 2)

> **상태**: 기획 확정 (슬롯 치환) · 에셋·구현 대기  
> **최종 갱신**: 2026-07-27  
> **전제**: 파스텔 `DiaryHompyHome` 셸 유지 · **10자 박스 + 미니 사진첩 → DeskScene(방법 2)으로 치환**  
> **레이아웃 참고**: 정면 구도 픽셀 시안 `cozy-desk-pixel-frontal-v2.png`

---

## 1. 왜 방법 2인가

통짜 배경 + 투명 히트박스(방법 1)는 빠르지만, 이미 정한 요구와 충돌한다.

| 요구 | 방법 1 | 방법 2 |
|------|--------|--------|
| 창문 날씨/시간대 교체 | 통짜 재생성 | 창문 레이어만 교체 |
| 코르크에 **실사진** | 합성·좌표 깨짐 | 슬롯에 Image 끼움 |
| 쪽지/상태 배지 | 애매 | 소품 위 오버레이 |
| 램프 깜빡임 등 개별 모션 | 어려움 | 레이어 단위 |
| 기종별 화면비 | 히트박스 틀어짐 | % 레이아웃으로 완화 |

**결정: 방법 2 — 레이어드 스프라이트 조립.**

---

## 2. 홈피 안 자리 (확정)

파스텔 `DiaryHompyHome` **셸은 유지**하되, 아래 두 블록을 **책상 장면으로 교체**한다.

| 지금 (파스텔) | 이후 |
|---------------|------|
| 「오늘 나는 / Today I…」 **10자 일기** 박스 | 책상 **메모지** (탭 → 작성/수정 · 표시 = `tenCharText`) |
| **미니 사진첩** 패널 | 책상 **코르크보드** (+ 액자 탭 → 앨범) |

```text
[← back]
[프로필: 아바타 · 이름 · 기분 · 서클 · Edit today]   ← 유지 (Today I 박스만 제거)
[  DeskScene  3:2 — 창 | 코르크(사진) / 책상 소품  ]   ← NEW (10자+사진첩 대체)
[주간 캘린더]   ← 유지
[써클·방명록·자유 · 음악]   ← 유지 (파스텔 게시판 · 책상에 칠판 없음)
```

### 코르크 vs 칠판 (혼동 금지)

| | 재질 | 역할 | 위치 |
|--|------|------|------|
| **코르크보드** | 코르크 · 핀 · 폴라로이드 | **사진만** · 탭 → 앨범 | DeskScene 벽 오른쪽 |
| **칠판/게시판** | (책상 에셋 **없음**) | 써클·방명록·자유 | 홈피 **아래** `HompyBoardStack` |

이번 Desk 스코프에 **칠판·게시판 소품을 넣지 않는다.**  
문서의 「보드」는 항상 **코르크(사진)** 를 뜻한다. 액자 → 앨범 보조 입구.

### 잠금과의 관계

- **깨지 않음**: OutlineBox 홈피 골격 · 프로필 · 주간 · **게시판 스택** · 음악  
- **바뀜 (내 홈피만)**: 10자 박스 · 미니앨범 → `DeskScene`  
- 통짜 시안 이미지로 홈피 전체를 덮지 않음

### 친구 / 나

| | 나 | 친구 |
|--|----|------|
| DeskScene | **표시** · 편집 가능 | **없음** — 파스텔 「Today I…」+ 미니앨범 **유지** |
| 게시판 | 아래 파스텔 스택 | 동일 |

책상 감성을 전체에 강제하지 않는다.

---

## 3. 장면 구조

정면 구도 · 가로 위젯(목표 비율 **3:2** 논리 좌표계, 렌더는 컨테이너에 letterbox/cover).

```text
┌──────────────────────────────┐
│  WINDOW (L ~50%) │ CORK (R)  │  ← wall band
├──────────────────────────────┤
│     DESK SURFACE + PROPS     │  ← desk band
└──────────────────────────────┘
```

Z-order (아래→위):

```text
0  desk_bg          벽+책상면 (소품·창·보드 구멍/자리만)
1  window_*         창 유리/하늘 (날씨 변형)
2  corkboard_frame  보드 프레임+코르크 질감
3  cork_slot_0..n   실사진 또는 빈 폴라로이드
4  plant
5  books
6  tomato_timer
7  memo_note
8  photo_frame      (장식 액자 · 탭→앨범)
9  lamp_base
10 lamp_glow        (가산 광 · 애니메이션)
11 badges           (쪽지 점·상태 · 동적 View)
12 hit overlays     (개발용 디버그 시에만 표시)
```

---

## 4. 에셋 목록 (투명 PNG · 픽셀)

공통 스펙:

- 포맷: PNG-8/32 · **투명 배경**  
- 스타일: 16-bit · 굵은 픽셀 · 그라데이션 없음 · 앰버 램프 / 네이비 밤 톤 일치  
- 논리 캔버스: **480×320** (3:2) 기준 그리드에 맞춰 자르기  
- 네이밍: `desk/{name}[@2x].png` → `mobile/assets/desk/`

| ID | 파일 | 내용 | 변형 |
|----|------|------|------|
| `desk_bg` | `desk_bg.png` | 벽+책상만. **창·보드·소품 없음** (자리 가이드용 희미한 영역 OK, 최종은 비우기) | 1 |
| `window_clear` | `window_clear.png` | 맑은 낮/맑은 밤 중 **밤 기본** | |
| `window_cloudy` | `window_cloudy.png` | 흐림 | |
| `window_rain` | `window_rain.png` | 비 | |
| `window_night` | `window_night.png` | 별 밤 (시안 기본과 동일 계열) | ← 기본값 |
| `corkboard` | `corkboard.png` | 프레임+코르크 · **사진 자리 비움**(투명 슬롯) | 1 |
| `cork_empty` | `cork_empty_slot.png` | 빈 폴라로이드 플레이스홀더 | 1 |
| `plant` | `plant.png` | 화분 | 1 |
| `books` | `books.png` | 책 2–3권 스택 | 1 |
| `tomato` | `tomato_timer.png` | 토마토 뽀모도로 | idle / (선택) running 틴트는 코드 |
| `memo` | `memo_note.png` | 짧은 줄만 있는 메모 | 1 |
| `frame` | `photo_frame.png` | 작은 액자 (안의 그림은 최소·교체 가능 슬롯이면 더 좋음) | 1 |
| `lamp` | `lamp.png` | 램프 본체 | 1 |
| `lamp_glow` | `lamp_glow.png` | 부드러운 원뿔 광 (또는 코드로 View opacity) | 1 |

생성 순서 (**톤 확정 우선 · S1보다 먼저**):

```text
1. desk_bg     ← 픽셀 밀도·채도·정면 원근 확정 (여러 번 조정 OK)
2. window_*    ← desk_bg 팔레트에 맞춤
3. corkboard + cork_empty  ← 사진 전용 (칠판 아님)
4. plant / books / tomato / memo / frame / lamp / glow
```

**S1(실로그인·일기 CRUD)은 `desk_bg` 톤이 잠긴 뒤** 병행한다.  
책상 톤이 바뀌면 S1 UI를 다시 건드리지 않도록 순서를 지킨다.

**금지 에셋**: 모니터·PC·키보드·마우스·화면 · **칠판/게시판 보드**.

각 조각은 **같은 카메라(정면)·같은 팔레트·같은 픽셀 스케일**로 뽑는다.  
통짜 시안은 **배치 참고만** — 런타임에 쓰지 않는다.

---

## 5. 레이아웃 좌표계

컨테이너 `DeskScene` 크기 `W×H` (비율 3:2 유지).  
모든 배치는 **정규화 비율** `(x, y, w, h) ∈ 0..1`.

초안 (시안 기준 · 에셋 맞춘 뒤 미세조정):

| 노드 | x | y | w | h | 탭 타깃 |
|---------|---|---|---|---------|
| window | 0.04 | 0.06 | 0.44 | 0.42 | 날씨 선택 (내 홈피만) |
| corkboard | 0.52 | 0.06 | 0.44 | 0.42 | 앨범/업로드 |
| cork_slot_0 | 0.56 | 0.12 | 0.12 | 0.16 | 사진 상세 |
| cork_slot_1 | 0.72 | 0.10 | 0.12 | 0.16 | |
| cork_slot_2 | 0.64 | 0.28 | 0.12 | 0.16 | |
| plant | 0.06 | 0.52 | 0.14 | 0.36 | (선택) 없음 / 장식 |
| books | 0.22 | 0.58 | 0.16 | 0.28 | (선택) 없음 |
| tomato | 0.42 | 0.55 | 0.16 | 0.32 | 뽀모도로 |
| memo | 0.58 | 0.58 | 0.14 | 0.30 | 오늘 일기 작성 |
| frame | 0.72 | 0.60 | 0.12 | 0.28 | 미니 앨범 |
| lamp | 0.84 | 0.48 | 0.14 | 0.42 | (선택) 램프 on/off 연출만 |
| lamp_glow | 0.70 | 0.45 | 0.28 | 0.40 | pointerEvents none |

히트 영역은 스프라이트보다 **약간 크게** (최소 ~44pt 상당).

---

## 6. 상호작용 맵

| 소품 | 동작 | 대체하는 홈피 역할 |
|------|------|-------------------|
| **메모지** | 오늘 **10자** 조회·작성 | 「Today I…」 박스 |
| **코르크 / 슬롯** | 사진 목록·업로드·슬롯 배치 | **미니 사진첩** |
| **액자** | 미니 앨범 라우트 | 사진첩 보조 입구 |
| 창문 | 내 홈피: 날씨 선택 | (신규 연출) |
| 토마토 | 뽀모도로 (Desk Track 후반) | (신규 · S1 필수 아님) |
| 화분·책·램프 | 장식 / 램프 연출 | — |
| 배지 | 쪽지 미읽음 등 | messages |

데이터:

- 메모 문구 = `DiaryEntry.tenCharText` (권한·공개범위 동일)  
- 코르크 슬롯 = 앨범/오늘 사진 URL (최대 3)  
- 주간 캘린더는 그대로 두고, 각 칸 note는 기존처럼 10자 미리보기 가능  


---

## 7. 상태 모델 (초안)

```ts
type DeskWeather = 'night' | 'clear' | 'cloudy' | 'rain';

type DeskSceneState = {
  weather: DeskWeather;           // 내 선택 · 기본 night
  lampOn: boolean;                // 연출
  corkSlots: Array<string | null>; // photo URL or local id, max 3
  unreadNotes?: number;           // 배지
  tomatoRunning?: boolean;
};
```

- `weather` / `corkSlots` / `lampOn`: **나의 책상**만 (친구 홈피에는 DeskScene 없음)  

---

## 8. 컴포넌트 스케치

```text
DeskScene
  ├─ Image desk_bg
  ├─ Image window_{weather}
  ├─ Image corkboard
  ├─ CorkSlot ×3  (Image user photo | cork_empty)
  ├─ Image plant, books, tomato, memo, frame, lamp
  ├─ Image/View lamp_glow (opacity)
  ├─ Badge overlays
  └─ Pressable hit targets (절대 % layout)
```

RN: 부모 `aspectRatio: 1.5` · 자식 `position: 'absolute'` + `%`.

---

## 9. 에셋 생성 프롬프트 체크리스트

각 조각 공통 꼬리표:

> same 16-bit pixel style, warm browns + amber + soft navy, no gradients,  
> transparent background, frontal orthographic, matches desk scene palette,  
> no computer/monitor/screen

개별:

1. **desk_bg** — wall + empty desk surface only, half-left empty window hole, half-right empty corkboard hole (or blank wall rectangles), no props  
2. **window_night** — only the window frame + dark starry sky glass, transparent outside frame  
3. **window_clear / cloudy / rain** — same frame size as night, different sky  
4. **corkboard** — frame + cork texture, empty pin area (transparent slots)  
5. **cork_empty_slot** — blank polaroid  
6. **plant / books / tomato / memo / frame / lamp** — single object each, transparent BG  
7. **lamp_glow** — soft amber cone/circle, highly transparent edges OK as pixel dither  

시안 PNG는 `docs/your-diary/desk-scene/ref/` 에 참고로만 보관.

---

## 10. 구현 단계 (Desk Track)

```text
D0  기획 고정 — 10자+사진첩 치환 · 코르크≠칠판 · 내 홈피만 ✅
D0b desk_bg 톤 확정 (에셋 루프) ← 지금
D0c window → corkboard 톤 맞춤
D1  나머지 소품 + DeskScene 조립 프로토타입
D2  내 DiaryHompyHome에 DeskScene 삽입 (친구는 파스텔 유지)
D3  메모 ↔ tenCharText · 코르크 ↔ 실사진
D4  창문 변형 · 배지·램프 · (선택) tomato
D5  좌표 폴리시
```

**S1**: `desk_bg` 톤 잠금 **이후** 착수 (재작업 최소화).


---

## 11. 완료 정의

- 홈피에서 「Today I…」 박스와 미니 사진첩 패널이 **없고**, 그 자리에 `DeskScene`이 있다  
- 메모 = 10자 CRUD, 코르크 = 사진 슬롯이 **실데이터**로 동작한다  
- 프로필·주간·게시판·음악 OutlineBox 골격은 유지된다  
- 통짜 시안 PNG를 런타임 배경으로 쓰지 않는다  

---

## 12. 다음 액션

1. **`desk_bg` 에셋 생성·톤 확정** (지금)  
2. `window` → `corkboard` 순으로 맞춤  
3. 소품 세트 → DeskScene 조립  
4. 톤 잠금 후 **S1** 병행  
