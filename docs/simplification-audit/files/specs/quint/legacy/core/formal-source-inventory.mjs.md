# specs/quint/legacy/core/formal-source-inventory.mjs
- Lines: 89 | Kind: harness support (lives in legacy tree, imported by live harnesses) | Verdict: SIMPLIFY + MOVE (delete `authenticateFormalSources` and `materializeHistoricalFormalSources`; move `materializeHistoricalSources` only if the MMS/SMS historical witnesses stay)
- Covers: (a) `authenticateFormalSources` checks that every TLA/cfg at a Git revision is allocated to a registered Quint translation and hash-matches; (b) `materializeHistoricalSources` copies vendor files from a historical Git revision into `.eliza/quint-historical/<rev>/` after hash check, writing a manifest, so harness source-capture can hash them; (c) `materializeHistoricalFormalSources` = (b) bound to `legacy/core/source-inventory.json`.
- Callers/importers: `authenticateFormalSources` — only `test/quint-tla-inventory.test.mjs` (T5). `materializeHistoricalFormalSources` — `refinement/services/core-runtime/module.mjs:49`, `refinement/services/task-service/module.mjs:51` (live loaders; they only map paths named by legacy harnesses' extra TLA sources), `legacy/core/source-support.mjs`, `legacy/core/check-interactive-task-refinement.mjs`. `materializeHistoricalSources` — `refinement/native/mms-dispatch.mjs:36`, `sms-dispatch.mjs:46` (historical raw-pin regression witnesses via `mms-historical-sources.json`), and listed as a captured source path string at `mms-dispatch.mjs:50`, `sms-dispatch.mjs:65`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-35 | B5, T5 | `authenticateFormalSources` is inventory ceremony used only by a test of itself. | Delete with `test/quint-tla-inventory.test.mjs`. | None |
| 2 | 37-40 | P6 | `materializeHistoricalFormalSources` exists only to feed historical upstream TLA bytes into legacy harness receipts. After legacy deletion the live loaders call it with no TLA paths, making it a no-op. | Delete; drop the call in both `module.mjs` loaders. | Low |
| 3 | 43-89 | B5, B3 | `materializeHistoricalSources` does symlink checks, atomic temp-rename publish, hashing and a provenance manifest purely so source-capture hashes are "bound". | If the owner keeps the MMS/SMS historical counterexample (ci-and-formal §3 open question), move it to `specs/quint/refinement/native/historical-sources.mjs` and cut the manifest/symlink paranoia; otherwise delete with that probe. | Low |
| 4 | 3, 26 | C3 | Local sha256 and `git()` wrappers duplicate the ~40 script copies. | Use the shared `scripts/lib` helper if the function survives. | None |

## Proposed end state
Legacy copy deleted. At most one ~30-line `materializeHistoricalSources` (git cat-file + hash check + write) lives under `refinement/native/` for the MMS/SMS historical probe, if that probe is kept; live service loaders no longer import anything from `specs/quint/legacy`.
