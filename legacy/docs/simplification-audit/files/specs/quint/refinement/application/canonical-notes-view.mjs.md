# specs/quint/refinement/application/canonical-notes-view.mjs
- Lines: 149 | Kind: Quint refinement harness with source-text patching of product code | Verdict: PORT
- Covers: `CanonicalNotesUi` collection projection (`apps/app/src/prototype/canonical-notes-ui.ts`): base rows, draft overlay rows, open/blank/trash, settle-waiter admission and drain, owner masking. Duplicates: none at this depth (Notes journeys in `test/browser` cover list rendering only end to end). Callers: `test/quint-canonical-notes-view.test.mjs`, `index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-38 | T10 | esbuild `onLoad` reads `canonical-notes-ui.ts` as text and splices `__ports.observe(...)` calls at five minified anchors, each asserted unique: `this.baseRows=snapshot.notes.map(note=>this.row(note,snapshot.revision));`, `this.rowsValue=rows;this.hooks.paint();`, `resume=>this.idleWaiters.push(resume)`, `this.idleWaiters=[];for(const resume`, `this.openValue=null;this.trashValue=[];}`. All five match today; every one breaks under Prettier (D9) or any edit to those statements. | PORT: add one optional `observe?(event: 'base'|'paint'|'wait'|'drain'|'retire', payload)` hook to `CanonicalNotesUi`'s existing `hooks` object (it already has `paint`, `review`, `committed`) and call it at those five points; or observe after the existing `hooks.paint()` callback and at controller snapshot callbacks, dropping the separate `wait`/`drain` events in favour of reading `idleWaiters.length` at checkpoints. The first is exact; the second needs a model tweak (waiter identities). | M |
| 2 | 87 | — | Reuses `compileCanonicalNotesUi` with an extra plugin (see feedback report for the three port stubs). | Ported together. | L |
| 3 | 137 | T8 | `await new Promise(resolve => setTimeout(resolve, 10))` fixed sleep to let the settle loop finish. | Wait on `ui.idleWaiters.length === 0` / command settlement. | L |
| 4 | 93-139 | D9 | 30 scenario names, nested condition chains. | Scenario table. | L |

## Proposed end state
`CanonicalNotesUi` exposes an observer hook (no-op in production) or the harness observes via existing hooks; no source patching.
Scenario table; no fixed sleep; shared notes fixture module.
