# 넣을 내용 체크리스트

> **지역 프리셋 교체**: `src/config/app-content.ts` 의 import 한 줄만 변경  
> `import * as preset from './presets/hochiminh';`

---

## A. 호치민 프리셋 (`src/config/presets/hochiminh.ts`)

현재 **호치민 8개 고등학교 + 12명 반친구 + 게시글 9개** 가 채워져 있습니다.

| # | 항목 | 변수 |
|---|------|------|
| 1 | 로그인 유저 | `LOGGED_IN_ZALO_USER` |
| 2 | 학교 8개 | `SCHOOLS` (THPT Marie Curie 등) |
| 3 | 학급 8개 | `CLASSES` |
| 4 | 기본 학교·학급 | `REGION.defaultSchool` / `defaultClass` |
| 5 | 반 친구 12명 | `CLASSMATES_SEED` |
| 6 | 초기 게시글 | `SEED_SCHOOL_POSTS` 등 |
| 7 | 제휴 상품 | `AFFILIATE_ITEMS` |
| 8 | 금지어 | `EXTRA_PROFANITY_WORDS` |

---

## B. 환경 변수 (`.env`)

| 변수 | 현재 값 | 설명 |
|------|---------|------|
| `VITE_DEMO_MODE` | `true` | 온보딩 생략, Marie Curie 11A 자동 시작 |
| `VITE_SUPABASE_URL` | (비움) | Supabase 연결 시 입력 |
| `VITE_SUPABASE_ANON_KEY` | (비움) | Supabase 연결 시 입력 |
| `VITE_ZMP_APP_ID` | (비움) | Zalo 배포 시 입력 |

---

## C. 지역 교체 방법

1. `src/config/presets/hanoi.ts` 새로 작성 (hochiminh.ts 복사 후 수정)
2. `src/config/app-content.ts` → `import * as preset from './presets/hanoi'`
3. `supabase/seed.sql` 학교 데이터 동기화

---

## D. 데모 URL

| URL | 동작 |
|-----|------|
| `/` | 데모 모드 시 바로 Marie Curie 11A 홈 |
| `/?vote=demo` | 5시 투표 Lock |
| `/?notify=demo` | 21시 지목 알림 |
| `/?founding=demo` | 3인 개척단 데모 (학급 잠금 → Zalo 링크 → 퀴즈) |
| `/?founding=join&token=...` | 개척단 초대 링크 (Zalo 단톡 공유용) |
