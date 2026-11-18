# test/notification-persist-owner-branches.test.mjs
- Lines: 55 | Kind: transplant on the JVM (slices `AlphaLocalAgentPlugin.java` from ` static String notificationInstallation(` to ` static void retireRejectedNotificationSession`, compiles it with real `NativeNotificationDiagnostics.java`/`NativeNotificationSession.java` and stubs for `AlphaCredentialStore`, `HostedResultNotices`, `ResidentResultSession`, `NativeNotificationProjector`, `JsonCredentialSlots`, `android.util.Log`) | Verdict: MERGE into `test/android-jvm/notification-owner.test.mjs` and PORT (same extraction as the sibling)
- Covers: `rememberNotificationOwner` persists a valid owner once and refuses eight failure stages (SESSION, AGENT, RECORD, PROVIDER, PREVIOUS, STORE, INSTALLATION, FINAL) with finite diagnostics and no write after refusal. Duplicates: none. Callers/importers: `npm test` glob; `jsonJarSkip` (skipped where the org.json jar is absent; `.github/workflows/android.yml:57` provisions it in CI).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T2, T10 | Same literal-signature slice as the sibling, with a different end marker. | Extract the class; compile it unsliced. | Medium |
| 2 | 17-25 | C3 | Stub `HostedResultNotices.hash` re-implements SHA-256→hex; stub `HostedInbox.id` re-implements the ID regex. | Use the real helpers (`AlphaUtil` once Stage B lands). | Low |
| 3 | 38-50 | - | Eight fail-closed branches with stage diagnostics: security-relevant, unreachable from a journey. | Carry. | - |
| 4 | 49 | B5-ish | Asserts every diagnostic row matches a closed pattern. | Keep (it is the privacy guarantee of the log line). | - |
| 5 | 7 | - | `{skip:jsonJarSkip}` silently skips locally. | Fine in CI; mention in the merged file header. | Low |

## Proposed end state
Merged with `notification-installation-root.test.mjs` into `test/android-jvm/notification-owner.test.mjs`, compiling the real extracted owner-record class with only Android/credential-store test doubles. Both tests stop depending on method order in `AlphaLocalAgentPlugin.java`.
