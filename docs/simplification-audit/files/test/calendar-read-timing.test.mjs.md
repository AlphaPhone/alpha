# test/calendar-read-timing.test.mjs
- Lines: 33 | Kind: unit + integration of upstream code (`.eliza/client-features/packages/app/src/runtime/managed-google-agent/calendar-read-timing.ts` and the upstream managed Google host via `test/support/managed-google-agent.mjs`); self re-exec under tsx | Verdict: DELETE (upstream); list as upstream test follow-up
- Covers: opt-in Calendar read timing (`ALPHA_CALENDAR_READ_TIMING=1`) logs only route bucket/status/duration, never tokens, ids or bodies, and does not change results or call counts. Duplicates: none in Alpha; no upstream test found (`grep createCalendarReadTiming vendor/eliza` finds no test file). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | T5 / P5 | Module under test is generated from `vendor/eliza` (`.eliza/client-features`); Alpha does not own it. | Delete here; add the privacy cases upstream (D14 follow-up). | Medium: coverage lost until upstream adds it |
| 2 | 4 | T9 | Self re-exec `spawnSync(process.execPath,['--conditions=eliza-source','--import','tsx',…])`. | Gone. | - |
| 3 | 6-7 | - | Same support module imported twice. | Gone. | - |
| 4 | 12, 31 | - | Privacy assertion (marker never in logs) is the valuable property. | Carry upstream. | - |

## Proposed end state
Deleted from Alpha. Upstream follow-up: `calendar-read-timing.test.ts` in the shared package with the "no request
contents in rows" and "disabled timing returns the exact transport" cases. `test/support/managed-google-agent.mjs`
keeps its other importers (`native-google-agent-host*.test.mjs`, `managed-google-*` tests).
