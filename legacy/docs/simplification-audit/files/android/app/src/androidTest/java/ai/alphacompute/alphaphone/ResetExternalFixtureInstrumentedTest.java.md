# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResetExternalFixtureInstrumentedTest.java
- Lines: 154 | Role: phased (prepare / verify-preserved / verify / record-before-dispatch) fixture for "Reset Alpha data": seeds files, prefs, Notes slots, Keystore key, WorkManager job, alarm, notification, Calendar event and a Download, then checks what reset erased. | Verdict: DELETE (owner decision; reset is unfinished, #409)
- Importers: none (its nested `ResetSentinelWorker` is only enqueued here). Text/path pins: `scripts/android-instrumentation.ts:327` `NOT_RUN_BY_A_RUNNER.ResetExternalFixture` ("requires an external host controller ... phases cannot run as a single generic campaign"); runner reachability test.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-154 | A7 / T9 | No runner: `resetFixturePhase`, `resetFixtureRun`, `resetFixtureDisposableUser`, `resetFixtureAcknowledgement` (grep in scripts/test/.github: 0 hits). `AndroidManifest.xml:130` comments the reset activity as "Unfinished Reset Alpha data (#409)". | Delete now and write a runner-backed test when #409 is finished; or keep only if an owner commits to a runner. Remove the `NOT_RUN_BY_A_RUNNER` entry with it. | medium (only reset-erasure test design) |
| 2 | 31-32 | A1 | Notes envelope fixture carries an `archive` with `v1`/`v2`/`daily` legacy slots. | Goes with deletion; flag for the Notes legacy-archive review. | none |
| 3 | 26, 30, 47 | C3 | `sha` (SHA-256 hex) and the 32-hex -> UUID formatter written twice (`notes` :30 and `workId` :47). | Goes with deletion. | none |
| 4 | 55-62 | B5 | Parses `dumpsys alarm` text with section-marker assertions. | Goes with deletion. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `sha` | helper | 26 | 10+ SHA copies | deleted |
| `ResetSentinelWorker` | class | 43-46 | none | deleted |
| `calendarEvents` / `alphaCalendars` | helper | 69-78 | `CalendarFlow`/`CalendarDeletionReview` provider queries | deleted |

## Proposed end state
File removed with its registry exclusion entry. 0 lines. `ResetPolicyInstrumentedTest` keeps the non-destructive reset checks.

## Verification
`node --test test/android-instrumentation-runner.test.mjs`; `--classes ResetPolicy`.
