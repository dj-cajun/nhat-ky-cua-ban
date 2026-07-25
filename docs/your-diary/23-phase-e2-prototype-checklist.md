# 23 — Phase E2 Prototype Checklist

> **상태**: E2 정적 프로토타입 리뷰 대기 (E3 금지)  
> **앱 경로**: `/prototype/e2`  
> **브라우저 미러**: [`e2-prototype/index.html`](./e2-prototype/index.html)  
> **콘셉트**: [22](./22-phase-e-space-design.md)

실데이터·migration·RLS·RPC·인가 로직 **미연결**. fixture only.

---

## Deliverables

| 항목 | 위치 |
|------|------|
| Design tokens | `mobile/src/features/e2-prototype/tokens.ts` |
| Fixture data | `mobile/src/features/e2-prototype/fixtures.ts` |
| Shared atmosphere | `Starfield.tsx`, `DiaryScene.tsx`, `ProtoChrome.tsx` |
| Universe Home | `mobile/app/prototype/e2/index.tsx` |
| Circle | `mobile/app/prototype/e2/circle.tsx` |
| Friend Diary | `mobile/app/prototype/e2/friend-diary.tsx` |
| My Diary | `mobile/app/prototype/e2/my-diary.tsx` |
| Fonts | Fraunces + Outfit (prototype layout only) |
| HTML mirror | `docs/your-diary/e2-prototype/index.html` |

---

## Screen hierarchy

```text
Universe Home
  dominant: my orb (center)
  secondary: floating circles
  quiet CTA: enter a circle
→ Circle
  dominant: circle atmosphere + friend orbs
  secondary: notice / board objects (do not steal center)
  short path: friend → diary
→ Friend Diary
  dominant: one today-scene (photo · sentence · mood · music)
  secondary: album / letters / days objects
  no tomato, no visitor counts
→ My Diary
  same world language, personal wash
  write via scene tap (not form wall)
  tomato focus as one small object
```

---

## Transition notes (static → later motion)

| From → To | Continuity cue (static) | E4 motion later |
|-----------|-------------------------|-----------------|
| Universe → Circle | shared starfield; wash shifts deep → celadon | orb pulls forward, space folds |
| Circle → Friend | friend orb color echoes diary wash | orb expands into photo plane |
| Friend → Mine | identical scene structure; palette shifts dusk→dawn | crossfade wash only |
| Mine → Universe | return link restores void + brand | reverse fold |

**E2 rule:** if structure feels flat with zero motion, do not “fix” with glow.

---

## Pass criteria (must all be Yes)

| # | Question | Reviewer |
|---|----------|----------|
| 1 | 첫 화면만 보고 일반 SNS가 아니라는 게 느껴지는가 | ☐ |
| 2 | 서클이 채팅방처럼 보이지 않는가 | ☐ |
| 3 | 친구 다이어리에 들어가면 그 사람의 오늘이 먼저 보이는가 | ☐ |
| 4 | 기능 버튼이 작은 카드 여러 개로 쪼개져 있지 않은가 | ☐ |
| 5 | 네 화면이 같은 디자인 언어를 쓰는가 | ☐ |
| 6 | 학교 요소가 앞에 나오지 않고 관계 경계로만 남아 있는가 | ☐ |
| 7 | 사용자가 다음에 어디를 눌러야 할지 바로 아는가 | ☐ |

Against [22](./22-phase-e-space-design.md):

| 22 rule | Met? |
|---------|------|
| One dominant emotional scene per screen | ☐ |
| Circles as orbits / places, not menu cards | ☐ |
| Diary photo+sentence+mood+music as one frame | ☐ |
| Secondary as objects (not equal cards) | ☐ |
| Tomato only on my diary | ☐ |
| No visitor counts / reaction pressure | ☐ |
| No school visual center | ☐ |
| Brand (Your Diary) hero on universe | ☐ |

---

## Accessibility

- Prototype tab rail + screen headers labeled
- Circle/friend orbs have `accessibilityLabel` / HTML `aria-label`
- Diary scene write control is a button
- Min hit targets ~44px on CTAs / exit / tomato
- Light text on dark space (prototype StatusBar light)

---

## How to review

```text
# Browser mirror (fastest)
open docs/your-diary/e2-prototype/index.html
# or
cd docs/your-diary/e2-prototype && python3 -m http.server 8766

# In Expo app
Settings → E2 space prototype (static)
# or navigate to /prototype/e2
```

Walk: Universe → Circle → Friend Diary → My Diary → Universe.  
Approve in this checklist before any Phase E3 production screen rebuild.
