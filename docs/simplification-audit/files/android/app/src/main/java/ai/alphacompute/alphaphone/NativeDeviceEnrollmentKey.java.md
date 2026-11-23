# android/app/src/main/java/ai/alphacompute/alphaphone/NativeDeviceEnrollmentKey.java
- Lines: 24 | Role: builds the device-enrollment slot key exactly as the renderer's `JSON.stringify` tuple digest (local and Cloud-runtime variants) | Verdict: SIMPLIFY
- Importers: `HostedDelivery` (`local` + `cloud`), `NativeOwnerReminderHost.deviceSlot` (`local`). Text/path pins: `test/native-notification-device-slot.test.mjs`, `test/native-deletion-review-fence.test.mjs`, `test/resident-result-transport.test.mjs`, `scripts/test-android-notification-device-slot.ts`, `specs/quint/refinement/native/{DeletionTestPorts,HostedInboxTraces}.java`, `deletion-coordinator.mjs`, `hosted-inbox.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-13 | A3 (P15) | `cloud(origin,user,agent)` serves Cloud-hosted agents (`cloud-runtime:` mode in `HostedDelivery`); PRD: "No hosted-agent pairing" and Cloud never hosts the agent (`docs/prd.md:17`). Only caller `HostedDelivery` cloud mode. | Delete `cloud` together with `HostedDelivery`'s `cloud`/`remote` modes (owner decision P15). | Low once P15 is decided. |
| 2 | 22 | C3 | Digest via `HostedResultNotices.hash` — the product's SHA-256-hex lives in an unrelated notice class. | Point at the shared `Digests.sha256Hex` when it exists. | None. |
| 3 | 5-24 | MERGE | With `cloud` gone, `local` is a 3-line helper used by `HostedDelivery` and `NativeOwnerReminderHost.deviceSlot` (which itself is a one-line wrapper adding the fixed origin `https://device.alpha.invalid`). | Keep this class as the single owner and move the fixed origin here (`deviceSlot(owner,agent)`), delete `NativeOwnerReminderHost.deviceSlot`. | Low; `test/native-notification-device-slot.test.mjs` pins the call shape. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `digest(String...)` | helper | 14-23 | JSON.stringify-equivalent array encoding also hand-built in `NativeDigestSources.slot` (uses `JSONArray.toString`, which escapes `/` differently) | here |
| `"https://device.alpha.invalid"` | const | (in `NativeOwnerReminderHost:43`, `SourceRenewalNotices:46`) | 2 literal copies | here as `LOCAL_ORIGIN` |

## Proposed end state
~15 lines: `LOCAL_ORIGIN`, `deviceSlot(owner, agent)`, private `digest`. Key bytes unchanged.

## Verification
`test/native-notification-device-slot.test.mjs` (renderer/native key parity), `scripts/test-android-notification-device-slot.ts`.
