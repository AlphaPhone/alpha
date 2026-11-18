# scripts/test-android-notification-device-slot.ts
- Lines: 63 | Kind: diagnostic JVM test (compiles real Android `org.json` sources + product Java with stubs) | Verdict: DELETE
- Covers: Android's `org.json` escapes `/` so a key hashed from `JSONArray.toString()` differs from the renderer's `JSON.stringify`; `NativeDeviceEnrollmentKey` must match the renderer and `NativeOwnerReminderHost` read/review fence must refuse wrong owner/agent. Duplicates: `test/native-notification-device-slot.test.mjs` is a near-verbatim copy using the pinned JVM JSON jar (same Support stubs, same `DeviceKeyTest` body). Callers: none. Only a comment in the twin test (`:10-11`) names it; it requires `ALPHA_ANDROID_JSON_SOURCE`, which nothing in the repo sets, and it is not matched by the `npm test` globs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 / T4 | Never-run diagnostic duplicating a host test; env knob nothing sets. | Delete; drop the comment in the twin. | Low |
| 2 | 37-38 | A1 | Its only extra assertion ("escaped legacy bytes") concerns a legacy key form (D1 deletes legacy readers). | Nothing to carry. | — |
| 3 | 27-28 | D5 | Stubs `HostedInbox`/`HostedResultNotices`, hosted-path classes. | Gone. | — |

## Proposed end state
Deleted. The twin itself is a JVM unit test with hand stubs (T3); the chunk owning `test/` should decide
whether it moves to an Android instrumented/Robolectric test of `NativeDeviceEnrollmentKey`.
