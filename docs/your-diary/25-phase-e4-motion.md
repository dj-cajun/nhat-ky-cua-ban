# 25 — Phase E4 Motion · Intro · Objects

> **상태**: 구현  
> **선행**: E3 구조 교체 ([24](./24-phase-e3-structure.md))

## 목표

의도적 모션 2–3개 이상으로 **존재감·계층**을 주고, 오브제를 버튼 칩이 아니라 **작은 물건**처럼 보이게 한다.  
기능 고도화(실데이터)는 E5.

## 모션 목록 (제품)

| # | 모션 | 위치 | 의미 |
|---|------|------|------|
| 1 | 인트로 → settle | `UniverseHome` / `INTRO_HANDOFF` | 이미 있던 핸드오프 유지 |
| 2 | 자기 오브 호흡 | `FallbackUniverse` + `BreathingView` | settle 후 약한 숨 |
| 3 | 먼 점 당김 | `SpatialDot` | 포커스 시 가까이·확대 |
| 4 | 서클 입장 | `EnterFade` + ring breath | 룸 진입 호흡 |
| 5 | 다이어리 장면 입장 | `EnterFade` stagger | “하루로 들어감” |

토큰: `mobile/src/features/space-ui/space-motion.ts`

## 오브제

- 서클: notice / board에 작은 글리프
- 다이어리: album · letters · days · focus · board 글리프 + 눌림 스케일
- 라이브 데이터 연결은 E5

## 비범위

- 서버 close-3
- 토마토 집중방 실기능
- 과도한 bounce / 글로우 스팸

## 완료 신호

첫 우주와 다이어리 입장이 **정적 목업이 아니라 살아 있는 자리**로 느껴질 때.
