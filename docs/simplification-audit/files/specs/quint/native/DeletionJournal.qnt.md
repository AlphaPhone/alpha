# specs/quint/native/DeletionJournal.qnt
- Lines: 103 | Kind: Quint model (live) | Verdict: KEEP
- Covers: one durable native deletion row: Undo before expiry, owner/source change pauses before any dispatch, single dispatch with durable intent before the provider effect, a lost outcome becomes `unknown` and is never re-queued, Undo of an undone row returns it again. Duplicates: `NativeDeletionReviewAdmission.qnt` covers the review admission in front of this journal (different scope). Callers/importers: `quint:check` (8 runs, 4 witnesses); `specs/quint/refinement/native/JournalTraces.java` `deletions()` (javac of upstream `DeferredDeletionJournal`/`DeletionDeadline`), `refinement/native/deletion-coordinator.mjs:11-32` (`checkDeletionCoordinator`, upstream coordinator + Alpha owner binding), both from `refinement/native/index.mjs:132-148,187`; obligation `index.mjs:215`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-23, 83, 86 | B4 (vacuous) | `repeatStage(owner, revision)` is `if (…) s' = s else s' = s`: both branches stutter, so "replaying the same operation never creates a second row" is asserted by construction. Two scenarios call it. | Model the replay: call `stage` again with the same operation (guard `s.phase == "absent"` refuses) and expect no change, or delete `repeatStage` and the claim. | Low |
| 2 | 9 | — | Older `check(condition)` style. | Optional `.expect`. | None |
| 3 | manifest `sources` | §2.9 | Mix of Alpha (`NativeDeletionCoordinator.java`, `DeletionWorker.java`, `NotesDeletionLease.java`, `deletion-owner.ts`, `deletions.ts`, `note-audio-deletions.ts`, `NativeOwnerReminderHost.java`) and upstream journal sources. The Alpha TS files are not executed by either harness. | Trim `sources` to what the two harnesses compile/bundle. | Low |
| 4 | harness | — (good) | Both harnesses compile real Java whole with ports; no slicing. | Keep. | — |

## Proposed end state
Model kept with a real replay step instead of the stutter `repeatStage`. Sources trimmed to the executed Java. Both
Java harnesses stay; they are the import-style the audit wants.
