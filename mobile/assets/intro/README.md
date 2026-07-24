# Intro video slot

**`universe-birth.mp4`** — vertical 9:16 cinematic birth → gold identity orb.

## Preview the video now (browser)

```bash
cd mobile
npm run preview:intro
```

Open **http://localhost:8765** — autoplays the 9:16 intro (Replay button on page).

## Preview in the app (full intro every cold start)

```bash
cd mobile
npm install --legacy-peer-deps
npm run start:intro
```

Then **Try the demo** → My Universe. Settings → “Replay My Universe intro” also works.

## Regenerate

```bash
cd mobile && npm run render:intro
```

## Spec (matches `INTRO_HANDOFF`)

- 1080×1920 · ~4.0s · 30fps · last 0.5s nearly still
- End: warm gold orb `#F0C36A` · center (50%, ~48%) · diameter ≈ 42% width
- No text / logo / people / UI
