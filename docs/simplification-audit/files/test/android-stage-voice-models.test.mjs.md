# test/android-stage-voice-models.test.mjs
- Lines: 49 | Kind: tooling (real fs, imports `scripts/android-stage-voice-models.ts`) | Verdict: MERGE into `test/tooling/android-build-inputs.test.ts`
- Covers: the voice-output stager publishes only the selected ABI's recorded engine libraries byte-exact, is idempotent, and refuses changed outputs or a conflicting hand-copied library before writing anything. Duplicates: none (Quint has no model of the stager). Callers/importers: `npm test` glob; imports `test/fixtures/voice-host-product.mjs` (also imported by `test/voice-host-record.test.mjs` and others, so the fixture survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11 | C3 | Local `sha` SHA-256 helper; same helper in ~40 test files. | Import the shared test helper (`test/fixtures/hash.mjs` or `scripts/lib` hash) when merging. | none |
| 2 | 16-49 | - | Real behaviour of a release-input tool that `resident-android.yml:238` and `android-build-preflight.ts` call; both cases are worth keeping. | Move both tests unchanged into the tooling family file. | none |

## Proposed end state
Both test cases live in `test/tooling/android-build-inputs.test.ts` next to the other build-input staging tests
(build preflight, runtime profile, gzip assets, embedding host staging), using a shared hash helper. No behaviour lost.
