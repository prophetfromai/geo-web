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

`monologue.md` is this repo's rolling log of what people are thinking, asking about, and working on — captured in very few words. It gives any Claude session a sense of recent context before jumping in.

**Reading:** Scan `monologue.md` at the start of strategic or directional conversations.

**Writing:** When someone raises an idea, changes direction, or expresses intent — append a one-liner to the top of the Log section:
```
- [YYYY-MM-DD] Name: the gist in very few words — theme/feature
```

**Compaction:** The Log holds max ~20 entries. When full, distill the oldest entries into the Themes section (a few words each, merge with existing themes), then remove them from the Log. This keeps the file bounded forever.

Only capture signal: ideas, shifts in direction, decisions. Skip routine implementation chatter.

For the portfolio-level monologue (cross-product ideas and themes), see `/Users/qualitydrivensoftwareltd/git/director/monologue.md`.

## Project-Specific Rules

- **Engine source:** The GEO audit engine is ported from `/Users/qualitydrivensoftwareltd/git/GEO/src/`. Manual copy for now — keep in sync.
- **No client-side Firestore SDK in Phase 1** — all data access via Cloud Functions (polling pattern).
- **Anonymous-first:** Phase 1 has no auth. Audits expire after 24h.
- **Region:** europe-west2 for all Cloud Functions.
- **Follows vdi_check patterns:** Astro + Tailwind + Firebase, lazy Firebase init, vanilla JS rendering.
