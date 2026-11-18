# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosFixtureRecoveryInstrumentedTest.java
- Lines: 33 | Role: operator tool (not a test) that inventories or deletes trashed `alpha-album-<uuid>.jpg` fixtures stranded by `PhotosTrashInstrumentedTest`, within a one-hour window and a reviewed manifest | Verdict: DELETE (owner confirm)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:336` `NOT_RUN_BY_A_RUNNER.PhotosFixtureRecovery` ("operator tool … never part of a campaign"); reachability test `test/android-instrumentation-runner.test.mjs:186-216` (class and entry must go together). Gate args `alphaPhotoRecovery*`: grep finds no script that passes them.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A7 / T5 / B5 | An @Test class used as a manual cleanup tool for test debris on disposable emulators; no runner, no script, no doc invokes it. Disposable emulators are wiped instead. | Delete the file and its `NOT_RUN_BY_A_RUNNER` entry. If the owner wants the tool, move it to a script (`adb shell content delete …`) outside the test source set. | Low. |
| 2 | 22, 31 | C6 | `Pictures/AlphaPhone-tests/`, `alpha-owned-media-versions` literals. | Gone with #1. | — |
| 3 | 20-31 | D8 | 600+-character lines. | Gone with #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| (none beyond the test method) | — | — | — | — |

## Proposed end state
Deleted (0 lines).

## Verification
`node --test test/android-instrumentation-runner.test.mjs`.
