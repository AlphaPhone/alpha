# test/fixtures/ResidentAttachDiagnosticTest.java
- Lines: 35 | Kind: transplant (Java harness body; the importer splices the private nested class `ResidentAttachDiagnostic` out of `AlphaLocalAgentPlugin.java` by `indexOf` and compiles the two together) | Verdict: DELETE (with test 4 of `test/resident-attachment.test.mjs`)
- Covers: the resident-attach failure log line carries only a fixed stage, a bounded HTTP status and an exception class name, and never reads the exception's message. Duplicates: none (no Quint or Lemma reference; `grep -r ResidentAttachDiagnostic specs` is empty). Callers/importers: only `test/resident-attachment.test.mjs:70-92`, which reads the harness as text, cuts it after the class header (`harness.indexOf('public final class ResidentAttachDiagnosticTest {')`) and pastes the product class in between.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-35 | T2 | The file does not compile alone: `ResidentAttachDiagnostic` is a `private static final class` inside `AlphaLocalAgentPlugin` (four references there), cut out between `private static final class ResidentAttachDiagnostic {` and ` private final ExecutorService workers=`. Any reformat or reorder of the plugin breaks it. | Delete with the importer's test 4. | Low as a test; see finding 3 for the coverage. |
| 2 | 4-9 | — | The `PrivateOwnerException` whose `getMessage`/`toString` throw is a good way to prove a log line does not read exception text. | Carry this one case (plus the `status` clamp at lines 24-28) into the Gradle JVM `connection-cloud` suite once the diagnostic is a top-level class. android research suggests merging it with `NativeNotificationDiagnostics` into one `Diagnostics.family(Throwable)`/`httpStatus(int)` helper. | — |
| 3 | — | — | After deletion nothing checks that resident-attach logs are free of content. This is a privacy rule (no token, owner or body in logcat). | Owner question: extract the class (preferred) or accept the gap. | Medium (privacy regression would be silent). |

## Proposed end state
File deleted. If `ResidentAttachDiagnostic` is extracted to `AlphaUtil`/a `Diagnostics` class during the Android
cleanup, one Gradle JVM test method asserts the log line format for the four stages, clamps an out-of-range status
to 0, and never calls `getMessage`/`toString` on the throwable (the throwing exception from lines 5-9).
