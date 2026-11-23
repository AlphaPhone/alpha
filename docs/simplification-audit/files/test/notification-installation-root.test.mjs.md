# test/notification-installation-root.test.mjs
- Lines: 34 | Kind: transplant on the JVM (slices `AlphaLocalAgentPlugin.java` between ` static String notificationInstallation(` and ` static void rememberNotificationOwner`, pastes it into a fake `AlphaLocalAgentPlugin` class with a stub `android.content.Context` and stub `HostedInbox`, compiles and runs with `runJvm`) | Verdict: MERGE into `test/android-jvm/notification-owner.test.mjs` and PORT to compile the real class unsliced
- Covers: the native notification installation-ID reader accepts an app-root alias but refuses a symlinked `.eliza` state directory, a linked ID file, a directory ID, a missing root and an invalid ID. Duplicates: none (only coverage; grep for `notificationInstallation` finds only this file, its sibling and the product Java). Callers/importers: `npm test` glob; imports `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T2, T10 | Cuts Java source at two literal method signatures; any reorder of methods in a 1.4k-line class breaks it, and the method under test is compiled outside its real class. | Move `notificationInstallation`/`rememberNotificationOwner` into a small package-private class (e.g. `NotificationOwnerRecord.java`, part of the AlphaLocalAgentPlugin split, D1 pattern) and compile that file unchanged. | Medium (product refactor first) |
| 2 | 13 | C1 | Stub `HostedInbox.id` re-implements the product validator regex. | Compile the real `HostedInbox.java` (or its `id` helper once it lives in `AlphaUtil`). | Low |
| 3 | 19-28 | - | Symlink/escape refusals are a security boundary no emulator journey can reach. | Carry all six assertions. | - |
| 4 | 12-31 | D8 | Java test written as a JS template string. | Put the Java test in `test/android-jvm/fixtures/NotificationOwnerTest.java`. | Low |

## Proposed end state
One file, `test/android-jvm/notification-owner.test.mjs`, compiles the real extracted owner-record class plus a checked-in Java test, and covers both the installation-root refusals (this file) and the persistence branches (`notification-persist-owner-branches.test.mjs`). No source slicing.
