# scripts/check-lemma.ts
- Lines: 119 | Kind: formal-method runner (LemmaScript extraction/gen-check + Dafny proof gate) | Verdict: KEEP + SIMPLIFY (drop receipt/rehash/frozen-restore; keep inventory and trust gates)
- Covers: every source in `LemmaScript-files.txt` has a registered `//@ verify` function, no unregistered annotations exist, no `assume`/axiom/`verify false` is admitted, generated Dafny matches the committed `.dfy`/`.dfy.gen`, and Dafny 4.11.0 proves every file (required in CI via `LEMMA_REQUIRE_BACKEND=1`). This is the LemmaScript gate the owner wants at 100 %. Callers/importers: `package.json` `lemma:check` (inside `npm run verify`); workflows `lemma-check.yml:50` (path-filtered on `apps/app/src/**`, `scripts/check-lemma.ts`) and `browser.yml:69-74` (through `verify`, with `LEMMA_REQUIRE_BACKEND=1`) - **Dafny proofs run twice per qualifying PR** (P3, research 2.13); tests `lemma-check.test.mjs`, `lemma-checker.test.mjs` (copy the script into a temp repo and run it: tooling tests, T5); docs `specs/lemma/README.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-28, 108-118 | B5 | JSON receipt `test-results/lemma/check.json` with start/final input hashes; only readers are the two tooling tests and CI artifact upload. | Delete the receipt and both hash passes; print results; exit code is the evidence. | Low; tooling tests change. |
| 2 | 50, 82-88 | B5 | `frozenProofs` restore: if `lsc gen-check` rewrote a committed proof, the script writes the old bytes back, then fails. | Run `lsc gen-check` and then `git diff --exit-code specs/lemma` (or compare in memory without writing back). | Low. |
| 3 | 6, 45, 52 | B3 | Refuses any CLI argument; asserts `proof-dir === 'specs/lemma'`; asserts LemmaScript `0.6.6` (pinned by `package.json:113` and the lockfile). | Drop the three self-checks. Keep the Dafny 4.11.0 check (external binary, not lockfile-pinned). | None. |
| 4 | 40-43, 54-59, 64-80 | - | Inventory completeness, `//@ verify` presence, trust counting, contract-read check: real gates on the proof base. | Keep. | - |
| 5 | 100-101 | - | Requires one "verified, 0 errors" line per file: catches an empty proof run. Keep. | - | - |
| 6 | whole | P3 | Dafny runs in both `browser.yml` (verify) and `lemma-check.yml`. | Run Dafny in `lemma-check.yml` only (path filter `apps/app/src/**`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`); `verify` runs `lemma:check` without requiring the backend (generation check only). | Low; CI config. |
| 7 | docs | A8 | `specs/lemma/README.md:91` says this script sets `DOTNET_ROLL_FORWARD=LatestMajor` itself; it does not (no occurrence in the file). | Fix the README (or set the variable in the workflow). | None. |

## Proposed end state
~60 lines: read inventory, check annotations/trust/contracts, `lsc extract` per file, `lsc gen-check` + diff check,
`lsc check` when Dafny 4.11.0 is present (required in the Lemma lane). No receipt, no rehash, no write-back. Tooling
tests `lemma-check.test.mjs` and `lemma-checker.test.mjs` merge into one test of the CLI's refusal cases (unregistered
annotation, assume, stale generation) or are deleted if the owner treats the gate's own CI run as sufficient.
