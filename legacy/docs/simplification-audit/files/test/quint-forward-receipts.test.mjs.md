# test/quint-forward-receipts.test.mjs
- Lines: 63 | Kind: tooling test of the refinement receipt guard (`observedReplay`, `recordComparedObservation`, `captureReplayInputs` in `specs/quint/refinement/observed-replay.mjs`) | Verdict: MERGE into `test/quint/tooling.test.mjs` (cases 1, 2, 5)
- Covers: a receipt cannot be minted from summary counters alone, from a mismatched observation, from drifted generated inputs, or with counts that disagree with recorded observations. Duplicates: `test/quint-refinement-harness.test.mjs` and `quint-state-inventory.test.mjs` test the same plumbing (tests-host research F). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-33,58-63 | T5 | Cases 1, 2, 5 guard the property that makes every replay meaningful (a passing summary without real comparisons is refused). | Keep in the quint tooling file while the receipt mechanism exists. | Low |
| 2 | 35-56 | B5 | Cases 3-4 test input hashing and generated-source snapshots: evidence ceremony that B5 removes. | Delete with the hashing. | None |
| 3 | 10-20 | — | Uses a NativeStreamBridge prefix purely as a label. | Neutral model name. | None |

## Proposed end state
Three cases in `test/quint/tooling.test.mjs`; the file is deleted. If the runner drops receipts altogether, delete all five.
