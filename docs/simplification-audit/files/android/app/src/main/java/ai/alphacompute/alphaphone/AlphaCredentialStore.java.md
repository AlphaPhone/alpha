# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCredentialStore.java
- Lines: 321 | Role: Alpha's facade over the shared encrypted `JsonCredentialSlots` store: per-slot byte caps, namespaced slot names, credential-mutation fencing via `AlphaLocalAgentPlugin`, provider-admission CAS/rollback/snapshot, provider binding guard, and legacy Cloud credential recovery. | Verdict: SIMPLIFY
- Importers: 22 main files construct it 51 times (`new AlphaCredentialStore(`); androidTest 25+ classes; Text/path pins (heavy): `scripts/test-android-notification-device-slot.ts`, `specs/quint/native/manifest.json:3009,3164,3578-3618`, `specs/quint/services/{manifest.json,NativeCredentialMutation.qnt,README.md}`, 28 files under `specs/quint/refinement/{native,services}/` (platform stubs declaring `class AlphaCredentialStore`), and tests `agent-always-local`, `always-on-listener`, `canonical-notification-security`, `cloud-sign-in-flow`, `cloud-voice-profile`, `connection-routes`, `credential-slot-lock-order`, `gmail-background-*`, `invocation-owner-cache`, `keyboard-dictation`, `legacy-cloud-recovery`, `native-deletion-review-fence`, `native-notification-device-slot`, `native-secure-slots` (:167-168 regex `static final String NOTE_ORIGINS=...` and `if\(NOTE_ORIGINS\.equals\(name\)\)return 512\*1024;`), `notification-persist-owner-branches`, `power-cold-native-pin`, `renderer-slot-policy`, `reset-cloud-revocation`, `reset-wiring`, `resident-result-transport`, `support/feature-parity.mjs`, fixtures `GmailBackgroundLockContentionTest.java`, `legacy-cloud-recovery/*.java`, `secure-store-memory/MemoryTest.java`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 79-82, 105, 135, 180, 196-217, 239 | A1 | Legacy pre-namespace Cloud recovery: `readLegacySlotBeforeAttach`, `legacyRecovery()`, three `legacyRecovery().block()` calls inside mutations, `legacyCloudRecoveryEligible`, `RecoveryRefused`, `restoreLegacyCloudCredential`. | Owner decision A1 (with `LegacyCloudRecovery.java`, `AlphaCloudSignInPlugin` restore, `ResetBeforeDispatch.readLegacyCloudSlot`): delete ≈40 lines. | Medium; many Quint/test pins (saved-sign-in-recovery model, legacy-cloud-recovery fixtures). |
| 2 | 41-44, 56-62, 66-71 | A1 | `retainedLimit`: "a document written under the earlier 32 MiB cap stays readable" — only `NOTES_TRASH` differs. `requireCapacity` exists to reconcile cap vs retained cap. | Delete `retainedLimit`; pass the 3-arg `JsonCredentialSlots` constructor (as lines 77/81 already do); `requireCapacity` compares against `slotLimit`. | Low-medium: a Trash document between 30 and 32 MiB on a pilot device would become unwritable until shrunk (owner confirm none exist). |
| 3 | 110-111 | B4 | `if(provider==null)return false;` then `String environment=provider==null?"production":...`; the ternary's null side is unreachable. | `String environment=new JSONObject(provider).optString("environment","production");` | None |
| 4 | 32, 77, 81 | C6 | `new JsonCredentialSlots(new File(...getNoBackupFilesDir(),"connection-credentials"),"alpha.connection.aes.v1",...)` written three times (and 77/81 silently omit `retainedLimit`). | `private static JsonCredentialSlots open(Context)` with `DIR`/`KEY_ALIAS` constants. | Low (persisted names unchanged). |
| 5 | 72-73 | D7 | `slotHash`, `slotFile` — no main caller (grep: 0), used by 5 androidTest classes and test fixtures to inspect ciphertext files. | Move to an androidTest helper that opens `JsonCredentialSlots` directly, or keep and mark test-only. | Low; Quint stubs `credential-coordinator-platform.mjs:167-170`, `services/credential-platform.mjs:32-33` declare them. |
| 6 | 294-302 | A7 / D7 | `providerAdmissionGeneration()` has no production caller (grep main: 0); only `test/power-cold-native-pin.test.mjs:142`. | Delete; edit that test. | Low |
| 7 | 158-160 | C3 (P9) | Hand-rolled SHA-256 + `String.format("%02x")` hex; twins `AlphaDevicePlugin.hex` (:240), `WorkflowWorkerAssets:26-27`, `HostedResultNotices:31`, `CalendarSyncSnapshot:140`, `GoogleWorkspaceReturnFlow:33`. | `Digests.sha256Hex(String)` util. | Low |
| 8 | 93, 120, 128, 157, 177, 185, 243, 245, 299, 310 (+ `"cloud:staging"` 93, 220) | C6 (P6) | `"cloud:production"` 11x in this file. | `CloudDeployment.PRODUCTION_SLOT` / `STAGING_SLOT`. | Low |
| 9 | 34-53 | C6 (P6) | `slotLimit` regex/if ladder: caps are kept apart from the slot owners (Notes, Gmail, calendar sync, inbox, SMS ledger) and from `RendererCredentialSlots`. | One `Slots` table (name or pattern, cap, renderer policy) consulted by store and policy. | Medium (cross-file). |
| 10 | 15-22, 54-55 | D7 | `NOTES_*` constants: no main reader outside `slotLimit` (grep main: 0); `NOTES_FOLDERS`, `NOTES_TRASH_BYTES` read nowhere else at all; others by androidTest/tests. | Inline `NOTES_TRASH_BYTES` into the table of #9; keep the slot-name constants only in that table. | Low; `test/native-secure-slots.test.mjs:167-168` regexes `NOTE_ORIGINS`. |
| 11 | 23-25 | D3 | Static `cloudChange` observer set by `GmailBackground` under `JsonCredentialSlots.LOCK`. | Keep until `CredentialAuthority` extraction (research P2). | — |
| 12 | 93-134, 165-195, 232-292 | D9 | Four anonymous `CredentialMutation` classes, each re-reading the provider slot through `slots.read(CloudDeployment.storageSlot(LocalAgentProviderAdmission.PROVIDER_SLOT))` (13x). | `private String provider()` and `private String cloud()` readers; consider moving provider-admission methods to `ProviderAdmissionStore` (they are provider policy, not storage). | Medium; Quint NativeCredentialMutation refinement. |
| 13 | 10 | D3 (P2) | Cycle with `AlphaLocalAgentPlugin` (`mutateCredentials`, `withCredentialSlotMutation`, `powerAuthorizationChanged`, `reserveCredentialIntent`, ...). | Resolved by the cross-file `CredentialAuthority` extraction. | High |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `StorageFullException` | class | 12-14 | `JsonCredentialSlots.CapacityException` (upstream) | keep |
| `CloudChangeObserver` | interface | 23 | `Runnable`-like guards | shared `Guard`/`ThrowingRunnable` |
| `slotLimit` | helper | 34-53 | `RendererCredentialSlots` lists, per-owner caps | `Slots` table |
| `retainedLimit` | helper | 59-62 | — | delete (A1) |
| `ProviderChanged` | class | 163 | — | keep (private) |
| `RecoveryRefused` | class | 198-201 | — | delete (A1) |
| SHA-256 hex | helper (inline) | 159-160 | `AlphaDevicePlugin.hex`, `WorkflowWorkerAssets`, `HostedResultNotices`, `CalendarSyncSnapshot`, `GoogleWorkspaceReturnFlow` | `Digests` |
| `JsonCredentialSlots` construction | helper (inline x3) | 32, 77, 81 | — | `open(Context)` |
| `"cloud:production"` | const | 11 sites | 32 sites/9 files | `CloudDeployment.PRODUCTION_SLOT` |

## Proposed end state
~230 lines: one slots factory, a table-driven cap lookup, slot read/write/CAS/remove with mutation fencing, provider-admission CAS/rollback/snapshot and binding guard with shared `provider()`/`cloud()` readers, `asSlots()` adapter for upstream engines. No legacy recovery, no retained cap, no test-only members. Persisted file/alias/slot names unchanged.

## Verification
`ConnectionInstrumentedTest`, `CloudDeploymentStorageInstrumentedTest`, `LocalAgentProviderInstrumentedTest`, `NotesStorageDurabilityInstrumentedTest`, resident instrumentation; `test/native-secure-slots.test.mjs`, `test/credential-slot-lock-order.test.mjs`, `test/renderer-slot-policy.test.mjs`, `test/power-cold-native-pin.test.mjs`, `test/reset-cloud-revocation.test.mjs`; Quint NativeCredentialMutation and credential-coordinator refinements (update platform stubs when members move).
