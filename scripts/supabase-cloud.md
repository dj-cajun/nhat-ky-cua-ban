# Supabase cloud deploy notes (Your Diary)

## 1. Create / link project

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Apply migrations `007+` (circle product). Do not treat early school tables as product source of truth.

## 2. Environment

| Variable | Notes |
|----------|--------|
| `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key only |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Edge Function secrets only |

Never put service role / Spotify secret / APNs keys in the mobile or Vite client bundle.

## 3. Edge Functions

```bash
supabase secrets set SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=...
supabase functions deploy search-spotify-tracks resolve-spotify-track set-diary-spotify-track
supabase functions deploy provision-profile publish-circle-response-event send-notification moderation-admin
```

Do not deploy legacy `zalo-auth` — it was removed from this repository.
