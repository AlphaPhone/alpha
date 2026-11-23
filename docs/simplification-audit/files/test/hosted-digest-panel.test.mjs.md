# test/hosted-digest-panel.test.mjs
- Lines: 36 | Kind: unit (runs four pure helpers of `apps/app/src/runtime/hosted-digests.ts` inside a `node --import=tsx -e` child and parses its JSON) | Verdict: DELETE
- Covers: pause/resume keeps the saved time, zone and source; a selected calendar no longer listed is reported; a result tap before the digest binding exists opens nothing; only a request still in review can be discarded. Duplicates: `test/browser/dev-digest-schedule.spec.ts:49` (paused schedule), `journey-d-digests.spec.ts`, `digest-summary.spec.ts`; `digestToggledSpec` is a one-line spread (delete-candidate B298). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-20 | T9 | Program in a template string run by a child process; a 60 s timeout for four function calls. | Delete. | Low |
| 2 | 21-24 | A7 | Tests `digestToggledSpec`, which delete-candidates B298 inlines. | Delete with the helper. | Low |
| 3 | 32-35 | A1 | "Dispatched and older records stay Retry-only": `{}` (no `phase`) is the older-build record that B297 deletes. | Delete. | Low |
| 4 | 25-31 | — | Missing calendar reported; tap before binding opens nothing. | Carry the missing-calendar notice to `journeys/workflows.spec.ts` (digest whose calendar is removed shows the notice) if no digest spec asserts it. | Low |

## Proposed end state
File deleted; at most one case in `journeys/workflows.spec.ts`.
