# specs/quint/application/DayAnchor.qnt
- Lines: 130 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; minor PORT
- Covers: Calendar day offsets across local midnight: rows reread by midnight timer/resume, retained forms re-anchored so civil date holds. Duplicates: Calendar Playwright journeys (midnight specs). Callers/importers: `specs/quint/refinement/application/day-anchor.mjs` + `calendar-adapter-fixture.mjs` + `calendar-itf.mjs`, `test/quint-day-anchor.test.mjs` (not in index); 11 symbol pins.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | fixture 32-46 | T10 | Fixture bundles the real calendar adapter with port stubs (import), but injects a probe with `code.replace(declaration, declaration + probe)`. | Export the probed value or observe through ports; drop the replace. | Low. |
| 2 | manifest symbols | T10 | 11 pins across calendar-adapter.ts, calendar-form-draft-adapter.ts, calendar-edit-draft-adapter.ts, reminder-creations.ts, calendar-days.ts; C5 merges the three calendar draft adapters. | Delete pins; update `sources` with the merge. | Pins break on the merge. |
| 3 | model 88-90 | A2/D4 | Form kinds include edit of a "Google event"; the Google edit path is agent-side (`agent-calendar.ts`) after D4; the renderer form still exists. | Keep; re-check after stage A1. | — |

## Proposed end state
Model unchanged; harness drops the probe injection; sources follow the merged draft adapter.
