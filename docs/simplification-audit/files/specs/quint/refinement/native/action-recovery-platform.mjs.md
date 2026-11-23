# specs/quint/refinement/native/action-recovery-platform.mjs
- Lines: 125 | Kind: Quint harness platform (generates Java stubs and text-slices product/upstream sources for `ActionRecoveryTraces.java`) | Verdict: PORT
- Covers: the compile environment for model `NativeActionRecovery`: Capacitor/Android stubs, closed ports (`WorkflowNoticePoster` that throws on any post, `NativeDeletionCoordinator`, `AlphaReminders`), and a `ReminderReceiptFixture` built from two members of upstream `ReminderStore.java`. Duplicates: the Capacitor `PluginCall`/`Plugin`/`JSObject` stubs and the `AlphaCredentialStore`, `CalendarAvailabilityJournalResult`, `SmsActionJournalResult`, `System` stubs are near-identical to `clock-review-platform.mjs:184-229`. Callers: `action-recovery.mjs:7,51` only.

## Text anchors (T10)
- `android/app/.../AlphaActionJournalPlugin.java`: everything before `' private final android.os.Handler clockMain'` (line 55 today) plus `}`; asserts the result contains `'recoverReminder(PluginCall call)'`.
- `vendor/eliza/plugins/plugin-native-reminders/.../ReminderStore.java`: `' static String digest(String value)'` .. `' synchronized JSONObject selected('` and `' synchronized JSONObject operationReceipt('` .. `' /** No automatic replay'` (lines 472-519 today).
- Shadow class `System` with fixed `currentTimeMillis()` in the product package.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-31 | T10 | The product plugin is cut in half at the `clockMain` field: this harness takes the head (recovery methods), `clock-review-platform.mjs:6-19` takes the tail (Clock review methods). The file is effectively two classes sharing one Capacitor plugin. | Split `AlphaActionJournalPlugin` into `ActionRecovery.java` (recover* members) and `ClockJournalReview.java` (Clock members) with the plugin forwarding to both; each harness compiles its class whole. | Medium: the split must keep the plugin method names the renderer calls. |
| 2 | 106-107 | T10 | Slices upstream `ReminderStore` text to obtain `digest`, `canonical` and `operationReceipt`. Anchors only change on a pin bump, but the generated class is a transplant. | Compile `ReminderStore.java` whole with a storage port (it is already staged by `preparePatchedNative`), or ask upstream to expose `operationReceipt` on a small interface (D14 follow-up). | Low |
| 3 | 32-58, 62-90 | C5 | Stub set duplicated with `clock-review-platform.mjs` (Context, Plugin, PluginMethod, JSObject, JSArray, PluginCall with latch, AlphaCredentialStore, CalendarAvailabilityJournalResult, SmsActionJournalResult, System). | One `journal-ports.mjs` shared by both harnesses, parameterised by the slot read/write callbacks and clock. | Low |
| 4 | 67-73 | — | Poster stub throws on `allowed/post/cancel`: a good negative check that recovery never re-posts. | Keep. | — |

## Proposed end state
Compiles a whole `ActionRecovery` class (and whole upstream `ReminderStore`) against one shared journal-port stub set; no `indexOf` slicing.
