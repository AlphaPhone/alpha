# scripts/ci/calendar-bridge.init.gradle
- Lines: 271 | Kind: CI Gradle init script (adds `:app:qualifyCalendarPairedJournalBridge`) | Verdict: SIMPLIFY to ~40 lines (keep the qualification, drop the evidence ceremony); together with `calendar-bridge.py`
- Covers: compiles the real `AlphaCalendarPlugin` (+ `:eliza-calendar`, `:eliza-action-journal`) with the normal release Java toolchain, then runs the upstream JVM driver `vendor/eliza/plugins/plugin-native-calendar/test/native-host/bridge-check.mjs` against those classes (journal `alpha-calendar-creations-v1`, prefix `alphaphone://calendar-creation/`) and requires its single PASS line. This is the only host-side behavioural check of the Android Calendar bridge (kept under DECISIONS D18). Duplicates: none for the behaviour. Callers/importers: `scripts/ci/calendar-bridge.py:232,266` (only launcher) -> `.github/workflows/android.yml:112`; `test/resident-native-ci-admission.test.mjs:113` reads it as text (T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-26, 143-168 | B5 | Hand-written bounded `OutputStream` and a hand-written byte-bounded recursive JSON emitter to write receipts (`taskgraph.json`, `inputs.json`, `result.json`) that only the upload step reads; no consumer parses them. | Delete; let the driver's stdout be the log. | Low. |
| 2 | 39-107, 181-219, 259-265 | B5 | Records and re-hashes every compile input, classpath jar, JDK binary and output class before, after and again after the fixture (1.6 GB hash budget, comment line 40 cites a CI run). Checks "drift" of inputs during one Gradle invocation. | Delete. Gradle's own task inputs + the checkout are the identity. | Low. |
| 3 | 108-134 | B5 / C3 | Re-reads `git rev-parse HEAD/tree/vendor/eliza` three times through a hardened `exec` and compares with the Python-provided config. | Delete. | Low. |
| 4 | 175-180 | B5 | Refuses task graphs containing assemble/install/lint tasks and > 1000 tasks. | Delete; the task depends only on three compile tasks. | Low. |
| 5 | 203-207 | - | Disables up-to-date/caching/incremental on the three compile tasks so they "actually run". The check needs classes, not a fresh compile. | Drop; depend on the compile tasks normally. | Low. |
| 6 | 220-258 | keep | The core: build classpath of `compileStandaloneReleaseJavaWithJavac`, run `node bridge-check.mjs --classes ... --classpath ... --json <org.json jar> --host ai.alphacompute.alphaphone.AlphaCalendarPlugin --journal alpha-calendar-creations-v1 --prefix alphaphone://calendar-creation/`, require the PASS line. | Keep as a small `Exec` task. Better long-term home: a task in `android/app/build.gradle` behind a property, or upstream's own plugin test harness (D14 follow-up). | - |
| 7 | 1-3 | T1 | `test/resident-native-ci-admission.test.mjs:113` reads this file's text. | Delete that assertion with the T1 cleanup. | Low. |

## Proposed end state
A ~40-line init script (or a property-gated task in `android/app/build.gradle`) registering `qualifyCalendarBridge`: `dependsOn` the three compile tasks, `Exec` the upstream driver with the release classpath and JSON jar, assert one PASS line. Launched directly from `android.yml` with `timeout-minutes`, no Python supervisor (see `calendar-bridge.py.md`).
