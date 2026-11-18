# specs/quint/refinement/application/canonical-notes-feedback.mjs
- Lines: 170 | Kind: Quint refinement harness (esbuild bundle of the real `CanonicalNotesUi` with three imports replaced by ports) | Verdict: KEEP (minor PORT of the port stubs)
- Covers: Notes feedback classifier in `apps/app/src/prototype/canonical-notes-ui.ts` (`phase`, `reviewPending`, `failure` and a failed-interaction latch) across read failures, uncertain delete/restore/update, discard, commit and retirement. Duplicates: none for this classifier. Callers: `test/quint-canonical-notes-feedback.test.mjs`, `index.mjs`; `compileCanonicalNotesUi` / `createCanonicalNotesUiFixture` imported by `canonical-notes-view.mjs` and by the host test `test/canonical-notes-draft-copy.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-21 | T10 (specifier pins) | Replaces `../runtime/connection-ui`, `../daily`, `../runtime/text-share` by import-specifier regex with inline JS stubs exporting `agentPendingText`, `agentAvailabilityNotice`, `connectionController`, `DailyApps`, `copySelectedText`. Not text slicing, but the stubs must match export names and break on moves (stage F) or when `canonical-notes-ui.ts` imports another module. | PORT: give `CanonicalNotesUi` its three collaborators as constructor options (`{copy, daily, clipboard}`) with production defaults in the caller; the harness then imports the module unpatched. | L |
| 2 | 29-30, 106 | B4 | Replaces `globalThis.window` with an `EventTarget` and restores it. | Keep (Node has no window); move to a shared `withGlobals` helper. | L |
| 3 | 84-98 | — | Wraps instance hooks (`controller.hooks.*`, `needsReview`, `discardDraftAndReload`, `editor.hooks.committed`) to record actions. Instance wrapping, not source patching; acceptable. | None. | — |
| 4 | 43-52 | — | `observe()` reads many private fields (`baseRows`, `rowsValue`, `idleWaiters`...) used by the view harness, not by this model. | Move the wide observer into the shared notes fixture module; this harness only needs the four feedback fields. | L |
| 5 | 28 | C5 | Fixture factory exported from a harness. | Shared notes fixture module. | L |

## Proposed end state
`CanonicalNotesUi` takes its collaborators as options; the harness bundles it with no resolve plugin.
Shared fixture module (controller, editor, UI factories) used by the five Notes harnesses and `canonical-notes-draft-copy.test.mjs`.
