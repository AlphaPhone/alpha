# specs/quint/refinement/application/photos-trash.mjs
- Lines: 131 | Kind: Quint refinement harness (bounded-component; reuses `photos-window.mjs`'s esbuild bundle of the real `camera-adapter.ts` with closure-observer splices) | Verdict: KEEP (inherits the PORT of `photos-window.mjs`)
- Covers: native Photos Trash read serialization, provider-event coalescing, hidden/disposed publication fences, loaded-marker invalidation on hide and reload on return (live model `specs/quint/application/PhotosTrash.qnt`, manifest line ~1774). Duplicates: runs twice — `test/quint-photos-trash.test.mjs` and the application aggregate (`index.mjs:75` via `test/quint-application-refinement.test.mjs`) (T4). No Playwright or instrumentation test drives native Trash hide/resume races. Callers/importers: `index.mjs:75`, `test/quint-photos-trash.test.mjs:4`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A7 | `assert` is imported and never used. | Drop the import. | None |
| 2 | 27-28 | B5 | `captureSources([driver, ...extraSources])` then `compilePhotosWindow([driver, ...extraSources])`, which captures the same paths again (photos-window.mjs:54-55). | Remove line 27; the compile step already binds the sources. | None |
| 3 | 95 | C3 | Inline `new Promise(resolve => setImmediate(resolve))` where `support.mjs` exports `tick`. | Use `tick()`. | None |
| 4 | 45-122 | D9 | One loop with an `if/else if` ladder of 7 branches keyed on scenario name strings; scenario intent is hidden in branch conditions. | Table of `[name, async f => {...}]` drivers, same as `renderer-digest-queue.mjs`. | Low |
| 5 | 8-24 | T10 (inherited) | `f.inspect()` reads 7 Trash closure locals through the `__ports.inspect` splice in `photos-window.mjs`; `s.token`/`s.more` depend on the `__ports.trashInfo` literal-replace splice. | Follows the PORT in `photos-window.mjs`. | Medium |

## Proposed end state
- ~90 lines: a scenario table driving `createPhotosWindowFixture(compiled, {holdTrash: true})`.
- Imports only `tick`, `call`, `trace`, `checkpoint`, `boundInputs` from `support.mjs`.
- Run once (per-model test or the family runner, not both).
- Reads Trash state through whatever read-only inspector `camera-adapter.ts` exports after the photos-window PORT.
