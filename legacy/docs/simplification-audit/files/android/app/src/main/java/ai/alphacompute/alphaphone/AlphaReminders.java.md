# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaReminders.java
- Lines: 31 | Role: Alpha's installed identity (channels, actions, slots) and encrypted storage factory for the shared ReminderEngine. | Verdict: SIMPLIFY
- Importers: DailyAppsPlugin, AlphaNotificationsPlugin, AlphaActionJournalPlugin, AlphaDeletionsPlugin, NativeDeletionCoordinator, NativeDigestHost, ReminderReceiver; androidTest Reminder* suites. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{ReminderDeliveryTraces.java,action-recovery-platform,deletion-platform,native-digest-platform,reminder-delivery}.mjs`; `test/native-deletion-admission.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-27 | C4 | Anonymous `SecureStringStore` adapter over `AlphaCredentialStore` (read/write). | `AlphaCredentialStore.asSlots()` / store implements the shared interface (cross-file). | low |
| 2 | 23 | C6 | Literal `"alpha-credential-slots-v1"` identity string. | Move to an `AlphaCredentialStore.IDENTITY` constant; value must stay byte-identical (persisted identity). | low |
| 3 | 11-19 | KEEP | 19 positional constructor args; installed identity strings that persisted reminders and PendingIntents name. | Keep values exactly. Optional: builder upstream for readability. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| STORAGE | const/factory | 20-27 | same adapter shape in 11 files | AlphaCredentialStore.asSlots() |

## Proposed end state
Configuration unchanged; storage factory becomes `context -> AlphaCredentialStore.slots(context, IDENTITY)`; ~22 lines. Estimated lines after: 22.

## Verification
androidTest Reminder* suites; Quint reminder-delivery refinement.
