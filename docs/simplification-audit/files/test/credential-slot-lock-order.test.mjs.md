# test/credential-slot-lock-order.test.mjs
- Lines: 97 | Kind: host-JVM transplant: slices `withCredentialSlotMutation`, `requireLockOrder`, `credentialLifecycleLock` from `AlphaLocalAgentPlugin.java`, the non-critical branch of `AlphaCredentialStore.java` between `  if(!"cloud:production".equals(name)` and `  return AlphaLocalAgentPlugin.mutateCredentials(`, regex-extracts the Gmail lock expression from `GmailBackground.java`, and compiles them into a harness with a fake `JsonCredentialSlots` | Verdict: REWRITE as Gradle JVM test (merge with the other two credential tests)
- Covers: non-critical slot commits take lifecycle lock before vault lock, check owner and CAS under both, keep namespace, and never deadlock against the Gmail background host lock; vault-first callers are refused. Duplicates: none. Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-27 | T2 / T10 | Branch sliced by exact statement text; Gmail lock pulled by regex. | Extract the branch into a method of a testable class (`Slots` per R3) and test it directly. | Medium |
| 2 | 31-32 | T3 | Fake upstream `JsonCredentialSlots` defined inline. | Use the real class from the shared plugin on the Gradle test classpath. | Low |
| 3 | 67 | B5 | `guardCalls==16` exact-count assertion. | Keep as "guard ran per operation"; exact count is fine here since the loop is fixed. | Low |
| 4 | 82-88 | T8 | 2000-iteration race with 20 s joins: probabilistic deadlock detector. | Keep, but bound by `assertTimeout` in JUnit. | Low |

## Proposed end state
Part of one `CredentialFencesTest` Gradle JVM class over the real `AlphaCredentialStore`/`Slots` code, run by
`testDebugUnitTest` in the Android lane only when `android/app/src/main/java/**/(AlphaCredentialStore|AlphaLocalAgentPlugin|Slots)*.java` change.
