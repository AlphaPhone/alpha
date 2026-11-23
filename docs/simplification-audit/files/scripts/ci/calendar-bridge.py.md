# scripts/ci/calendar-bridge.py
- Lines: 471 | Kind: CI script (process supervisor around one Gradle invocation) | Verdict: DELETE, replaced by a plain workflow step running the simplified Gradle task (see `calendar-bridge.init.gradle.md`)
- Covers: in `android.yml` records a "source frame" before the normal build (`--source-frame`), then after it verifies HEAD/tree/SDK gitlink, a SHA-256 pin of `AlphaCalendarPlugin.java`, the org.json jar hash and 17 vendored upstream fixture files, launches `./gradlew --init-script calendar-bridge.init.gradle :app:qualifyCalendarPairedJournalBridge` in its own session, polls `ps`/`/proc` for birth-tick-anchored process-group members, RSS, disk and output size every second, enforces 20/150/170/180 s deadlines, signals the group, and writes bounded receipts. Duplicates: GitHub step `timeout-minutes`, the git checkout and the submodule gitlink already provide timeouts and source identity. Callers/importers: `.github/workflows/android.yml:98,112,147-152` (required Android check); `test/ci-pin-bound-scripts.test.mjs:12-22` (imports `SDK`, `HOST` and pins HOST to the current hash of `AlphaCalendarPlugin.java`); `test/resident-native-ci-admission.test.mjs:100` (`runpy`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19, 219, 300 | T10 / B5 | `HOST` is the SHA-256 of `android/.../AlphaCalendarPlugin.java`; any edit to the plugin (formatter, stage C cleanup) fails the required Android check until this constant is updated, enforced by `test/ci-pin-bound-scripts.test.mjs`. It pins text, not behaviour; the bridge driver tests the behaviour. | Delete the pin and the test case. | Low. |
| 2 | 28, 237-253 | B3 / B5 | `OWNING_SHA256` pins 17 files inside `vendor/eliza` and refuses extra Java files in the fixture directory. The submodule gitlink (checked at 216-217 and by `upstream.lock.json`) already fixes those bytes. | Delete. | Low. |
| 3 | 117-153, 279-312, 314-395 | B5 | ~200 lines of birth-anchored process-group observation, RSS/disk/output bounds and staged SIGTERM/SIGKILL around a single `gradlew` call on a disposable hosted runner. | Delete; use `timeout-minutes` on the step. | Low. |
| 4 | 3-5, 21-24, 36-42 | B5 | Absolute deadline machinery checked inside every hash block and git call. | Delete. | Low. |
| 5 | 156-197, 209-215, 398-400 | B5 | "Source frame": records the tracked diff before and after the normal build and allows only the two generated notice files to change. Not a property of the Calendar bridge. | Delete (if wanted, a single `git diff --exit-code` step in the workflow). | Low. |
| 6 | 273, 338, 426 | B5 / C6 | Requires 24.27 GB free disk (24 GB floor) before an offline compile; arbitrary magic numbers. | Delete. | Low. |
| 7 | 67-78, 401-452, 463-471 | B5 | Bounded JSON receipts and failure receipts uploaded by `android.yml:147-152`; nothing reads them. | Delete; upload only the Gradle log on failure. | Low. |
| 8 | 89-98 | C3 | Another hardened `git()` wrapper (17 in scripts). | Gone with the file. | - |
| 9 | 17 | C3 | One of ~30 upstream-lock readers. | Gone with the file. | - |

## Proposed end state
Delete the file. `android.yml` runs after its normal build:
`./gradlew --offline --init-script scripts/ci/calendar-bridge.init.gradle -PcalendarBridgeJson=$ALPHA_JSON_JAR :app:qualifyCalendarBridge` with `timeout-minutes: 5`. Remove the `--source-frame` step, the receipt upload list, the HOST case in `test/ci-pin-bound-scripts.test.mjs` and the `runpy` load in `test/resident-native-ci-admission.test.mjs`. Behaviour coverage (the upstream driver against the real compiled plugin) is unchanged.
