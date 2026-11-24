# test/voice-timing.test.mjs
- Lines: 90 | Kind: unit (imports real `runtime/voice-timing.ts` with a fake `localStorage` and injected clock) + tooling (imports and spawns `scripts/aggregate-voice-latency.ts`, checks exit codes) | Verdict: MERGE tests 3 (CLI part) into `test/tooling/voice-latency.test.mjs`; delete tests 1-2
- Covers: timing records hold ordered offsets only, no text/identifiers; marks cannot shorten a phase; the latency aggregator dedupes exports, splits warm/cold cohorts, never lowers the 20/5 sample floor and exits 2 when insufficient. Duplicates: `test/browser/voice-timing.spec.ts` (records from the rendered conversation), `test/voice-turn-routes.test.mjs:210-231`, `test/voice-entry-timing.test.mjs`, `test/diagnostics-export.test.mjs`, `test/native-voice-latency.test.mjs` (also imports the aggregator). Callers/importers: `npm test` glob. `aggregate-voice-latency.ts` has no package.json script; callers are these tests and `scripts/native-voice-latency-emulator.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-53 | T3/T4 | Recorder unit cases; the browser spec of the same name exercises the recorder end to end. Move the "export holds no text/session/credential" assertion there if missing. | Delete. | Low |
| 2 | 55-90 | T9 | Spawns the aggregator four times with `execFileSync`: this is the real tool test. | Merge with `native-voice-latency.test.mjs` into one tooling file. | Low |
| 3 | 73 | A8 | `assert.match(summary.targetSignOff, /Issue #395/)` pins an issue number in output text. | Drop the assertion. | None |
| 4 | 9 | B2 | Installs a global `localStorage` so a renderer module imports in Node. | Goes with the unit cases. | None |

## Proposed end state
File deleted. `test/tooling/voice-latency.test.mjs` (with `native-voice-latency.test.mjs`) builds one export from the real recorder, runs `aggregate-voice-latency.ts` and asserts: duplicates counted once, insufficient samples exit 2, `--warm 1` rejected (exit 1), unknown format exit 1. `journeys/voice.spec.ts` (from `voice-timing.spec.ts`) keeps the privacy assertion on the exported JSON.
