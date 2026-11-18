# android/app/src/main/java/ai/alphacompute/alphaphone/NativeOwnerReminderHost.java
- Lines: 96 | Role: authenticates the owner/agent/enrolled device behind native reminder and deletion review (full `read()` over HTTP and a fast `reviewFence`) | Verdict: SIMPLIFY
- Importers: `AlphaCanonicalNotifications` (3), `NativeDeletionCoordinator` (2), `AlphaApplication` (1). Text/path pins: `test/native-deletion-admission.test.mjs`, `test/native-deletion-review-fence.test.mjs`, `test/native-notification-device-slot.test.mjs`, `test/reset-startup.test.mjs`, `scripts/test-android-notification-device-slot.ts`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{CanonicalTapTraces.java,deletion-coordinator.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 69-75 | C3 / C5 | Owner `/api/auth/me` verification — 4th copy (see NativeNotificationSession finding 1). | Use `ResidentOwner.requireOwnerSession`. | Medium (security). |
| 2 | 78-80 | C3 | Agent check `agents.length()!=1 \|\| !"running"…` without the placeholder-id check other copies have. | `ResidentOwner.requireRunningAgent`. | Medium: adds placeholder rejection here — confirm desired. |
| 3 | 31, 92 | C5 | `String account=provider.getString("accountRef");if("native-local".equals(account))account+=":"+subject;` twice in one file. | `private static String accountRef(JSONObject provider, String subject)`. | None. |
| 4 | 42-44 | D4 | `deviceSlot(owner,agent)` is a one-line wrapper over `NativeDeviceEnrollmentKey.local("https://device.alpha.invalid",…)`. | Move to `NativeDeviceEnrollmentKey.deviceSlot`. | Low; no production caller outside this file (33, 81), but `test/native-notification-device-slot.test.mjs:33-34` calls `NativeOwnerReminderHost.deviceSlot` — update it. |
| 5 | 8-24 | D7 | `Ports` interface + `NativeOwnerReminderHost(Ports)` constructor exist for the host/Quint tests; production always uses the `Context` constructor. | Keep while Quint traces drive it (owner decision on T2/T10); otherwise collapse to the Context form. | Low. |
| 6 | 84 | C3 | Inline id regexes `[a-f0-9-]{36}` / `[a-f0-9]{64}`. | `Ids.uuidLoose` / `Ids.sha256Hex`. | None. |
| 7 | 87-90 | D9 | Field loop with nested ternary to pick the expected value. | Build a `Map` of expected values or 4 explicit checks. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Ports` | interface | 8-13 | `NativeNotificationSession.Ports` | here |
| `Current` (local class with deadline + re-check) | class | 49-76 | `NativeNotificationSession.restore.Current` | here |
| `accountRef` logic | helper (inline ×2) | 31, 92 | `AlphaCredentialStore:313-316` computes accountRef too | here |
| `deviceSlot` | helper | 42-44 | `NativeDeviceEnrollmentKey.local` | `NativeDeviceEnrollmentKey` |

## Proposed end state
~75 lines: `read()` and `reviewFence()` using shared owner/agent/id helpers; device-slot key from `NativeDeviceEnrollmentKey`.
Output JSON (`protocol:1`, fields) unchanged.

## Verification
`test/native-deletion-review-fence.test.mjs`, `test/native-notification-device-slot.test.mjs`, Quint deletion-coordinator and
canonical-tap traces, reminder deletion instrumentation.
