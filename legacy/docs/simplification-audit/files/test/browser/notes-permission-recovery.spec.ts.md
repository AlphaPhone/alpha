# test/browser/notes-permission-recovery.spec.ts
- Lines: 29 | Kind: Playwright spec, chromium, 1 test; canonical Notes UI, denied microphone via `navigator.permissions.query` and `getUserMedia` overrides | Verdict: MERGE into `journeys/notes.spec.ts` (or `journeys/startup-permissions.spec.ts` if that owns the Access panel)
- Covers: with the microphone blocked, Record voice note opens the shared Access panel at the Microphone step, retry stays explicit (Check), granting enables Record without a second automatic request. Duplicates: `browser-speech.spec.ts` "microphone denial keeps the recorder open…" (different surface: recorder line vs Access panel). Callers/importers: none; imports `helpers/canonical-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-11 | C5 | Permission and getUserMedia stand-ins written inline; similar blocks in camera and voice specs. | Use a shared `permissions` fixture option (`microphone: 'denied' | 'granted'`, request counter). | None |
| 2 | 18 | ok | Screenshot to output path for review. | Keep or drop; not an assertion. | None |
| 3 | 19, 28 | ok | Request counter is the browser boundary. | Keep. | None |

## Proposed end state
One step "blocked microphone" in `journeys/notes.spec.ts` on the shared permissions fixture, about 15 lines.
