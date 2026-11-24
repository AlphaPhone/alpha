# test/aosp-product-lock.test.mjs
- Lines: 108 | Kind: tooling (`aospProductLockProblems` on temp copies; spawns `scripts/stage-aosp.ts`); test 1 is a committed-state check | Verdict: MERGE tests 2-3 into `test/tooling/aosp.test.ts`; DELETE test 1
- Covers: the Cuttlefish product lock is refused field by field (unset, placeholder, foreign lock, wrong package, missing brand field) and `stage-aosp --production` refuses an incomplete lock before reading the APK while `--development` ignores it. Duplicates: `test/aosp-release-signing.test.mjs` tests 2 and 4 are the same pattern for the Pixel 10a descriptor. Callers/importers: `npm test`; imports `scripts/stage-aosp.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-57 | T1 | Asserts committed descriptor literals, that retired files do not exist (`pixel10.lock.json`, `aosp.lock.json`: tombstone checks, A8) and that the committed lock is still incomplete (fails the day the product is completed). | Delete. | none |
| 2 | 59-84 | - | Table of refusals over a complete fixture: real behaviour. | Keep. | none |
| 3 | 86-108 | - | Spawns the real CLI twice; real integration of the gate ordering. | Keep. | none |
| 4 | 16-31 | C5 | `completeLock` and the `refuse` helper are twins of `completeRoot`/`refuse` in `aosp-release-signing.test.mjs`. | One shared "complete descriptor copy" helper in the merged file. | none |

## Proposed end state
Two cases in `test/tooling/aosp.test.ts` ("product lock"): refusal table and CLI gate, sharing the descriptor-copy helper
with the Pixel 10a production descriptor cases.
