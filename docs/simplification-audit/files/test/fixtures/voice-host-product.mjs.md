# test/fixtures/voice-host-product.mjs
- Lines: 36 | Kind: tooling fixture (builds a scratch product root with a synthetic voice-host record and matching bundle bytes) | Verdict: KEEP
- Covers: gives the voice-host staging tests an internally consistent `qualified-voice-host` record, ASR slot file, upstream `inputs.json`, lock and `app.config.json` in a temp dir, with synthetic pins. Duplicates: none. Callers/importers: `test/voice-host-record.test.mjs` and `test/android-stage-voice-models.test.mjs` (both research KEEP, release-tooling suite).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | C3 | Local `sha` helper. | Import the scripts' shared sha256 helper once it exists (`scripts/lib`). | none |
| 2 | 21, 29 | D8 | One-line `write` closure and two `mkdirSync` on one line. | Format. | none |
| 3 | 16-18 | A8 | Comment refers to "the separate committed-record test above", which is in another file. | Say which test (voice-host-record) or drop. | none |

## Proposed end state
Unchanged behaviour, under the release-tooling tests' fixtures, using the shared sha256 helper.
