# test/fixtures/observed-sms-adapter.mjs
- Lines: 28 | Kind: Quint refinement fixture (bundles real modules, injects an observation probe by text marker) | Verdict: PORT
- Covers: bundles the real `apps/app/src/prototype/sms-adapter.ts` + `apps/app/src/runtime/image-sms.ts` with regex-matched port stubs and inserts `globalThis.__smsDraftProbe` before the literal ` const sync=()=>{` so SMS send / MMS compose replays can read the held draft identities (`operationId`, `mmsOperationId`, `sent`, `mmsSent`, `active`, `body`). Duplicates: none (shared by the two harnesses). Callers/importers: `specs/quint/refinement/services/sms-send-replay.mjs:8,25`, `specs/quint/refinement/services/mms-compose-replay.mjs:8,17` (both loaded through `specs/quint/refinement/services/forward-replays.mjs`; tests `test/quint-sms-send.test.mjs`, `test/quint-mms-compose.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-25 | T10 / D7 | Text-anchored seam: asserts exactly one ` const sync=()=>{` in `sms-adapter.ts` (today at line 66) and splices code before it. Any reformat (DECISIONS D9 Prettier) or rename breaks it. Probe reads closure locals `operationId, mmsOperationId, sent, mmsSent, active, body`. | Export a read-only `smsDraftSnapshot()` (or return it from the adapter's existing install function) from `sms-adapter.ts`, then bundle without the `onLoad` rewrite. | Medium: needs one small product export; must not leak into production UI. |
| 2 | 9, 14-19 | — | Port stubs are keyed by regex over import specifiers. Acceptable bundler-level injection; keep. | None. | — |
| 3 | 4 | C3 | Imports `repositoryRoot` from `identity-comms-traces.mjs` though `scripts/quint-lib.ts` also exports it. | Use one source of `repositoryRoot`. | Low |

## Proposed end state
~20 lines: one esbuild bundle of the two real modules with port stubs, no source rewriting; the harnesses read `smsDraftSnapshot()` from the bundle's exports.
