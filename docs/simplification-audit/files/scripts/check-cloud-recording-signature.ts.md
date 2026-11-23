# scripts/check-cloud-recording-signature.ts
- Lines: 31 | Kind: integration check run as a CI step (Alpha's Android recording header and PCM WAV are classified correctly by the prepared SDK's Cloud API `file-type` dependency) | Verdict: MOVE to `test/` (merge into the existing test that already runs it)
- Covers: Cloud transcription will accept the mp4 (`mp42`) header Android records and the mono 16 kHz WAV Alpha uploads, as classified by the exact `file-type` version the pinned Cloud API resolves. Duplicates: **runs twice** - as a CI step in `.github/workflows/resident-prepare.yml:34` and as `test/cloud-voice-profile.test.mjs:67-71` (same function, skipped when the prepared SDK is absent). Callers/importers: those two only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9, T4 | A test living in `scripts/` plus a CI step and a test-file call of the same function. | Move the two functions into `test/cloud-recording-signature.test.mjs` (out of `cloud-voice-profile.test.mjs`, whose other cases are T2 transplants). Replace the `resident-prepare.yml` step with `node --test test/cloud-recording-signature.test.mjs` after prepare, and make the test fail (not skip) when `ALPHA_REQUIRE_PREPARED_SDK=1` so the CI lane cannot pass silently. | Low. |
| 2 | 22 | D8 | WAV header built by 12 chained writes on one line. | Named helper `pcmWavHeader({rate, bits, channels})`. | None. |
| 3 | whole | T5 (partial) | It checks an upstream dependency's behaviour, but against Alpha's own wire formats: a real cross-boundary contract, so it is worth keeping (unlike pure upstream re-tests). | Keep the contract. | - |

## Proposed end state
Script deleted; one integration test file (~30 lines) run once in the resident prepare lane and skipped in plain
`npm test` without a prepared SDK.
