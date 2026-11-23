# test/fixtures/SmsActionJournalResultTest.java
- Lines: 23 | Kind: unit (real `SmsActionJournalResult` + real upstream `SmsSendJournal` hashing, no stubs) | Verdict: KEEP; MERGE later into the Gradle JVM `phone` suite (one `SmsActionJournalTest` with `SmsSendJournalTest`)
- Covers: an SMS action-journal outcome is accepted only when the native evidence matches the reviewed operation: same operation id, same SIM subscription, same recipients/body binding hash, and no claimed success for a `delivered`/`failed` record or a missing result. Duplicates: none. `specs/quint/refinement/native/action-recovery-platform.mjs:85` declares its *own* stub `final class SmsActionJournalResult`, so the formal replay never runs the real check. Callers/importers: only `test/sms-action-journal.test.mjs` (one minified line).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-21 | — | Unit-shaped, but it is the only test of an authorization rule (forged identity, SIM swap, body change, optimistic delivery). This is the T3 exception: risky logic no integration test reaches. | Keep. | High if deleted. |
| 2 | 13-20 | D8 | Mutate-then-restore on shared objects makes each case depend on the previous line. | One case per block with a fresh entry when moved. | — |
| 3 | importer | D8, T9 | `test/sms-action-journal.test.mjs` is one 900-character line with its own `javac` call. | Use `runJvm` from `jvm-tools.mjs` until the Gradle move. | — |
| 4 | action-recovery-platform.mjs:85 | T10 | The model harness stubs the class this fixture tests. | Point the harness at the real `SmsActionJournalResult.java` (owner of `specs/quint`). | Medium |

## Proposed end state
Same cases, one per block with messages, in a `phone` host-JVM test next to the SMS journal contract; the Quint
action-recovery harness compiles the real class instead of a copy.
