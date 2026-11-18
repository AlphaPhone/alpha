# apps/app/src/runtime/maps-event-return.ts
- Lines: 40 | Role: the in-memory "Back to event" origin carried from a Calendar event to Maps: validator, builders for device-calendar (v1) and agent-calendar (v2) events, offer rule and the "event still there" check. | Verdict: SIMPLIFY
- Importers: 3 (`prototype/agent-calendar-adapter.ts:259` v2 builder, `prototype/calendar-adapter.ts:353` v1 builder, `prototype/maps-adapter.ts:119,137,156,347`). Text/path pins: `scripts/test-calendar-crud-review.ts:7`, `specs/quint/application/manifest.json:2748,2878`, refinement `agent-calendar-event-return.mjs:8`, `map-plane-ownership.mjs:25`, `maps-event-return.mjs:10`, `test/canonical-maps-return.test.mjs:5`, `test/note-origin.test.mjs:9`, `test/quint-maps-event-return.test.mjs`, `test/support/feature-parity.mjs:554`; one Java mention in `android/app`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 21, 26, 39 | C1 | `type Bag = Record<string, any>` (one of 60) for calendar rows and events. | Use the calendar row/event types from the calendar adapters (or the shared shell row type) — at minimum `{alphaCalendarId?;nativeEvent?;id;off;title;canonicalEvent?;canonicalEventKey?}`. | Low. |
| 2 | 8 | A7 | `mapsEventOriginOf` exported; no importer outside this file in src (grep: 1 file); tests/specs use it 3×. | Keep exported: the Quint harness `specs/quint/refinement/application/agent-calendar-event-return.mjs:50,223` imports it by name (DECISIONS D11). Only `test/canonical-maps-return.test.mjs` otherwise. | — |
| 3 | 10-11, 14 | B3 | Re-validates an origin object that `mapsEventOriginFor`/`canonicalMapsEventOriginFor` in this same file built and the Maps view state holds in memory (not persisted, per comment 1-2). | Keep a single construction-time validation in the builders; `mapsEventReturnOffered`/`mapsEventStillThere` accept `MapsEventOrigin` typed values. Reduces the validator to the builders. | Medium: Quint `maps-event-return` harness exercises the validator with hostile values; update or keep the validator if the harness requires it (DECISIONS D11). |
| 4 | 13-17 | D8 | 330-char condition line for v2. | Split into named checks. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `EventOrigin`, `CanonicalMapsEventOrigin`, `MapsEventOrigin` | type | 3-5 | — | stays |
| `Bag` | type | 6 | 60 declarations app-wide | shared row type / delete |

## Proposed end state
~32 lines: typed row inputs instead of `Bag`, builders validate once, offer/still-there helpers typed. Both v1 (device calendar) and v2 (agent calendar) stay — both have live callers.

## Verification
Quint `maps-event-return`, `map-plane-ownership`, `agent-calendar-event-return` refinements; `test/quint-maps-event-return.test.mjs`; Calendar→Maps→Back Playwright journey.
