# specs/quint/refinement/services/inbox-coordinator-ports.mjs
- Lines: 317 | Kind: Quint refinement fixture (esbuild IIFE bundle of the real Inbox adapter, provider controls, drafts, `InboxOperation`, attachment reviewer and unsaved reader, run in a `vm` realm with fake storage, Gmail client, connection controller, native attachment and DailyApps ports) | Verdict: KEEP, SIMPLIFY
- Covers: the shared executable Inbox fixture. Duplicates: Playwright Inbox specs fake the same Cloud client in-page (tests-browser); none in this folder. Importers: `inbox-coordinator.mjs`, `inbox-cleanup.mjs`, `inbox-provider-draft-ports.mjs`, `inbox-provider-drafts.mjs`, and (by text copy) `inbox-list-paging-ports.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-26, 46-50 | T10-lite | Stubs are matched by import **basename** (`args.path.split("/").at(-1)`), so any product module named `daily`, `alpha-client`, `connection-ui` anywhere in the graph is replaced. Fragile across renames and moves (stage F). | Key stubs by resolved absolute path (`apps/app/src/runtime/native-connection.ts` ...) and fail when a key resolves nowhere. | Low |
| 2 | 22 | A7 | Stub `google-connect-flow` matches no module: `apps/app/src` has no `google-connect-flow` file and nothing imports it (grep). | Delete the entry. | Low |
| 3 | 16 | D5 | Stub `dev-profile` forces `browserDevProfile=false`; with the flag zoo collapsed into `build-flags.ts` this key changes. | Re-key with the flag consolidation. | Low |
| 4 | 262-290 | D2 | `mount()` fakes the `Shell` prototype contract (`vset`, `S`, `openView`, `renderVals`) so `installInboxCloudAdapter(Shell, views)` can monkey-patch it. Breaks when the adapter pattern is replaced with explicit modules (R5/D2). | Keep until the adapter split; then mount the Inbox module through its new explicit interface. | Medium |
| 5 | 54-55, 57-60 | B5 | `expectedInputs` / `rebuildInboxDriver` recompile and compare the input list to prove the graph did not change between hashing and execution. | Drop with the receipt cleanup (keep one build). | Low |
| 6 | 291-313 | — | `createPair` wires the real provider controls and drafts together: genuine integration. | Keep. | — |

## Proposed end state
Same fixture, path-keyed stubs without the dead `google-connect-flow` entry, a single build per process, and (after the adapter split) a mount that uses the Inbox module's explicit API.
