# specs/quint/refinement/application/support.mjs
- Lines: 73 | Kind: shared harness support (source capture/provenance, esbuild bundle loader, text transplant `sourceContext`, memory store, `tick`/`deferred`, trace builders) | Verdict: KEEP (shrink); MERGE shared parts into `specs/quint/refinement/support.mjs`
- Covers: helpers for ~85 application harnesses plus `services/lifeops-scheduled-task-route.mjs`, `services/personal-assistant-scheduled-task-custody.mjs`, `test/fixtures/browser-external-handoff.mjs`, `test/fixtures/previous-notes-source-opening.mjs`, `test/quint-photos-owned-album.test.mjs`. Duplicates: `services/support.mjs` (`deferred`), `services/notes-store/fixture.mjs` (`deferred`), `shell-model-traces.mjs` (`tick`, `root`), `browser-model-traces.mjs` (`loadBundled` ≈ `bundledSource`), legacy `source-support.mjs` (`deferred`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43-52 | T2 | `sourceContext` type-strips files, deletes `import`/`export` by regex and evaluates them in a VM: the transplant mechanism behind `share-panel-admission`, `vault-coordinator`, `workflow-request-recovery-admission`, `surfaces#developmentSurfaces` and others. | Delete once callers use `bundledSource`/`loadBundled` (real imports with esbuild stubs). | M |
| 2 | 10-27 | B5 | `captureSources`/`boundInputs` hash every input at import time and refuse unknown sources; pre-captures `test/quint-application-refinement.test.mjs` and `index.mjs` (aggregate to be deleted) plus `prepare-client-features.ts`. Evidence ceremony with no consumer beyond receipts. | Drop if receipts go (ci-and-formal §2.8 owner question); at minimum remove the aggregate paths. | M |
| 3 | 28-31 | T10 | `read()` exists to feed text slicing. | Delete with the last slicing caller. | L |
| 4 | 32-42 | C3 | `sourceModule`/`bundledSource` duplicate `browser-model-traces.mjs` `loadBundled` and `vault-coordinator.mjs` `sharedModule`. | One bundling loader with optional stubs and `define`. | L |
| 5 | 61-66 | C3 | `tick`/`deferred` duplicated in 4+ files across families. | Move to `specs/quint/refinement/support.mjs` with `between`/`gate`/`flush` per ci-and-formal. | L |
| 6 | 53-60, 67-73 | — | `memoryStore`, `checkpoint`, `call`, `trace` are small and used. | Keep. | — |

## Proposed end state
A family-neutral `refinement/support.mjs` with `bundle(path, {stubs, define})`, `tick`, `deferred`, `memoryStore`,
`trace/checkpoint/call`; no `sourceContext`, no `read`, no provenance capture unless receipts survive.
