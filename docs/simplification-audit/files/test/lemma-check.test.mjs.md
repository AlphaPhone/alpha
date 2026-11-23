# test/lemma-check.test.mjs
- Lines: 172 | Kind: tooling (copies `scripts/check-lemma.ts` + `scripts/quint-lib.ts` into a temp repo with a stub `lsc` and fake `dafny` binaries, spawns it, reads `test-results/lemma/check.json`); research's "A, regex" bucket is wrong | Verdict: KEEP, absorbing `test/lemma-checker.test.mjs`; MOVE to `test/quint/tooling.test.mjs` (formal tooling family)
- Covers: `npm run lemma:check` (part of `npm run verify` and `.github/workflows/lemma-check.yml`) never reports a skipped or failed proof as passed: missing backend skips (exit 0, `passed:false`) or exits 2 under `LEMMA_REQUIRE_BACKEND=1`, only Dafny 4.11.0 qualifies, stale `.dfy.gen` and edited generated lines fail without rewriting the tree, unread annotations / unlisted annotated files / `assume` fail, verifier errors fail, missing `lsc` fails. Duplicates: `test/lemma-checker.test.mjs` tests the same script with a second stub (overlap: version gate, require-backend exit 2, verifier failure, drift, unlisted file, unread contract, assume). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T4 | Two files, two stub `lsc` implementations, for one 'is the proof gate honest' contract. | Merge: keep this file's fixture (clearer, per-case `t.after` cleanup) and add the cases unique to `lemma-checker`: Dafny `4.11.0+<40-hex>` accepted, `4.11.0-rc1` and `4.11.0+unreviewed` refused, zero verified conditions fails, `{:axiom}` refused, missing `.dfy.gen` fails. | Low |
| 2 | 88-90 | B4 | `assert.equal(result.receipt.passed,false)` written twice. | Drop one. | Low |
| 3 | 63-64 | B5 | Asserts the receipt file (`test-results/lemma/check.json`); the receipt has a CI consumer? `lemma-check.yml` uploads it. Keep only fields a consumer reads (`status`, `passed`). | Trim assertions on `lemmascriptVersion`/`dafnyVersion`/`files` unless the workflow reads them. | Low |
| 4 | 44-45 | C7 | Copies `quint-lib.ts` because `check-lemma.ts` imports `repositoryRoot`-style helpers from it; a Lemma checker depending on the Quint library is a coupling. | Note for scripts chunk: move the shared root/receipt helpers to `scripts/lib/`. | Low |

## Proposed end state
One "lemma checker" block in `test/quint/tooling.test.mjs` (or kept as `test/lemma-check.test.mjs` until the tooling
folder exists): the 8 current cases plus the 5 unique cases from `lemma-checker.test.mjs`, one stub `lsc`, one fake
dafny factory. `test/lemma-checker.test.mjs` deleted.
