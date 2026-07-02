# 넣을 내용 체크리스트

> Zalo 로그인은 **앱 진입 시 이미 완료**된 것으로 처리합니다.  
> 코드에서 수정할 파일: **`src/config/app-content.ts`** (대부분) + **`.env`**

---

## A. 코드에서 바로 수정 (`src/config/app-content.ts`)

| # | 항목 | 변수명 | 설명 |
|---|------|--------|------|
| 1 | 로그인 유저 | `LOGGED_IN_ZALO_USER` | id( Zalo UID ), name( 실명 ), avatar( 사진 URL ) |
| 2 | 학교 목록 | `SCHOOLS` | 온보딩 학교 선택지 |
| 3 | 학급 목록 | `CLASSES` | 온보딩 학급(Lớp) 선택지 |
| 4 | 상태 메시지 | `DEFAULT_STATUS_MESSAGE` | 프로필 기본 한줄 소개 |
| 5 | 시작 도토리 | `DEFAULT_DOTORI_BALANCE` | 신규 유저 초기 🌰 개수 |
| 6 | 투표 문항 | `VOTE_QUESTIONS` | 5시 투표 12문항 (정확히 12개) |
| 7 | 반 친구 시드 | `CLASSMATES_SEED` | 투표 4지선다 실명 후보 (데모용) |
| 8 | 초기 게시글 | `SEED_SCHOOL_POSTS` | 첫 진입 시 학교게시판 데모 글 |
| 9 | 제휴 상품 | `AFFILIATE_ITEMS` | 홈 큐레이션 + 도토리 충전소 링크 |
| 10 | 오퍼월 URL | `OFFERWALL_URLS` | 쇼피·틱톡 미션 딥링크 |
| 11 | 금지어 추가 | `EXTRA_PROFANITY_WORDS` | 비속어 블랙리스트 추가 |
| 12 | 알림 문구 | `REALTIME_MESSAGES` | 실시간 토스트 메시지 |

---

## B. 환경 변수 (`.env`)

| 변수 | 용도 | 필수 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase DB URL | 배포 시 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | 배포 시 |
| `VITE_ZMP_APP_ID` | Zalo Mini App ID | Zalo 배포 시 |

---

## C. Supabase DB (`supabase/`)

| 파일 | 내용 |
|------|------|
| `migrations/001_initial_schema.sql` | 테이블 스키마 |
| `migrations/002_rls_policies.sql` | RLS 정책 |
| `migrations/003_unique_constraints.sql` | 유니크 제약 |
| `seed.sql` | 학교·학급 초기 데이터 |

실제 학교명은 `seed.sql`과 `app-content.ts`의 `SCHOOLS`를 **동일하게** 맞출 것.

---

## D. 나중에 Zalo 로그인 다시 넣을 때

`src/lib/zalo-auth.ts`의 `getLoggedInZaloUser()`를 아래처럼 교체:

```ts
import { getUserInfo } from 'zmp-sdk/apis';

export async function getZaloUser() {
  const { userInfo } = await getUserInfo({ avatarType: 'normal' });
  return { id: userInfo.id, name: userInfo.name, avatar: userInfo.avatar };
}
```

온보딩에서 `getLoggedInZaloUser()` 호출부만 `await getZaloUser()`로 변경.

---

## E. 수익화 연동 (외부 콘솔)

| 서비스 | 넣을 것 |
|--------|---------|
| Zalo Adtima | 광고 단위 ID (`ZMA_Reward`, `ZMA_Fullscreen`) |
| AccessTrade / AdFlex | 오퍼월 미션 URL → `OFFERWALL_URLS` |
| Shopee / Agoda | 어필리에이트 추적 URL → `AFFILIATE_ITEMS` |
| Zalo 개발자 콘솔 | 도메인 화이트리스트, Mini App ID |

---

## F. 데모 URL (개발용)

| URL | 동작 |
|-----|------|
| `/?vote=demo` | 5시 투표 Lock 강제 실행 |
| `/?notify=demo` | 21시 지목 알림 강제 실행 |
