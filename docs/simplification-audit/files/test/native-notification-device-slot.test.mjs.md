# test/native-notification-device-slot.test.mjs
- Lines: 59 | Kind: host-JVM integration of real `NativeOwnerReminderHost`, `NativeDeviceEnrollmentKey`, `NativeNotificationDiagnostics` with inline stubs of `Log`, `Context`, `AlphaCredentialStore`, `AlphaLocalAgentPlugin`, `HostedInbox`, `HostedResultNotices`; the renderer key is recomputed in JS with `createHash` | Verdict: KEEP, MERGE into `test/integration/android-jvm.test.mjs`
- Covers: the native reminder owner lookup derives the same `device:` slot key as the renderer for local, remote and Cloud agents, and the review fence refuses a changed owner or agent. Duplicates: `scripts/test-android-notification-device-slot.ts` (near-copy needing the Android SDK JSON source; no caller found in package.json, workflows or scripts). Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55 | T9 | `ALPHA_NOTIFICATION_HOST_SOURCE` env override; nothing in the repo sets it (grep: only this file and the script twin). | Delete the knob. | None |
| 2 | 10-11 | A7 | Points at `scripts/test-android-notification-device-slot.ts`, an orphan manual twin. | Delete the script (scripts review). | Low |
| 3 | 26-34 | C6 | Expected keys are recomputed with `createHash(JSON.stringify([...]))` instead of importing the renderer's key derivation. | Import the renderer function and pass its outputs to the Java fixture as arguments. | Low |
| 4 | 17-53 | T7 | Stub classes and test main in JS template strings. | Committed fixture files under `test/fixtures/notification-device-slot/`. | None |

## Proposed end state
One android-jvm case: committed fixture main compiled with the three real classes, given renderer-computed keys as
arguments; asserts local/remote/Cloud keys equal and the review fence refuses wrong owner/agent. Env knob and script
twin deleted.
