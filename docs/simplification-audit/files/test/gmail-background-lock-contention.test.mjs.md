# test/gmail-background-lock-contention.test.mjs
- Lines: 109 | Kind: JVM integration with Java method transplant (real `GmailBackground`, `CloudDeployment`, upstream `MailBackgroundDelivery`/`MailHistoryReconciliation`, patched `JsonCredentialSlots`; `AlphaCredentialStore` and `AlphaLocalAgentPlugin` methods sliced by brace matching) | Verdict: REWRITE as a Gradle JVM test that compiles the real classes unsliced
- Covers: a Gmail background withdrawal and a lifecycle-first vault writer both finish under forced lock contention (no deadlock; lifecycle lock before the slot lock). Duplicates: none behavioural. Callers/importers: none; uses `test/fixtures/GmailBackgroundLockContentionTest.java`, `fixtures/secure-store-memory/android/util/AtomicFile.java`, `fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15, 23-27, 66-87 | T2, T10 | Slices by text: `AlphaCredentialStore.java` from `  if(!"cloud:production".equals(name)` to `  return AlphaLocalAgentPlugin.mutateCredentials(`; methods by signature `static Object credentialLifecycleLock(`, `private static void requireLockOrder(`, `static <T> T withCredentialSlotMutation(`, ` String readCredentialSlot(`, ` void removeCredentialSlot(`, ` private boolean mutateSlot(`; `JsonCredentialSlots` ` private SecretKey key()` replaced. | Extract the lock helpers (`lifecycleLock`, `requireLockOrder`, `withCredentialSlotMutation`) into a small Android-free class the store and agent plugin share (fits the planned `AlphaUtil`/`Slots`, R3), then compile it and the real store in the Gradle JVM test set with the existing Android shims. | medium: deadlock freedom is high-value; keep the case through the port |
| 2 | 37-104 | C4 | Hand-written stand-ins for `Context`, `MailNoticePoster`, `LocalAgentProviderAdmission`, `AlphaDataReset`, `GmailDeliveryWorker`, `R`, `MainActivity` in JS template strings. | Move to `.java` fixture files in the JVM test set. | low |
| 3 | 18 | — | Asserts `jsonJar` exists instead of skipping. | Keep failing loudly (CI must have the jar). | none |

## Proposed end state
One JVM test (Gradle `test` set, Android-JVM lane) that compiles the real lock helper, credential store and Gmail
background classes with shared host shims and proves the contention case. No method slicing.
