# B.1 Staging Gate — Operator Runbook

실행 전 [`b1-staging-run-freeze.md`](../docs/your-diary/b1-staging-run-freeze.md)에 SHA·checksum을 고정한다.  
결과는 [`21-phase-b1-staging-signoff.md`](../docs/your-diary/21-phase-b1-staging-signoff.md)에만 기입한다.

## 0. Freeze

```bash
git rev-parse HEAD
shasum -a 256 supabase/migrations/019_school_trust_boundary.sql \
  supabase/migrations/020_school_boundary_hardening.sql
date -u +%Y-%m-%dT%H:%M:%SZ
```

값을 `b1-staging-run-freeze.md`에 기록. 이후 이 SHA만 테스트.

## 1. Apply migrations (clean staging)

```bash
supabase link --project-ref <STAGING_REF>
supabase db push   # 001…020 in order
```

Verify:

```sql
-- school_id backfill + NOT NULL
SELECT count(*) AS null_school FROM public.circles WHERE school_id IS NULL;
-- expect 0

SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='circles' AND column_name='school_id';
-- is_nullable = NO

-- helpers exist
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'can_access_circle','can_write_circle','is_app_moderator',
    'ops_scan_mixed_school_circles','circle_writes_frozen'
  );

SELECT to_regclass('public.circle_school_incidents');
SELECT to_regclass('public.app_moderators');
```

## 2. Seed schools + Auth users (service role — server only)

Create Auth users (Dashboard or Admin API), then:

```sql
-- schools (keep beta seed from 019; add Other School)
INSERT INTO public.schools_v2 (id, display_name, slug, status)
VALUES (
  'a0000000-0000-4000-8000-0000000000b2',
  'Other School (staging)',
  'other-school-staging',
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- Map auth.users → app_profiles if needed (project-specific)
-- Then school_memberships for A–E, app_moderators for M only.
```

Personas:

| ID | school | circle X | membership |
|----|--------|----------|------------|
| A | School A | member | verified |
| B | School A | non-member | verified |
| C | School B | none | verified |
| D | School A | member | pending_change |
| E | School A | (was member) | suspended or expired |
| M | n/a | n/a | `app_moderators` only |

Record user ids in sign-off §3.

## 3. JWT matrix

For each persona: sign in → capture access_token → call RPCs with `Authorization: Bearer …`.

Use checklist: `supabase/tests/020_staging_jwt_penetration_checklist.sql`  
Each cell: expected / actual / status code / log evidence.

Paths (all):

```text
circle read/write · diary read/write · notice/poll · alias board
private notes · guestbook · invite preview/join · recommend
presence publish · known UUID · deep link · account switch
refresh · cached photo URL
```

## 4. Attack M

Must succeed: listed ops RPCs only.  
Must fail: arbitrary diary/notes/alias identity, service-role table browse, unsolicited status changes.

## 5. Mixed circle resolve (one real incident)

```text
seed foreign-school member on X
→ ops_scan_mixed_school_circles (as M)
→ confirm can_write_circle(A,X)=false
→ ops UI fields present
→ ops_resolve with note
→ audit event
→ re-check writes for clean members
```

## 6. Decision

- **All PASS** → fill `21-phase-b1-staging-signoff.md` → approve B.1 → Phase C  
- **Any FAIL** → no Phase C; fix on new commit SHA; **re-run full matrix**
