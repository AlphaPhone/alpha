# test/lemma-checker.test.mjs
- Lines: 56 | Kind: tooling (same pattern as `lemma-check.test.mjs`: temp repo, stub `lsc`, fake `dafny`, spawns `scripts/check-lemma.ts` 13 times in one test) | Verdict: MERGE into `test/lemma-check.test.mjs` (then `test/quint/tooling.test.mjs`)
- Covers: same contract as `lemma-check.test.mjs`. Unique cases: Dafny version with `+<40 hex>` build metadata accepted, `-rc1` and `+unreviewed` refused, `0 verified` fails, `lemma {:axiom}` in the proof file refused, deleted `.dfy.gen` fails. Duplicates: `test/lemma-check.test.mjs` (version gate, exit 2, verifier failure, drift, unlisted annotated file, unread contract, `//@ assume`). Callers/importers: `npm test` glob; imports `repositoryRoot` from `scripts/quint-lib.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-56 | T4 | One test with 13 sequential spawns and shared mutable fixture state; a failure mid-way hides the remaining cases. | Move the 5 unique cases into the sibling as separate tests; delete this file. | Low |
| 2 | 30 | T9 | `LEMMA_REQUIRE_BACKEND:'0'` env knob plus four `LEMMA_FIXTURE_*` knobs read only by the stub. | Fold into the sibling's fixture options. | Low |

## Proposed end state
File deleted after its five unique cases move to the single Lemma checker test.
