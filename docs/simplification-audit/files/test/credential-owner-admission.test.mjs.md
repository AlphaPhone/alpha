# test/credential-owner-admission.test.mjs
- Lines: 82 | Kind: host-JVM transplant: brace-matches three methods out of `AlphaLocalAgentPlugin.java` (`reserveCredentialIntent`) and `AlphaConnectionPlugin.java` (`credentialIntent`, `handleOnDestroy`), pastes them into hand-written stand-in classes inside an inline Java template, compiles with two upstream `CredentialIntentFence.java` copies, `SecureSlotPolicy.java` and the real `RendererCredentialSlots.java` | Verdict: REWRITE as a Gradle JVM test over the real classes (or DELETE if the plugins cannot be constructed off-device)
- Covers: a destroyed or concurrently retired connection plugin cannot reserve a new credential intent, ordinary slots do not bump intent, and teardown does not deadlock with a lifecycle-locked reservation. Duplicates: none on host; `android/app/src/androidTest` has no equivalent (checked by name). Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs` (shared).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-17, 20-24 | T2 / T10 | Java source sliced by signature string and brace counting; stand-in classes (`Connection extends Parent`, `QuietPort`) replace the plugin. A signature edit or a new field read breaks it. | Extract the fence logic the test exercises into a plain class (e.g. `CredentialOwnerFence` in the root package per R3) used by both plugins; test that class with JUnit in `android/app/src/test`. | Medium |
| 2 | 30 | — | Two `CredentialIntentFence.java` files are compiled (agent-runtime and secure-store nativeonly copies): upstream duplication. | Upstream follow-up (D14). | Low |
| 3 | 62-75 | — | Real concurrency case (teardown during blocked reservation, 2 s deadline). Worth keeping. | Carry as-is into the JUnit test. | Medium |

## Proposed end state
A Gradle JVM test `CredentialFencesTest` (with `credential-slot-lock-order` and `credential-stop-dispatch`) runs the real
extracted fence class; no Java in JS templates, no source slicing. Runtime drops from a javac per file to one Gradle task.
