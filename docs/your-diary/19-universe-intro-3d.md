# 19 — 내 우주 인트로 영상 → 3D 핸드오프

> **상태**: 현행  
> **최종 갱신**: 2026-07-24  
> **영상**: 사용자가 제작 · 앱은 슬롯 + 크로스페이드 + 3D 홈만 담당

---

## 흐름

```text
인트로 영상 (공통)
→ 마지막 프레임 = 중앙 금빛 구체
→ 영상 opacity 1→0 / 3D opacity 0→1 (크로스페이드)
→ 프로필 페이드업 (사용자별)
→ 서클 행성 순차 등장
→ 중앙 구체 탭 → 파스텔 미니홈피 (/diary/[userId])
→ 행성 탭 → 서클 상세 (이후 2D)
```

3D는 **내 우주 홈에만**. 미니홈피·쪽지·서클 상세는 2D 유지.

---

## 영상 파일 넣는 곳

`mobile/assets/intro/universe-birth.mp4`

**기본 영상**이 레포에 포함되어 있다. 직접 만든 영상으로 교체해도 된다. 앱은 슬롯 + 크로스페이드 + 3D만 담당.

1. 파일을 위 경로에 저장 (또는 `cd mobile && npm run render:intro`로 생성)
2. `cd mobile && npm run sync:intro` (또는 `npm start`)
3. 다음 빌드부터 번들 MP4 사용

레포에 기본 `universe-birth.mp4`가 포함되어 있다. 교체하려면 같은 경로에 덮어쓰고 sync한다.

### 로컬에서 인트로 → 우주 → 서클까지

```bash
cd mobile
npm install --legacy-peer-deps
npm run start:intro   # 전체 인트로 강제 (iOS/Android 시뮬레이터 권장)
```

1. **Try the demo** → 데모 서클(Brooklyn Friends) 시드 + 전체 인트로 예약  
2. My Universe: `universe-birth.mp4` → 크로스페이드 → 구체/행성  
3. 중앙 구체 → **미니홈피** · 행성 → 서클 상세 · Diary 탭 → 같은 미니홈피

웹만 볼 때: `npm run web:intro` (인트로는 MP4, 우주는 2D glow fallback).

---

## 영상 제작 스펙 (그대로 전달)

> 세로형 **9:16** 모바일 인트로. 완전히 어두운 우주에서 아주 작은 따뜻한 별이 **중앙**에 나타난다. 별은 천천히 태양처럼 커지고 강하게 밝아지며 주변 우주 먼지와 얇은 빛의 고리를 비춘다. 최고 밝기에 도달한 뒤 빛이 부드럽게 줄어들고, **마지막 프레임에는 화면 중앙에 따뜻한 금빛의 완전한 구체 하나만** 안정적으로 떠 있다. 카메라 이동은 최소화하고 중앙 구체의 **최종 위치와 크기를 고정**한다. 텍스트·사람·로고 없음. **마지막 0.5초는 거의 정지**.

권장 길이: **약 4초**  
크로스페이드 시작: **약 3.5초** (앱 상수 `INTRO_HANDOFF`와 맞춤)

### 핸드오프 맞춤 상수 (`mobile/src/features/universe-home/handoff.ts`)

| 항목 | 값 |
|------|-----|
| 영상 비율 | 9:16 |
| 구체 중심 | 영상 가로 50% · 세로 ~48% |
| 지름 | **영상** 너비의 ~42% |
| 색 | 따뜻한 금 `#F0C36A` / 글로우 `#FFE6A8` |

뷰포트가 9:16이 아니면 인트로 MP4는 `object-fit: cover`로 잘린다.  
라이브 2D/3D는 cover 기하에 `liveOpticalScale`(~0.88)을 곱해 **영상 소프트 림**과 맞춘 뒤,  
`homeDiameterRatio`(뷰포트 너비 ~26%)로 **천천히 줄어드는** 정착 애니(~2.4s)를 재생한다.

---

## 재생 정책

| 상황 | 동작 |
|------|------|
| 설치 후 최초 (또는 설정에서 리플레이) | 전체 영상 |
| 평소 cold start | 짧은 구체 등장 (~0.5s) |
| 탭에서 우주로 복귀 | 영상 없이 3D 바로 |
| 설정 | 「인트로 다시 보기」 |

---

## 기술

- 영상: `expo-video`
- 3D: `@react-three/fiber/native` + `three` + `expo-gl`
- 전환: Reanimated opacity 크로스페이드
- GL/3D 실패·저사양: **2D glow sphere fallback** (같은 핸드오프 상수)

---

## 구현 위치

- `mobile/src/features/universe-home/`
- 화면: `mobile/app/(tabs)/universe.tsx`
