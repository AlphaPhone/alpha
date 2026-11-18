# specs/quint/legacy/check-view-refresh.mjs
- Lines: 125 | Kind: script (standalone Quint/TLC/Apalache runner for 4 historical view-refresh models) | Verdict: DELETE
- Covers: runs typecheck/test/simulate/symbolic/TLC compare/properties/temporal over `CameraSession`, `PhotosLibrary`, `NotesView`, `FilesBrowser` per `view-refresh-configurations.json`, writing a receipt to `test-results/quint-view-refresh/`. Duplicates: `scripts/check-quint.ts` / `quint:verify` (which already typechecks, tests and simulates every admitted model, legacy included), `quint:compare`/`quint:temporal`. Callers: none. `git grep check-view-refresh` → only its own README examples (`legacy/README.md:169-173`) and self-reference in `inputPaths`; listed as a manifest `sources` entry for NotesView/PhotosLibrary; no package.json script, workflow or test runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | No caller anywhere; manual-only runner for historical models. | Delete. | None |
| 2 | 11-31 | C3 | Hand-written `--name=` arg parser and validation (14th twin of the scripts arg parsers). | Goes with deletion. | — |
| 3 | 33-36, 89-99, 117-123 | B5 | Hashes inputs before and after every checker run and writes receipts with `inputsUnchanged`; evidence ceremony. | Goes with deletion. | — |
| 4 | 45-82 | C3 | Own process-group spawn/timeout/kill/output-cap wrapper duplicating the quint runner in `scripts/quint-lib.ts`. | Goes with deletion. | — |

## Proposed end state
Deleted with `view-refresh-configurations.json` (whose only other reader is `test/quint-tla-inventory.test.mjs:13`, itself in the C17 delete set). `sha256`/`detectedCounterexample` stay in `scripts/quint-lib.ts` for live users.
