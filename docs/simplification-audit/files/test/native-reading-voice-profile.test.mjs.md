# test/native-reading-voice-profile.test.mjs
- Lines: 29 | Kind: transplant (strips imports/exports/types of `apps/app/src/runtime/native-reading-voice.ts` and evals it in `vm`) plus a source-text `doesNotMatch` | Verdict: DELETE
- Covers: page reading always goes through the resident binding on this phone (never Cloud), and without a binding nothing is offered. Duplicates: `test/browser-reading-capability.test.mjs`, `test/browser/reading-review.spec.ts` (`synthesizeLocalBrowserReading`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7, 16 | T2 | Import stripping and `vm` eval with 12 injected globals. | Delete. | Low |
| 2 | 24 | T1 | Asserts identifiers are absent from the source. | Delete. | None |
| 3 | 12 | A5 | Injects `createPairedVoice` (hosted/paired voice, D5). | Note for the product cleanup. | None |

## Proposed end state
File deleted; covered by `journeys/browser.spec.ts` (reading review) which already drives the resident reading path.
