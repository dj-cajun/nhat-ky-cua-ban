# 10.5 — 레거시 정리

> **상태**: ✅ 완료 (2026-07-24)  
> **원칙**: “안 보인다”가 아니라 **빌드·테스트·제품 흐름에서 미참조**일 때만 삭제.  
> 마이그레이션 `007~018` 무수정 · Edge Function·보안 테스트 유지.

---

## 삭제

| 범주 | 내용 |
|------|------|
| 문서 | Zalo/학급 PRD·TRD·flows 등 (이후 **저장소에서 완전 삭제**) |
| 웹 레거시 | 학교/Zalo 페이지·컴포넌트·lib·fixture·vi i18n |
| 테스트 | class-founding / dotori / vote / zalo profile 등 낡은 unit |
| asset | `public/photo-album-default.svg` (시드 전용) |
| 패키지 | `zmp-sdk` · `zmp-ui` · `zmp-vite-plugin` · root `@supabase/supabase-js` · mobile `react-hook-form` / `@hookform/resolvers` |
| Edge | `zalo-auth` 함수 삭제 |
| 빌드 잔재 | `www/` (Zalo 미니앱 산출물, gitignore) |

## 유지

- Vite **v1 서클 데모** (`src/pages/v1`, `v1-store`)
- Expo **mobile** 제품 경로
- `docs/your-diary/` 현행 지침
- `tests/security/*` · `v1-store` · Playwright e2e
- Supabase migrations `007~018` · 제품 Edge Functions (`zalo-auth` 제외·삭제)

## 통합/정리

- Vite 진입을 서클 제품만 남김 (Zalo plugin 제거)
- `index.html` / `.env.example` US·English 기준
- `knip.config.ts` 추가

## 검증

- `typecheck` · `build` · `test` · `test:security` · `mobile:test` · `mobile:typecheck` PASS
- knip: Expo Router / Edge / tooling 예외는 config에 명시
- depcheck: Tailwind·PostCSS·vercel 등은 config/CI 사용으로 유지

## 다음

**11단계 통합 안정화·베타 준비**
