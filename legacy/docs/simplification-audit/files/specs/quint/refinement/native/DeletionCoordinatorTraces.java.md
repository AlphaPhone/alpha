# specs/quint/refinement/native/DeletionCoordinatorTraces.java
- Lines: 441 | Kind: Quint refinement harness (Java, real Alpha deletion host + patched upstream coordinator/journal, stubs from `deletion-platform.mjs`) | Verdict: KEEP (SIMPLIFY the driver: compile once)
- Covers: model `DeletionJournal` (live): deferred deletion of calendar events and reminders: stage with undo window, expiry, durable claim before provider call, exactly-once dispatch across retries/restarts, write faults before/after commit, schedule failure, owner/session change pausing, multi-row isolation, reminder effects reconciliation and note-link retirement; 24 scenarios. Duplicates: `JournalTraces.java` covers the upstream `DeferredDeletionJournal`/`DeletionDeadline` alone; host tests `test/native-deletion-review-fence.test.mjs` (see its report) touch the owner fence.
- Callers/importers: `deletion-coordinator.mjs` (`generateDeletionCoordinatorTraces`, `checkDeletionCoordinator`), aggregate `index.mjs:189`. Uses `DeletionTestPorts.java`.

## How it is tied to product code
Compiles whole app files `NativeDeletionCoordinator`, `NativeOwnerReminderHost`, `NativeDeviceEnrollmentKey`,
`NativeNotificationDiagnostics`, `HostedInbox`, `HostedResultNotices`, `HostedStorageFault`, and the patched upstream
`DeferredDeletionCoordinator`/`DeferredDeletionJournal`/`DeletionDeadline`/`NoticeOwner` from `preparePatchedNative`.
Reflection: `NativeDeletionCoordinator.instance` (reset for the restart scenario). No product text slicing.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver `generateDeletionCoordinatorTraces` | P3 (cost) | `deletionScenarios.flatMap(name => javaTraces(...))` runs `javac` on the full source set once **per scenario** (24 compilations of ~15 files + platform). `java.mjs` already offers `javaTraceCampaign` (compile once, run N). | Use `javaTraceCampaign('DeletionCoordinatorTraces.java', sources, deletionScenarios.map(s => [s]))`. | None; same JVM-per-scenario isolation. |
| 2 | 366-438 | D9 | 24-way `switch` mapping scenario names to six methods with boolean flags; the driver repeats the same name list. | Optional: a `Map<String,Runnable>` in Java and let the driver ask the harness for its scenario list (`list` arg) so the names live once. | None |
| 3 | sources | D5/MERGE | Compiles `HostedStorageFault.java`, which its product report merges into `HostedInbox.java`. | Drop the path from `deletionProductSources` in the same commit as that merge. | None |
| 4 | 239-240 | T8 | Poll `Thread.sleep(1)` until worker is BLOCKED (5 s cap). | Acceptable. | None |
| 5 | campaign | T4 | Only the aggregate runs it (no per-model wrapper) — fine. | None | None |

## Proposed end state
Same harness and 24 scenarios, compiled once per campaign. Source list
follows the `HostedStorageFault` merge.
