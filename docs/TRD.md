# TRD — 기술 구조 문서

> **프로젝트**: 너의 다이어리 (Nhật ký của bạn)
> **버전**: 1.0.0

---

## 1. 기술 스택

| 레이어 | 기술 | 선택 이유 |
|--------|------|-----------|
| 플랫폼 | Zalo Mini App | 베트남 Gen Z 타깃, Zalo Ads SDK |
| Frontend | Vite 5 + React 18 + TypeScript | ZMP 공식 템플릿 호환 |
| UI | Tailwind CSS + zmp-ui | G-Pen 톤앤매너, Zalo 네이티브 컴포넌트 |
| 상태 | Jotai | 경량 전역 상태 (뷰 모드, 워프, Lock) |
| SDK | zmp-sdk | Zalo 로그인, 광고, 딥링크 |
| Backend/DB | Supabase (PostgreSQL + Realtime + Storage) | 실시간 동기화, RLS |
| 배포 | zmp-cli deploy | Zalo 미니앱 배포 |
| 테스트 | Vitest | 유틸/validation 단위 테스트 |

---

## 2. 아키텍처 개요

```
┌─────────────────┐     Zalo Sandbox    ┌──────────────────┐
│  Zalo Mini App  │ ◄─────────────────► │  Vite React App  │
│  (zmp-sdk)      │                     │  (100vh UI)      │
└────────┬────────┘                     └────────┬─────────┘
         │                                       │
         │  Ads SDK / Login                      │ Supabase Client
         ▼                                       ▼
┌─────────────────┐                     ┌──────────────────┐
│  Zalo Ads API   │                     │  Supabase        │
│  (Rewarded/     │                     │  Auth·Postgres   │
│   Interstitial) │                     │  Realtime·Storage│
└─────────────────┘                     └──────────────────┘
```

---

## 3. 디렉터리 구조

```
/
├── app-config.json          # ZMP 앱 설정
├── index.html
├── src/
│   ├── app.tsx              # 루트, 라우팅
│   ├── pages/
│   │   ├── onboarding.tsx   # S-01 온보딩
│   │   └── home.tsx         # S-02 100vh 메인
│   ├── components/
│   │   ├── home/            # 1~5층 컴포넌트
│   │   ├── feed/            # 카드 스택, 상세 모달
│   │   ├── vote/            # 5시 투표 Lock
│   │   └── common/          # 모달, 토스트
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── profanity-shield.ts
│   │   └── zalo-ads.ts
│   ├── hooks/
│   ├── stores/              # Jotai atoms
│   └── types/
├── supabase/migrations/
├── docs/
└── tests/
```

---

## 4. 인증 전략

- Zalo Mini App `getUserInfo` → Supabase custom auth 또는 profiles 연동
- 세션: Supabase Auth (Zalo user id 매핑)
- RLS: `class_id` 기반 반 단위 데이터 격리

---

## 5. 실시간 동기화

- Supabase Realtime: `posts`, `class_members` 채널 구독
- `class_id` 필터로 같은 반만 수신
- 이벤트: `new_post`, `member_joined` → 상단 모달

---

## 6. 광고 연동

| 유형 | SDK API | 트리거 |
|------|---------|--------|
| 보상형 | `za.createRewardedVideoAd` | 도토리 충전소 |
| 전면 | `za.createInterstitialAd` | 워프 시 1.5초 |

개발 환경: mock 어댑터로 대체

---

## 7. 환경 변수

| 변수 | 용도 | 노출 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase URL | Public |
| `VITE_SUPABASE_ANON_KEY` | Anon key | Public |
| `VITE_ZMP_APP_ID` | Zalo Mini App ID | Public |

---

## 8. 보안 체크리스트

- [ ] RLS 모든 테이블 적용
- [ ] 힌트 데이터 암호화 (profiles.hint_data)
- [ ] Profanity Shield 서버·클라이언트 이중 검증
- [ ] `.env` gitignore

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-07-02 | 0.1.0 | Next.js 개인 일기 초안 |
| 2026-07-02 | 1.0.0 | Zalo Mini App 스택으로 전환 |
