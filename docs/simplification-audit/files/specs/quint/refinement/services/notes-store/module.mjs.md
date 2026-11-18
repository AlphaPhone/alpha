# specs/quint/refinement/services/notes-store/module.mjs
- Lines: 43 | Kind: harness/test support (esbuild bundle of the real upstream Notes owners with the authenticated core-state patch applied) | Verdict: KEEP (optional MOVE with `fixture.mjs`)
- Covers: compiles `AgentRuntime`, `NotesStore`, `NotesService`, `interact`, `createNotesClient`, providers from `vendor/eliza` and `.eliza/client-features`, asserts each patched file matches `coreStatePatch` before-hash, binds compiled input hashes, imports via `data:` URL. Duplicates: the same "esbuild bundle + metafile hash capture + data: import" pattern exists in `support.mjs:sourceModule`, `identity-comms-traces.mjs:218`, `scan-review-dialogs.mjs:16`, `plan-admission-ports.mjs:13` (C5). Importers: `notes-store/index.mjs:4`, `test/notes-store-lifecycle.test.mjs:4`, `test/notes-logical-revision.test.mjs:6`, `test/notes-replay-identity.test.mjs:7`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | C3 | Private sha256 hex helper. | Shared hash helper (`scripts/lib` or `refinement/support.mjs`). | Low |
| 2 | 36 | T1-ish | `assert.doesNotMatch(bundle, /file-type/)` inspects generated output text to prove an optional dependency was not bundled. It checks a build property of the harness bundle, not product behaviour. | Delete the assertion; `external: true` for `file-type` already guarantees it is not inlined. | Low |
| 3 | 37-40 | B5 | Hashes inputs, then re-asserts patch input hashes and compile hashes: evidence ceremony required by `checkTraces` receipts. | Keep while receipts exist; drop if receipts go (ci-and-formal §2.8). | — |
| 4 | 13-35 | C5 | Fourth copy of the bundle-and-import mechanism. | Fold into one `bundleSource({entry, stubs, onLoad})` in `refinement/support.mjs`. | Low |

## Proposed end state
~25 lines calling the shared bundler with the core-state patch hook. Still the single loader of real Notes source for
the harness and the Notes integration test.
