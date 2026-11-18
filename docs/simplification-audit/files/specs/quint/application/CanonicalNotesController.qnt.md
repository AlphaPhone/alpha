# specs/quint/application/CanonicalNotesController.qnt
- Lines: 117 | Kind: Quint model (live, 6 runs) | Verdict: KEEP (owner question: mostly upstream behaviour)
- Covers: the canonical Notes controller over Alpha's resident record port: invalidations during a read or write coalesce into one GET, a write retires the in-flight read, stale or retired replies never publish, losing the owner hides the snapshot, cross-session events are ignored. Duplicates: `canonical-notes-draft.mjs`, `canonical-notes-mutation.mjs`, `canonical-notes-view.mjs` harnesses re-export the same controller for sibling models (`CanonicalNotes{Draft,Feedback,Mutation,View}`, §2.11); `test/canonical-notes-webview-abort.test.mjs`; Playwright `notes-photos-list-focus.spec.ts` via `test/browser/helpers/canonical-notes.ts`. Callers/importers: manifest (source `prototype/canonical-notes-controller.ts` plus three upstream `plugin-notes/src/client/*` files); harness `canonical-notes-controller.mjs` (136 lines, + `.md`) bundles the real module (`bundledSource`); `test/quint-canonical-notes-controller.test.mjs` **and** aggregate (index.mjs:26).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | sources | §2.9 | The local file is a 33-line subclass (port binding fence + invalidation listener); coalescing, stale-reply review and retire semantics belong to upstream `NotesController`/`NotesSnapshotState`. | Owner question: move the controller part upstream and keep only the binding-fence/session-event properties here. Until then KEEP. | Low |
| 2 | — | §2.11 | Five CanonicalNotes* models fragment one feature. | Consider merging with the sibling models when that chunk is reviewed; not decided here. | — |
| 3 | wrappers | T4 | Per-model + aggregate. | Per-model only. | None |

## Proposed end state
Unchanged model; harness keeps importing the real controller; one wrapper. Possible later split: upstream controller model upstream, local binding/session invariants here.
