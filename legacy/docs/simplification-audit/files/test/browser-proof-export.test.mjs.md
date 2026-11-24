# test/browser-proof-export.test.mjs
- Lines: 168 | Kind: tooling (spawns the real `scripts/ci/export-browser-proof.ts` against a temporary git repo fixture). Research row "A: reads source/config text" is wrong: it reads no product source. | Verdict: KEEP, SIMPLIFY; move to `test/tooling/ci-proof-export.test.mjs`
- Covers: CI artifact export (`browser.yml:98` renderer, `resident-prepare.yml:54` worker) uploads only allow-listed, manifest-bound files and never private files (`.env`, credentials, cookies, keys), symlinked ancestors are refused, rejection report holds hashes not contents, the nine reviewed PDF.js licence notices pass. Duplicates: none. Callers/importers: none (node:test glob). Script callers: `.github/workflows/browser.yml:98`, `.github/workflows/resident-prepare.yml:54`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-35 | B5 | `totalBytes` equals sum of file sizes and `readBytes > totalBytes`: tests the exporter's own receipt bookkeeping (identity.json). Grep of `scripts/` and `.github/` finds no reader of `identity.json` `totalBytes`/`readBytes` (it is only uploaded). | Delete case and, in the script, the unused byte counters. | | low |
| 2 | 102-108, 162-168 | T7 | Parameterised loops (4 suffixes, 5 paths) generate 9 near-identical spawns. | One test per rule with a table, one spawn per table row is acceptable but merge into two tests (allowed vs refused). | none |
| 3 | 11-27 | runtime | Each case runs `git init` twice + a node subprocess (~0.3-0.5 s each, ~20 cases). | Share one fixture repo per describe, reset payload between rows. | low |
| 4 | 14-15 | C3 | Local `git()` helper with hardened env: one of the 17 `git()` twins. | Use `scripts/lib` git helper (or a `test/support/git-fixture.mjs`) once it exists. | none |
| 5 | 40-43, 71-82, 126-143 | — | Refusal of private files and unmanifested worker files: real release-safety rule (uploaded artifacts are visible to anyone with repo read). | Keep. | none |

## Proposed end state
Kept as the one test of the proof exporter, under `test/tooling/`. Two table-driven tests per mode: "allowed payload exports exactly these files (renderer incl. PDF notices; worker incl. compiler source family and declaration-named cookie/credential `.d.ts`)" and "refused payload fails, names the path, never writes contents (symlinked ancestor, `.env`, credential json, unlisted worker file, raw TS outside compiler)". Byte-total case removed with any unused receipt field.
