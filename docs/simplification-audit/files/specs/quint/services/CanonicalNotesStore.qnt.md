# specs/quint/services/CanonicalNotesStore.qnt
- Lines: 191 | Kind: Quint model, live (16 tests, 6 invariants); **upstream sources** (`vendor/eliza/plugins/plugin-notes/src/{store,service,interact,types,validation}.ts`, `.eliza/client-features/plugins/plugin-notes/src/client/notes-api.ts`) | Verdict: KEEP
- Covers: two physical plain notes, one serialized writer and an independent stale view. Includes create dedupe, edit/remove/restore/clear with an expected revision, conflict/refused/lost acknowledgement, held replies, a rival writer, stop and restart. `legacyInit` (lines 18-22, tests 170-172) seeds a schema-3 document with mixed timestamps to check the upstream store's timestamp fallback and raw-order tie-break. Duplicates: the application models `CanonicalNotes{Controller,Draft,Feedback,Mutation,View}` cover the renderer side. This is the store. Callers: harness `refinement/services/notes-store/index.mjs` (148 lines, esbuild bundle of the upstream store via `notes-store/module.mjs`, which hashes every loaded file), wrapper `test/quint-canonical-notes-refinement.test.mjs`, aggregate; `notes-store/fixture.mjs` is also used by `test/notes-{logical-revision,pending-editor,replay-identity,store-lifecycle}.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-22, 170-172 | A1 check | "legacy" here means the **upstream** plugin-notes store's handling of older per-note timestamps inside the current schema-3 document. It is not a renderer legacy reader (D1 targets `apps/app` and Android readers). Upstream code still ships it. | KEEP. Rename `legacyInit` → `mixedTimestampInit` to avoid deletion by association, and remove it only when upstream drops the fallback. | medium (name invites wrong deletion) |
| 2 | — | §2.9 | Upstream-only sources. | Select it on upstream pin changes. Owner Q4 asks whether it moves upstream. | low |
| 3 | — | — | The harness binds through esbuild imports with no slicing. Good. | — | none |

## Proposed end state
Unchanged model (one rename), run by its existing wrapper, in an upstream-pin lane.
