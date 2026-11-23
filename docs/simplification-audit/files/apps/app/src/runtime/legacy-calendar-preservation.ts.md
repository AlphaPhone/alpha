# apps/app/src/runtime/legacy-calendar-preservation.ts
- Lines: 22 | Role: captures, fingerprints and re-validates the old browser calendar document (`browser/calendar-store` `calendarDocument.capture`) so `AgentCalendar` can ask the owner to keep a read-only copy before switching to the agent calendar. | Verdict: DELETE
- Importers: 1 (`prototype/agent-calendar-adapter.ts:15,65`, as the default `CalendarPreservation`). Text/path pins: `specs/quint/application/manifest.json:3274`, `specs/quint/refinement/application/calendar-preservation-confirmation.mjs:11`, `test/calendar-empty-bootstrap-repro.test.mjs:36` (T2: `evaluate(...)` source transplant), `test/fixtures/calendar-mounted-editor.mjs:20`, `test/support/feature-parity.mjs:538`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-22 | A1 | Legacy reader: preserves a browser calendar document from before the agent calendar. The Android package starts with empty private data (README; PRD "No app-data migration"); DECISIONS D1 deletes legacy calendar authority. Runs on every bootstrap (hash + parse of the old document). | Delete the file. In `runtime/agent-calendar.ts` delete `LegacyCalendarCapture` (6), `CalendarPreservation` (7-12), the `'transition-required'|'legacy-recovery'` statuses (13), the `preservation` constructor parameter (53) and `confirmLegacyRetention` (research: 69-71, 105-107, 184-228). In `prototype/agent-calendar-adapter.ts` drop the import (15), the `preservation` parameter (53) and the `retention` block (65+) and any "keep old calendar" UI. In `browser/calendar-store.ts` drop `capture` (21) if unused afterwards. | Medium: owner-visible "transition"/"recovery" copy disappears; the Quint model `calendar-preservation-confirmation` and its manifest entry must be retired in the same change. |
| 2 | 13 | C3 | Inline SHA-256→hex copy. | Gone with the file. | — |
| 3 | 16 | D8 / B3 | 900-character line validating every legacy row field. | Gone with the file. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `LegacyCalendarApproval` | interface | 3-7 | — (no importer outside this file) | delete |
| SHA-256 hex | helper (inline) | 13 | ~28 copies | delete with file |

## Proposed end state
File removed (−22 lines here, roughly −80 more across agent-calendar.ts and agent-calendar-adapter.ts).

## Verification
Retire `specs/quint/refinement/application/calendar-preservation-confirmation.mjs` and its `application/manifest.json` entry; delete `test/calendar-empty-bootstrap-repro.test.mjs` (T2) and the `calendar-mounted-editor.mjs` fixture line; remove `feature-parity.mjs:538`. Re-run Calendar Playwright journeys (agent calendar bootstrap on an empty profile) and `npm run verify`.
