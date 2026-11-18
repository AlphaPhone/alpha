# specs/quint/refinement/native/ActionRecoveryTraces.java
- Lines: 396 | Kind: Quint refinement driver (host-JVM, compiles real `AlphaActionJournalPlugin`/`AlphaActionJournal` + upstream `ActionJournal`, `NoticeRecovery`) | Verdict: KEEP; drop the legacy-row scenarios if D1 applies to journal rows
- Covers: recovery of reserved/applying action-journal entries for notices, reminders and Calendar/reminder deletions after process restart: exact receipt binding, foreign/payload/hash mismatches, storage faults before/after commit, passive reads not changing durable rows and not leaking private fields. Duplicates: none found in host tests for the same campaign. Callers: `native/action-recovery.mjs` (harness, 33 cases), `native/action-recovery-platform.mjs` (port stubs call back into `read`/`write`/`matches`/`deletionReceipt`/`reminderLookup`); test `test/quint-native-action-recovery.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 330-334, 372-375 | A1 (owner question) | `legacy-missing-binding-settled`, `legacy-missing-binding-applying` and `reminder-legacy-no-attempt` replay journal rows written without `enrollmentId` / without an attempt id (`initWithMetadata`). On a renamed package that starts with empty private data (D1) such rows can only exist if the current writer can still produce them; `AlphaActionJournalPlugin.java:69` already requires `enrollmentId`. | Confirm the current writer always stores `enrollmentId` and an attempt; if so delete the three scenarios, `completeBinding`, and the model's `initWithMetadata`. | Medium: needs the model change in `NativeActionRecovery.qnt` too. |
| 2 | 80-82 | C3 | Private SHA-256 hex helper (one of ~10 Java copies). | Use the shared Java hash helper (`AlphaUtil`) if it is on the harness classpath; otherwise move to `Trace.java`. | Low |
| 3 | 18-33 | D3 | All fixture state is mutable statics shared with generated platform stubs (`ActionRecoveryTraces.read` etc. called from `action-recovery-platform.mjs` strings). Works because each scenario runs in its own JVM (`javaTraceCampaign`). | Acceptable for a JVM driver; note the coupling in the platform file. | — |
| 4 | 313-325 | — | Reflection into `handleOnDestroy` and the cached `instance` field to simulate restart. Tied to private names in product classes. | Keep; if `AlphaActionJournal` gains a package-private `resetForProcessRestart()` in the test source set this becomes a call. | Low |
| 5 | 1-396 | — | Drives the real plugin entry points with a `PluginCall` and checks real durable bytes: genuine integration-level formal evidence. | Keep. | — |

## Proposed end state
Same driver minus the legacy-row scenarios (if D1 confirms), using the shared hash helper.
Still compiled with the real journal plugin and upstream recovery classes; one scenario per JVM.
