# test/fixtures/NativeNotificationSessionTest.java
- Lines: 66 | Kind: Java fixture, integration (`NativeNotificationSession` with `ResidentResultSession`, `CloudDeployment`, `RendererCredentialSlots`, `HostedInbox` and upstream `SecureSlotPolicy` compiled together; network through a `Ports` fake) | Verdict: KEEP, MOVE to the Gradle JVM resident suite
- Covers: notification page paths are bounded and carry no token; restoring a saved resident notification session requires the same installation, provider generation, owner, agent, machine session kind and expiry, refuses revoked or raced sessions and treats a starting resident as not ready rather than revoked. Duplicates: none. Callers/importers: `test/native-notification-session.test.mjs:14`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-31 | C4 | The `/api/auth/me` + `/api/agents` fake repeats a check copied in 4-5 Java classes (cross-file-actions line 241 plans one shared owner-session check). | When that lands, test the shared check once and keep only the restore-specific cases here. | Low |
| 2 | 9 | T8 | `NOW=System.currentTimeMillis()`: real clock in a fixture. | Use a fixed instant. | Low |
| 3 | all | scope | Resident (on-device agent) sessions are live product, not the deleted paired/hosted agent (D5). | Keep. | Low |

## Proposed end state
Gradle `NativeNotificationSessionTest` with the same reject table and a fixed clock. Node wrapper deleted.
