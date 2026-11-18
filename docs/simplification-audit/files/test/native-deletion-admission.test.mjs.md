# test/native-deletion-admission.test.mjs
- Lines: 109 | Kind: source-text (~40 regexes and index comparisons over vendor `DeferredDeletionCoordinator.java`, `PhotosPlugin.java`, `PermittedPhotosPlugin.java`, `OwnedAlbums.java` and Alpha `DeletionWorker`, `NativeDeletionCoordinator`, `AlphaDeletionsPlugin`, `AlphaCalendarPlugin`, `AlphaHostedResultsPlugin`, `AlphaPhotosPlugin`, `agent-adapter.ts`, `reminder-adapter.ts`, `deletions.ts`, contract `deletion-window.ts`) | Verdict: DELETE
- Covers: deletion reconcile isolation, no owner reads under the coordinator lock, refusal statuses, worker-thread staging, notice fences, photo review gating. Duplicates: Quint `specs/quint/refinement/native/deletion-coordinator.mjs` (executes the pinned coordinator with Alpha ports), `test/shared-deletion-window.test.mjs` (per its own header), Photos instrumentation (`PhotosTrashInstrumentedTest`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-29, 72-73, 83-109 | T1 / T5 | Pins upstream source text, including exact whitespace (`\n {4}try \{`). | Delete. | Low |
| 2 | 30-81 | T1 | Pins Alpha Java/TS expressions (`if(retired||reviewEpoch!=epoch||...)`), including a test-shaped wrapper in `deletions.ts` kept only so this regex matches (D7). | Delete; let the `reminderDeletionRefusal` wrapper be simplified. | Low |

## Proposed end state
File deleted. Behaviour stays covered by the deletion-coordinator refinement and the deletion instrumentation suites.
