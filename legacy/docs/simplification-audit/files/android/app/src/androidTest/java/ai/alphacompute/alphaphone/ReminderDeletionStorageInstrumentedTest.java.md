# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderDeletionStorageInstrumentedTest.java
- Lines: 92 | Role: through the `AlphaConnection.secureRead/secureCompareExchange` bridge, checks four recovery slots (`reminder-deletions`, `reminder-creations`, `notes-audio-deletions`, `notes-trash`) are encrypted, CAS-guarded, survive recreation and enforce byte caps. | Verdict: SIMPLIFY (and rename)
- Importers: none. Text/path pins: `scripts/ci/pending-recovery-ui.py:24` (`'ReminderDeletionStorageInstrumentedTest','reminderDeletionSlotUsesEncryptedCompareExchange','pendingActionStorageFixture'`, CI `resident-android.yml:606`); `scripts/ci/fixtures/recovery-storage-e4d-pass.txt:1,6,9` (captured instrumentation output with the class name); `scripts/ci/test-recovery-ui-guard.py:112` (`captured_class=`). A rename must update all three.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-16 | A7 | Unused imports: `BufferedReader`, `InputStreamReader`, `InetAddress`, `ServerSocket`, `Socket`, `CountDownLatch`, `TimeUnit`, `AtomicInteger` (8 of 15). | Delete. | none |
| 2 | 24, 50 | D11 | Name says "ReminderDeletion" but the test covers four product recovery slots (two Notes slots). | Rename class/method to `RecoverySlotStorageInstrumentedTest#recoverySlotsUseEncryptedCompareExchange`; update the three pins. Optional, low value vs churn. | low |
| 3 | 25-29 | C3 | `slotHash` SHA-256 hex = `ConnectionInstrumentedTest.java:27` (same "connection-credentials/<sha(slot)>" file path derivation) and 10+ digest copies. | Shared `TestDigests.sha256Hex`; ideally a `CredentialSlotFiles.path(context,slot)` helper used by both. | none |
| 4 | 30-48 | C3 | `until/begin/result/invoke` re-implement "call a Capacitor plugin and poll `window.__x`", same as `PhotosTrash.nativeCall`, `ReminderTiming.pluginBridge`. | `WebViewTestDriver.nativeCall(plugin,method,args)`. | none |
| 5 | 52 | B4 | `assertTrue(BuildConfig.DEBUG)` after an explicit fixture gate: the class is only compiled into debug instrumentation anyway. | Delete. | none |
| 6 | 79 | C6 | Slot byte caps hard-coded (`1024*1024`, `262144`) next to the product's own per-slot cap ladder (`AlphaCredentialStore.slotLimit`, research P6). | Read caps from the single slot-constants class once it exists (research P6). | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `slotHash` | helper | 25-29 | `ConnectionInstrumentedTest.java:27`, 10+ SHA copies | `TestDigests` |
| `until`/`begin`/`result`/`invoke`/`ready` | helper | 30-48 | `PhotosTrashInstrumentedTest.java:35-38`, `ReminderTimingInstrumentedTest.java:45-49` | `WebViewTestDriver.nativeCall` |
| `jsonAtBytes` | helper | 56-62 | none | keep |

## Proposed end state
Same single gated test over the four slots; eight unused imports and the redundant DEBUG assert gone; bridge/digest helpers
shared; optional rename with pin updates. ~70 lines.

## Verification
`python3 scripts/ci/pending-recovery-ui.py` (phase `pendingActionStorageFixture=1`), `python3 scripts/ci/test-recovery-ui-guard.py` (reads the fixture txt).
