# test/voice-host-record.test.mjs
- Lines: 265 | Kind: tooling (real `scripts/generate-licenses.ts`, `generate-sbom.ts`, `voice-host.ts`, `android-stage-voice-models.ts` against the committed record and `test/fixtures/voice-host-product.mjs`) | Verdict: MERGE into `test/release/voice-host.test.ts` (with `voice-host-absent-admission.test.mjs` and `android-stage-voice-models.test.mjs`), trimming constant checks
- Covers: the committed voice host record passes its schema; notices and SBOM list every engine library and model; staging copies exactly the recorded bytes, refuses conflicts, links and tampered sources, survives partial and concurrent publication; an unrecorded engine needs the explicit flag and keeps the record unqualified. Duplicates: `android-stage-voice-models.test.mjs` (two staging refusal cases on the same `stageVoiceModels`), `verify-apks.test.mjs:306-350` (APK side of the same record). Callers/importers: `npm test` glob. About 4.4 s.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-38 | T1 | After `voiceHostProblems(committed)==[]`, the test asserts constants of the committed JSON (provider name, ABI list, model path, a NOTICE hash, `qualified:false`, size < 40 MB). Every model update edits the test. | Keep only the schema check (and move it into the build-time `verifyVoiceHost`/licences check if not already there); drop the constant assertions. | Low |
| 2 | 40-48 | B3 | Conditional on whether the record's pin equals the lock: asserts one of two branches. | Keep (it is the real pin gate) but as two fixture cases rather than a branch on the live repo state. | Low |
| 3 | 68-96 | keep | Notices and SBOM generation from the record: release tooling. | Keep; the copyleft/attribution flags are release rules. | — |
| 4 | 141-201 | keep | Monkey-patches `fs.linkSync` to inject publication failures and concurrency. Unusual but it is the only coverage of the atomic-publication path. | Keep. | — |
| 5 | 98-122 | T4 | Absent vs required lane overlaps `voice-host-absent-admission.test.mjs`. | Keep one copy in the merged file. | Low |

## Proposed end state
One `test/release/voice-host.test.ts` holding record schema, notices/SBOM, staging (exact bytes, conflicts, tamper,
partial/concurrent publication, unrecorded engine) and the absent-lane rules, on the shared `voice-host-product.mjs`
fixture. `android-stage-voice-models.test.mjs` folds in. The fixture survives (two importers merge into one).
