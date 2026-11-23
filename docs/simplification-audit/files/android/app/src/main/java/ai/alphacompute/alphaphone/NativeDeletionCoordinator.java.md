# android/app/src/main/java/ai/alphacompute/alphaphone/NativeDeletionCoordinator.java
- Lines: 57 | Role: process singleton that binds the upstream `DeferredDeletionCoordinator` (reviewed-deletion Undo window) to Alpha's slots, boot clock, owner fence, reminder engine, Calendar writes and WorkManager | Verdict: SIMPLIFY
- Importers: 6 main (`CalendarSyncBridge` 9, `AlphaDeletionsPlugin` 6, `AlphaCalendarPlugin` 2, `AlphaActionJournalPlugin`, `AlphaApplication`, `DeletionWorker`), 3 androidTest. Text/path pins: `test/native-deletion-admission.test.mjs`, `test/reset-startup.test.mjs`, `test/shared-deletion-window.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{DeletionCoordinatorTraces,DeletionTestPorts,CalendarSyncEnableTraces}.java`, `deletion-coordinator.mjs`, `calendar-sync-enable*.mjs`, `action-recovery-platform.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-29 | C4 (P7) | Anonymous `Slots` adapter `read→store.readCredentialSlot / write→store.writeCredentialSlot` — one of 12 identical adapters. | `AlphaCredentialStore.asSlots()` (or `implements` a single upstream `SecureSlots`). | Low. |
| 2 | 40-44 | C5 | `AlphaReminders.engine(context)` looked up in each of five one-line forwards. | `ReminderEngine engine=AlphaReminders.engine(context)` once; or have the upstream `Reminders` port accept a `ReminderEngine` directly (then the anonymous class disappears). | Low (engine is a singleton). |
| 3 | 47-51 | A1 (suspicion) | Target `version` 3 → `CalendarSyncBridge`, 2 → `CalendarScopedDeletionReview`, otherwise → upstream `CalendarPlugin.deleteReviewedExact` with `CalendarDeletionIdentity.parse` (legacy numeric identities, research P5). Version 2 and 3 are written today (`CalendarScopedDeletionReview.java:38`, `CalendarSyncBridge.java:206`); no product writer of a version-1/absent target found in `android/app/src/main`. | Owner/upstream check: if the upstream reviewed-exact path no longer writes unversioned targets, delete the fallback branch and `CalendarDeletionIdentity` legacy form. | Medium: pending deletion rows survive across app updates for the Undo window only (minutes), so the cut-off is short. |
| 4 | 31 | B1 | `catch(Exception unavailable){return UNKNOWN_BOOT;}` around `Settings.Global.BOOT_COUNT`. Specified fallback (per-process continuity). | Keep; narrow to `Settings.SettingNotFoundException`. | None. |
| 5 | 54 | D8 | WorkManager enqueue lambda packed on one line. | Format. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `get(Context)` lazy singleton | helper | 21-22 | 7 hand-rolled `static synchronized get()` singletons (`SourceRenewalHost`, `NoteSourceReferences`, `SelectedDocumentAccess`, …) | keep pattern; optional `Lazy<T>` util |
| Slots adapter | anonymous class | 26-29 | 12 copies (P7) | `AlphaCredentialStore.asSlots()` |
| `JOURNAL`, `INSTALLATION`, `WORK` | const (persisted names) | 18-19 | `RendererCredentialSlots.NATIVE_NAMESPACES` lists the same namespaces | `Slots` constants class |

## Proposed end state
~45 lines: singleton + configuration built from `store.asSlots()`, one engine reference, Calendar port with only the
live target versions. Persisted slot names unchanged.

## Verification
`test/shared-deletion-window.test.mjs`, `test/native-deletion-admission.test.mjs`, Quint deletion-coordinator refinement,
`ScopedCalendarDeletionInstrumentedTest`, `CalendarSync*` instrumentation.
