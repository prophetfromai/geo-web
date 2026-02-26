# GEO Web

@/Users/qualitydrivensoftwareltd/git/claude.md/CLAUDE.md

## What This Project Is

Web app for running GEO (Generative Engine Optimisation) audits — paste a URL and get an AI search visibility report in the browser.

## Commands

```bash
npm run dev        # build functions + start emulators + Astro dev server
npm run build      # production build (Astro + functions)
npm run deploy     # deploy to Firebase
```

## Monologue

`monologue.md` is this repo's rolling log of ideas, direction, and intent. Scan it at the start of strategic conversations. See `topics/conventions/` in the central repo for the full protocol.

## Project-Specific Rules

- **Engine source:** The GEO audit engine is ported from `/Users/qualitydrivensoftwareltd/git/GEO/src/`. Manual copy for now — keep in sync.
- **No client-side Firestore SDK in Phase 1** — all data access via Cloud Functions (polling pattern).
- **Anonymous-first:** Phase 1 has no auth. Audits expire after 24h.
- **Region:** europe-west2 for all Cloud Functions.
- **Follows vdi_check patterns:** Astro + Tailwind + Firebase, lazy Firebase init, vanilla JS rendering.
