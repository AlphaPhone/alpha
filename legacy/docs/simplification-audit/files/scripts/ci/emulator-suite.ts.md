# scripts/ci/emulator-suite.ts
- Lines: 221 | Kind: CI script + library (dispatch-only emulator instrumentation suites: `instrumentation`, `browser-reading`, `fused-speech`) | Verdict: KEEP, small SIMPLIFY
- Covers: on a GitHub-hosted emulator, runs the Android instrumentation runner for the default classes, the browser-reading classes (after installing a pinned WebView) and the on-device speech classes (with networking off), and records a per-step JSON + job summary. It is the only automated runner of the instrumentation classes. Duplicates: `type Adb` also in `scripts/android-instrumentation.ts:85`, `scripts/provision-unit.ts:74`, `scripts/pilot-update.ts:49` (research/scripts.md:343). Callers/importers: `.github/workflows/android-emulator.yml` (dispatch-only); `scripts/ci/speech-candidate.ts:30` (imports `FUSED_SPEECH_CLASSES`, `readInstrumentationEvidence`); `scripts/owner/emulator-campaign-check.ts:103,239` (dynamic import of the plan/summary exports); `scripts/qualify-head.ts:166,191-193` (reads its output files); tests `test/ci-emulator-evidence.test.mjs` (411 lines), `test/owner-emulator-campaign-check.test.mjs`, `test/pilot-units.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-91 | C1 | Nine local types for a 220-line script (`SuiteStep` 3-way union with `never` fields, `StepResult`, `SuiteReport`, `SuiteOptions`, `Adb`, `Execute`, ...). | Import `Adb` from `scripts/lib/toolchain.ts`; flatten `SuiteStep` to `{name, kind, command?, env?, results?, networkOff?}`. | Low. |
| 2 | 141-151 | B1 (specified) | `readInstrumentationEvidence` returns `null` on any error; the caller turns a missing record into a failure (173). Specified behaviour; keep with comment. | none | - |
| 3 | 121 | D8 | `Atomics.wait` on a fresh `SharedArrayBuffer` as a synchronous sleep, injected for tests. | Use `execFileSync('sleep')` or make the function async; the injection exists only for the unit test. | Low. |
| 4 | 162-163 | B5 | `evidenceClass: "E"` and a `notEvidenceFor` list written into every report; read by `qualify-head.ts`/owner campaign check? (they read `passed` and class rows). | Keep only if `qualify-head.ts` reads them; otherwise drop. | Low. |
| 5 | test | T3 / T4 | `test/ci-emulator-evidence.test.mjs` (411 lines) unit-tests plans, network-off retries and summaries with fake `adb`/`execute`, and also asserts workflow text. | Keep one tooling test of `runSuite` (fail-on-missing-record, stop-after-failed-preparation); drop workflow-text assertions (T1). | Low. |

## Proposed end state
Same behaviour, ~150 lines: shared `Adb` type, flat step shape, plain synchronous sleep. Test reduced to the two verdict rules that gate the evidence.
