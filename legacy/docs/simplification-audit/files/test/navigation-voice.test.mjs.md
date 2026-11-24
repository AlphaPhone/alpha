# test/navigation-voice.test.mjs
- Lines: 38 | Kind: transplant (esbuild-strips upstream `navigation-voice.ts` and `apps/app/src/maps/navigation-voice.ts`, evaluated with `new Function` and injected ports) | Verdict: DELETE
- Covers: the Maps speech adapter aborts owned guidance on pause without counting a failure, and refuses (with a message, no network fallback) when on-device playback is not ready. Duplicates: `test/navigation-voice-pause.test.mjs` tests "stopping navigation drops the owed step" and "speech unavailable turns guidance off"; `test/browser/native-speech.production.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | T2 | Import-stripped text of two files. | Delete. | Low |
| 2 | 12-38 | T4 | Strict subset of navigation-voice-pause. | Covered by its journey rewrite. | None |

## Proposed end state
File deleted.
