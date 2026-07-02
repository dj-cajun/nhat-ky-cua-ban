# TRD — 기술 구조 문서

> **프로젝트**: Nhật ký của bạn
> **버전**: 0.1.0-draft

---

## 1. 기술 스택

| 레이어 | 기술 | 선택 이유 |
|--------|------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript | SSR/SSG, 풀스택 통합 |
| Styling | Tailwind CSS | 빠른 UI 개발, 일관된 디자인 |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) | 인증·DB·파일 저장 통합 |
| 배포 | Vercel | Next.js 최적화, CI/CD 간편 |
| 테스트 | Vitest + Playwright | 단위·E2E |
| 린트/포맷 | ESLint + Prettier | 코드 품질 |

---

## 2. 아키텍처 개요

```
┌─────────────┐     HTTPS      ┌──────────────┐
│   Browser   │ ◄────────────► │  Next.js App │
│  (React)    │                │  (Vercel)    │
└─────────────┘                └──────┬───────┘
                                      │
                              Supabase Client SDK
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐     ┌──────────┐     ┌──────────┐
              │   Auth   │     │ Postgres │     │ Storage  │
              └──────────┘     └──────────┘     └──────────┘
```

---

## 3. 디렉터리 구조 (예정)

```
/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 로그인, 회원가입
│   ├── (main)/             # 일기 목록, 작성, 상세
│   └── api/                # Route Handlers (필요 시)
├── components/             # UI 컴포넌트
├── lib/                    # 유틸, Supabase 클라이언트
├── types/                  # TypeScript 타입
├── docs/                   # 기획·설계 문서
└── tests/                  # 테스트
```

---

## 4. 인증 전략

- Supabase Auth (이메일/비밀번호)
- 세션: HTTP-only 쿠키 (Supabase SSR 패턴)
- RLS(Row Level Security): 사용자는 본인 일기만 접근

---

## 5. API 설계 원칙

- Server Components 우선, 클라이언트 상태는 최소화
- 데이터 변경은 Server Actions 또는 Route Handlers
- 에러 응답 형식 통일: `{ error: string, code?: string }`

---

## 6. 환경 변수

| 변수 | 용도 | 노출 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | **Secret** |

---

## 7. 보안 체크리스트

- [ ] RLS 정책 모든 테이블 적용
- [ ] `.env` gitignore 확인
- [ ] CSP 헤더 설정
- [ ] 입력값 sanitization (XSS 방지)

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-07-02 | 0.1.0 | 초안 작성 |
