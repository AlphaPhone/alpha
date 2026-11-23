# test/browser/mock-readiness.spec.ts
- Lines: 23 | Kind: cross-check that regex-extracts the `evaluateJavascript("…")` string from `android/app/src/androidTest/.../StartupDocumentProbe.java` and runs it in the page (source-text slicing, T1/T2); project `chromium`, 1 test | Verdict: **REWRITE** (shared probe asset) into `journeys/startup-permissions.spec.ts`
- Covers: the Android startup readiness probe reports `mock` for rendered mock mode, `live` after exit, and nothing when the `data-active-view` marker is missing. It is the renderer half of `StartupReadinessInstrumentedTest` (emulator only). Duplicates: the instrumentation test (emulator lane). Callers/importers: none. `StartupDocumentProbe` is used by `WebViewTestDriver`, `AppNavigation`, `ActionJournalInstrumentedTest`, `StartupReadinessInstrumentedTest`; `scripts/ci/affected.ts` mentions this spec.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-7 | T1 / T10 | Reads a Java file and regex-cuts a JSON string literal; any reformatting of the Java breaks it. | Move the probe expression into one asset (e.g. `android/app/src/androidTest/assets/startup-readiness-probe.js`, like the existing `video-account-fixture.js`); Java loads it, the spec imports the file as text. | Low |
| 2 | 17-21 | — | Deletes the marker inside one `evaluate` to show the probe fails closed. | Keep. | none |
| 3 | – | P1 | `scripts/ci/affected.ts` maps Java changes to this spec. | Update the mapping to the asset path. | none |

## Proposed end state
One test in `journeys/startup-permissions.spec.ts` that loads the shared probe asset and checks mock, live and missing-marker results.
It does not read Java source. The Java probe reads the same asset, so the renderer contract and the emulator probe cannot drift.
