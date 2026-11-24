# apps/app/src/prototype/asset-manifest.json
- Lines: 308 | Role: provenance record (source URL, byte size, SHA-256) for the design-prototype HTML and 50 retained assets: fonts/logos under `apps/app/public` and 42 fixture photos under `prototype/fixtures/img/`. Pure data; no code reads it. | Verdict: **KEEP** (documentation data), move with the fixtures when they move to `dev/` (D6)
- Importers: none. `git grep asset-manifest` outside `docs/`: only `apps/app/src/prototype/README.md:35`. Not in Vite config, scripts, tests, manifests or `feature-parity.mjs`.
- Checked: all 50 `assets[].path` entries exist and their SHA-256 matches the file on disk (script run 2026-11-11), so the record is accurate.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | D6 | `"paths": "Relative to apps/app/public, except fixtures/img/* which is relative to apps/app/src/prototype…"` couples the record to the current fixture location. | When fixtures/images move to `apps/app/src/dev/` (research P21, D6), move this file beside `README` licensing notes (or into `docs/`) and update `paths` and the `fixtures/img/*` entries; if Wallet fixtures/images are deleted (D2), drop their entries. | None (no consumer). |
| 2 | — | A8 (README) | `prototype/README.md:33` says "The supplied references remain under the repository's `design` directory"; no `design/` directory exists. | Fix the README sentence when moving this file (not this file's text). | None. |

## Proposed end state
Unchanged content (licence/provenance record), relocated with the fixture images if they move; entries for deleted assets removed. ≈308 lines (less any deleted fixture entries).

## Verification
None needed (no consumer). If moved, update `apps/app/src/prototype/README.md:35` and re-run the hash check.
