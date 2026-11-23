# specs/quint/refinement/native/deletion-coordinator.mjs
- Lines: 43 | Kind: Quint refinement driver (whole app Java + patched upstream deletion journal, stubbed Android) | Verdict: KEEP (add per-model test; compile once)
- Covers: model `DeletionJournal` (native manifest, live): the shared `DeferredDeletionCoordinator` with the Alpha host binding (`NativeDeletionCoordinator`, `NativeOwnerReminderHost`) for calendar and reminder deletions — stage/undo/expire, refused/committed-error outcomes, restart, stale owner, multi-row (23 scenarios). Duplicates: `JournalTraces` in `index.mjs:132-148` drives the bare upstream journal for the same model. Callers/importers: only the native aggregate `index.mjs:13,187` — **no per-model test**.

## How it is tied to product code
Compiles whole files: `NativeDeletionCoordinator`, `NativeOwnerReminderHost`, `NativeDeviceEnrollmentKey`,
`NativeNotificationDiagnostics`, `HostedInbox`, `HostedResultNotices`, `HostedStorageFault` (all exist) and three staged
patched upstream deletion classes + `NoticeOwner`. No slicing.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-26 | cost | `javaTraces` is called once **per scenario**: 23 separate `javac` runs of the same ~20 files. `javaTraceCampaign` compiles once and runs N. | `javaTraceCampaign('DeletionCoordinatorTraces.java', sources, scenarios.map(s=>[s]))`. | None |
| 2 | — | T4 / P | Only runner is the aggregate. | Add `test/quint-native-deletion-coordinator.test.mjs`. | High if aggregate goes first |
| 3 | 8-10 | follow-up (A3/C4) | Compiles `HostedInbox`, `HostedResultNotices`, `HostedStorageFault`; if C4 merges `HostedStorageFault` into `HostedDelivery` or removes hosted modes, update this list in the same change. | Track in the product change. | Low |
| 4 | 14 | A7 | `deletionScenarios` exported, no outside importer. CLI single-scenario mode only for manual debugging. | Unexport; keep CLI only if used. | None |
| 5 | 2, 27 | B5 / C3 | `fixtureSha256` local sha256 used only in an assumption string. | Drop with the receipt decision. | None |
| 6 | whole | D8 | No spaces, one-line arrays. | Formatter commit. | None |

## Proposed end state
One compile, one campaign run, its own test file, compiled-source list kept in step with the hosted/deletion product changes.
