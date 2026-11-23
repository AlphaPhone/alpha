# specs/quint/legacy/core/source-support.mjs
- Lines: 70 | Kind: Quint harness support library (esbuild-bundles vendor core, hashes inputs, swaps in historical fragments, text-splices observer seams) | Verdict: MOVE the live parts to `specs/quint/refinement/support.mjs` (SIMPLIFY), then DELETE this file with `legacy/`
- Covers: `root`, `tick`, `deferred` (generic async helpers); `bundleVendorCore` (bundle `vendor/eliza` TS via esbuild, check every bundled vendor file equals the git blob at the pinned revision, optionally replace files with historical bytes from `source-inventory.json`); `observeFile` (esbuild onLoad that `String.replace`s literal text in a vendor source file to insert `__quint` observation calls). Duplicates: `deferred()` re-implemented in ~20 harness files and `tick` in many (ci-and-formal §4: `gate` 37×, `deferred` 20×, `flush` 23×); sha256→hex (C3); `captureInputs` already in `refinement/check-traces.mjs`. Callers/importers (`git grep source-support`):
  - Live: `refinement/application/browser-deletion-poll.mjs:5` (`deferred`), `refinement/application/google-access-publication.mjs:5` (`deferred`), `refinement/application/resident-liveness.mjs:8` (`deferred`, `tick`), `refinement/services/current-approval-service.mjs:5` (`bundleVendorCore`, `deferred`, `observeFile`, `tick`). Three of them also list this file path as a hashed driver source (`browser-deletion-poll.mjs:12`, `google-access-publication.mjs:11`, `resident-liveness.mjs:13`).
  - Legacy: 7 `legacy/core/check-*.mjs` harnesses (action-settlement, approval-service, embedding-sql, interaction-session, interactive-task-traces, room-handler-queue, task-scheduling).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-18 | C3 / C5 | `root`, `tick`, `deferred` are generic helpers living in the historical tree; ~20 harnesses re-declare `deferred`. | Move to `specs/quint/refinement/support.mjs`; replace the local copies there in the same change. | None. |
| 2 | 19-38, 44-46 | P6 / A1 | `historicalRuntime` path: `materializeHistoricalFormalSources`, archived-fragment onLoad plugin, `compiledHistorical` hashing, `historicalRevision`. Used only by legacy `check-embedding-sql-refinement.mjs` (historical counterexample). | Drop on move. The live `bundleVendorCore` takes `(vendorPath, exports, driverSources, plugins)` only. | Low; `test/quint-core-approval-service.test.mjs:8` asserts `historicalRevision` and must drop that line. |
| 3 | 42-51 | B5 | Every bundled vendor file is re-read via `git cat-file blob` at HEAD and compared to the captured hash ("exact upstream blob"). The submodule is pinned by `upstream.lock.json`; a dirty vendor checkout is already forbidden by AGENTS.md and checked elsewhere. One `git` spawn per bundled file. | Replace with a single `git -C vendor/eliza diff --quiet HEAD -- <paths>` (or drop; `captureInputs` already records hashes). | Low; loses a per-file self-check of a pinned submodule. |
| 4 | 59-69 | T10 | `observeFile` splices vendor source text at literal strings (`source.split(before).length === 2`). The live `current-approval-service.mjs:11` patches `approval.ts` this way: a text-anchored harness on upstream code. | Port: ask upstream (D14 follow-up) for an injectable timer/port seam on `ApprovalService`, or observe through the public API and injected `setTimeout`; until then keep `observeFile` in `refinement/support.mjs` as the single text-seam helper. | Medium: upstream renames break it silently only as an assertion failure (it does fail loudly). |
| 5 | 54-58 | — | `instantiate` evaluates the bundle with `new Function` and a `__quint` global; fine, but only the approval harness needs it. | Keep with the move. | — |
| 6 | 20 | C3 | Own `git rev-parse` spawn; `git()` wrapper duplicated across scripts/specs. | Use a shared helper if `refinement/support.mjs` gets one. | — |

## Proposed end state
`specs/quint/refinement/support.mjs` exports `root`, `tick`, `deferred`, `observeFile` and a ~25-line
`bundleVendorCore(vendorPath, exports, driverSources, plugins)` without the historical-fragment branch or the
per-file blob re-check. The four live harnesses import from there (and the three that hash this path list the new
path instead). Local `deferred`/`tick` copies across refinement harnesses are replaced. This file is deleted with
`specs/quint/legacy/**`. Long term, `current-approval-service.mjs` stops text-splicing `approval.ts` once upstream
exposes an observation seam.
