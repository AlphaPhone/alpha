# android/app/src/androidTest/java/ai/alphacompute/alphaphone/StartupDocumentProbe.java
- Lines: 68 | Role: bounded (20 s) startup readiness wait for the Capacitor WebView: listens for page start/load, polls a harmless JS query (live: `dataset.activeView`; mock: banner + screen) on the main looper with an epoch fence against stale replies. | Verdict: SIMPLIFY (keep as the one readiness primitive)
- Importers: 4 — `WebViewTestDriver:61`, `AppNavigation:13`, `ActionJournalInstrumentedTest:28`, `StartupReadinessInstrumentedTest:15`; uses `ReadinessEpoch` (18 lines, only user). Text/path pins: **`test/browser/mock-readiness.spec.ts:4-7` reads this file and extracts the `evaluateJavascript("…",value` literal with a regex and runs it in Chromium (T1/T2)**; `scripts/ci/affected.ts:13` lists the path in `browserReadAndroid` (kept complete by `test/ci-affected.test.mjs`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 49 | T2 / T10 | The readiness query is a Java string that a Playwright spec regex-extracts (`/evaluateJavascript\(("(?:[^"\\]|\\.)*"),value/`) — any reformatting of line 49 breaks the browser lane. | Move the query to an androidTest asset (`assets/startup-readiness.js`) read here, and have `mock-readiness.spec.ts` read the asset file (pin a file, not text). Update `scripts/ci/affected.ts:13` to the asset path. | Low; coordinated 3-file change. |
| 2 | 49, 51 | D5 | Mock-mode readiness branch (`m==='mock'&&…'.mock-mode-banner button'`) exists only for test-mocks builds; `requireLive` already forces live on product builds (line 36). | Keep (test-mocks harness is retained); note in DECISIONS that the mock branch goes with mock mode. | — |
| 3 | 16 | C4 | `ReadinessEpoch` (separate 18-line file) is a staleness fence used only here. | Inline `ReadinessEpoch` as a private nested class (or keep if the owner wants it host-testable — it is not referenced by any host test: grep 0 hits outside these two files). | None. |
| 4 | 42-57 | D9 | Anonymous self-reposting `Runnable` with `waitId` + epoch + `closed` checks. | Acceptable; name the predicate `stale(thisWait)`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ReadinessEpoch` (separate file) | class | 16 (use) | none | nested here |
| readiness JS query | const | 49 | `test/browser/mock-readiness.spec.ts` (extracted copy) | androidTest asset shared by both |

## Proposed end state
~60 lines with the query loaded from an asset and `ReadinessEpoch` nested; `ReadinessEpoch.java` deleted (−18).

## Verification
Every instrumentation class that launches MainActivity (via `WebViewTestDriver`/`AppNavigation`); `npx playwright test test/browser/mock-readiness.spec.ts`;
`node --test test/ci-affected.test.mjs`.
