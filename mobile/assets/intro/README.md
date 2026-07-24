# Intro video slot

**`universe-birth.mp4`** — vertical 9:16 cinematic birth → gold identity orb.

## Full app path (intro → universe → circle / diary)

```bash
cd mobile
npm install --legacy-peer-deps
npm run start:intro          # iOS/Android simulator
# or: npm run web:intro      # browser (universe uses 2D glow fallback)
```

1. Tap **Try the demo** (seeds Brooklyn Friends + forces full intro)
2. My Universe plays `universe-birth.mp4` → crossfade into sphere/planets
3. Tap center sphere → diary · tap planet → circle (2D from there)

Settings → **Replay My Universe intro** also works.

## Video-only browser check

```bash
npm run preview:intro
```

Open **http://localhost:8765**.

## Regenerate

```bash
cd mobile && npm run render:intro
```

## Spec (matches `INTRO_HANDOFF`)

- 1080×1920 · ~4.0s · 30fps · last 0.5s nearly still
- End: warm gold orb `#F0C36A` · center (50%, ~48%) · diameter ≈ 42% width
- No text / logo / people / UI
