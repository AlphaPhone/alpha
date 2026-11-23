# test/native-live-start-cancellation.test.mjs
- Lines: 24 | Kind: unit of upstream `.eliza/client-features/packages/voice/src/native-live-voice.ts` (`createNativeLiveVoice`) with a stub plugin | Verdict: DELETE
- Covers: aborting while native live-capture start is pending sends Stop at once (discarding on the native route) and rejects with AbortError. Duplicates: `native-resident-capture.test.mjs` test 3 (abort during delayed startup, same module); `test/live-voice.test.mjs`; `test/browser/live-voice.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T5 | Tests code generated from `vendor/eliza`; Alpha only binds it. | Delete; list as upstream test follow-up. | Low |
| 2 | 18 | T8 | Busy-waits 20 microtasks for `starting`. | Gone with the file. | None |

## Proposed end state
File deleted. Alpha's binding of the shared live transport is exercised by `journeys/voice.spec.ts` (cancel while
starting) on the native-fake harness.
