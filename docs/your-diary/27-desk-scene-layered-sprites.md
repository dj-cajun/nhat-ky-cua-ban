# 27 — 책상 장면 레이어드 스프라이트 기획 (방법 2)

> **상태**: 기획 (에셋·구현 대기) · **S1~S4 제품 경로에는 아직 넣지 않음**  
> **최종 갱신**: 2026-07-27  
> **전제**: 파스텔 `DiaryHompyHome` **베이스 잠금은 유지**. 본 문서는 통짜 이미지 대신 **조립형 책상 위젯**을 만드는 설계다.  
> **레이아웃 참고**: 정면 구도 픽셀 시안  
>   `cozy-desk-pixel-frontal-v2.png` (창 | 보드 반반 · 램프 톤)

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

## 2. 제품 안에서의 자리 (잠금과 충돌 방지)

아직 **홈피를 통째로 교체하지 않는다.**

```text
옵션 A (권장 후보) — “내 책상” 위젯
  파스텔 홈피 상단(또는 별 탭/진입)에 책상 장면을 **가산**
  소품 탭 → 기존 라우트 (일기 쓰기 / 앨범 / 뽀모도로…)

옵션 B — 내 다이어리만 전면 책상 셸
  친구는 파스텔 홈피 유지 · 나만 책상
  → 두 셸 유지 비용↑ · v1.0 비권장

옵션 C — 집중방/포커스 전용
  토마토만 책상 장면으로 진입
  → 범위 작음 · 날씨·코르크 가치가 약해짐
```

**기획 고정(임시)**: **옵션 A** 방향으로 설계한다.  
구현 착수는 **홈피 실데이터(S1) 이후** · 정식 v1.0 GO 체크리스트와 별 트랙(`Desk Scene`).

열린 확정 과제(구현 전 한 줄로 잠글 것):

- 친구 방문 시 책상 위젯을 **보여주는가 / 숨기는가**  
- 기본값: **내 홈피에만** 책상 · 친구는 파스텔만 (토마토·뽀모도로와 동일 원칙)

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

**금지 에셋**: 모니터·PC·키보드·마우스·화면.

생성 순서:

1. `desk_bg` (레이아웃 뼈대)  
2. `window_*` · `corkboard` (벽 반반)  
3. 책상 소품 5종 + lamp  
4. glow / empty slot  

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

| 소품 | 동작 | 기존 제품 연결 |
|------|------|----------------|
| 창문 | 내 홈피: 날씨/시간대 **직접 선택** 시트 | 로컬 또는 diary day meta |
| 코르크보드 / 슬롯 | 사진 목록 · 업로드 · 슬롯에 배치 | `/diary/[id]/album` · entry photos |
| 메모 | 오늘 일기 작성/수정 | `onEditToday` / diary editor |
| 토마토 | 뽀모도로 시작 | 포커스룸 최소 (S5+ 기능) |
| 액자 | 미니 사진첩 | album |
| 화분·책·램프 | 기본 비탭 또는 약한 연출만 | — |
| 배지 | 쪽지 미읽음 등 | messages |

친구 홈피에서 책상을 켠다면: **창문 선택·업로드·뽀모도로는 비활성** · 조회만.

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

- `weather` / `corkSlots` / `lampOn`: **나의 책상** 스코프 (서버 필드 또는 로컬 — S 트랙에서 스키마 결정)  
- 친구 조회 시 owner의 공개 가능한 슬롯·날씨만 표시  

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
D0  본 기획 고정 · 옵션 A · 내 홈피만
D1  에셋 세트 v1 (night + 소품) · DeskScene 조립 프로토타입
D2  히트 → 기존 라우트 연결 (memo/album) · 좌표 폴리시
D3  창문 변형 · 코르크 실사진 슬롯
D4  배지·램프 모션 · (선택) tomato → 최소 타이머
D5  파스텔 홈피에 위젯으로 삽입 · 친구 홈피 정책 확정
```

**S1과 병렬로 에셋만 준비 가능. 제품 삽입은 S1 홈피 CRUD 이후.**

---

## 11. 완료 정의

- 통짜 시안 없이 **조립만으로** 시안과 같은 구도가 나온다  
- 창문·코르크 사진·메모 탭이 **상태/실데이터**로 바뀐다  
- 기종 폭이 달라도 히트 타깃이 소품과 어긋나지 않는다 (± 허용 오차 문서화)  
- 파스텔 홈피 베이스 레이아웃을 대체하지 않는다 (옵션 A)

---

## 12. 다음 액션

1. 사용자 확인: 옵션 A(가산 위젯) · 내 홈피만 OK?  
2. OK 시 `desk_bg`부터 개별 에셋 프롬프트로 생성  
3. `DeskScene` 프로토타입 라우트 (`/prototype/desk` 등)  

S1 실로그인·일기 CRUD와 **동시에 본 트랙 전체 구현을 섞지 않는다.**
