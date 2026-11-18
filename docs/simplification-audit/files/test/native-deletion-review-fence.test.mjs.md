# test/native-deletion-review-fence.test.mjs
- Lines: 38 | Kind: host-JVM test compiling real `NativeOwnerReminderHost.java`, `NativeDeviceEnrollmentKey.java` and siblings with hand-written stubs for `Context`, `Log`, `AlphaCredentialStore`, `AlphaLocalAgentPlugin`, `HostedInbox`, `HostedResultNotices` | Verdict: MERGE into `specs/quint/refinement/native/deletion-coordinator.mjs`
- Covers: the native deletion review fence binds session token, enrollment key, provider version, owner and generation without UI HTTP. Duplicates: the deletion-coordinator refinement already compiles `NativeOwnerReminderHost` (line 8) but does not observe `reviewFence`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-18 | T3 / T7 | Six stub classes typed by hand; any new dependency breaks javac. | Reuse the refinement's port fixture instead. | Low |
| 2 | 19-33 | - | Fence changes when token/key/provider version change; wrong owner/generation throw. Security-relevant, not covered elsewhere. | Carry as observed facts in the refinement driver. | Medium |

## Proposed end state
File deleted; the fence cases run inside the deletion-coordinator refinement, which already builds the real host classes.
