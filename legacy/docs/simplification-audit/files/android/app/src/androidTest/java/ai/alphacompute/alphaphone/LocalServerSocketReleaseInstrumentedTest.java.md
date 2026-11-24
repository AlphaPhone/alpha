# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LocalServerSocketReleaseInstrumentedTest.java
- Lines: 29 | Role: platform probe that `LocalServerSocket.close()` alone leaves `accept()` blocked and `Os.shutdown` frees the address. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:326` (`NOT_RUN_BY_A_RUNNER.LocalServerSocketRelease`: "platform probe for an upstream resident defect ... measures Android, not Alpha, and is run by hand").

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-28 | T5/T9 | Tests Android framework behaviour, not Alpha code; no runner executes it. | Delete the class and its `NOT_RUN_BY_A_RUNNER` entry. If the upstream resident defect needs the probe, it belongs upstream next to the resident server. | Low |
| 2 | 24 | T8 | `Thread.sleep(200)` fixed sleep. | Gone. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `accepting`, `rebinds` | helper | 15-21 | none | delete |

## Proposed end state
File deleted (0 lines).

## Verification
`node --test test/android-instrumentation-runner.test.mjs`; androidTest compile.
