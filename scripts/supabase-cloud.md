# Supabase 클라우드 배포 (Vercel 프로덕션)

## 1. Supabase 프로젝트 생성

```bash
supabase login
supabase projects create nhat-ky-cua-ban --org-id <YOUR_ORG_ID> --region ap-southeast-1
```

또는 [supabase.com/dashboard](https://supabase.com/dashboard)에서 New Project.

## 2. 마이그레이션 + 시드 적용

```bash
cd "/path/to/nhat-ky-cua-ban"
supabase link --project-ref <PROJECT_REF>
supabase db push
# 시드 (선택): Dashboard SQL Editor에서 supabase/seed.sql 실행
```

## 3. Vercel 환경 변수

Vercel → Project → Settings → Environment Variables:

| 변수 | 값 |
|------|-----|
| `VITE_SUPABASE_ENABLED` | `true` |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Dashboard → API → anon public |
| `VITE_DEMO_MODE` | `false` |
| `VITE_HINT_PEPPER` | `openssl rand -hex 32` 결과 (Production만) |

## 4. Edge Functions (선택)

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
supabase functions deploy zalo-auth provision-profile
```

## 5. 확인

- `curl https://<ref>.supabase.co/rest/v1/schools?select=name&limit=1` + apikey 헤더
- 앱: `https://nhat-ky-cua-ban.vercel.app/?reset=1` → 온보딩 후 profiles 테이블에 row 생성 확인
