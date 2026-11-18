# test/upstream-reachability.test.mjs
- Lines: 50 | Kind: tooling (`scripts/pinned-upstream-source.ts` reachability judgement) + spawn of `scripts/verify-upstream.ts --reachability-only` | Verdict: KEEP, MERGE into `test/tooling/upstream-pin.test.mjs` (drop the committed-record check)
- Covers: develop "reaches" the pin only when the recorded compare has no pin-only commits; missing/malformed/inconsistent/stale records never report reachable; mode defaults to warn, settable by flag or `ELIZA_UPSTREAM_REACHABILITY`; the committed record matches the current pin. Duplicates: test 4's record check repeats what `verify-upstream.ts` itself does in CI. Callers/importers: `npm test`. Scripts review proposes moving the reachability half into `scripts/verify-upstream.ts`; the import path changes with it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-44 | T4, P3 | Asserts the committed `scripts/ci/upstream-reachability.json` is not stale for `upstream.lock.json`: a data check that `npm run verify`'s upstream step already performs. | Drop. | none |
| 2 | 45-49 | T9 | Spawns `verify-upstream.ts` twice against the real repository state. | Keep one spawn (fail mode exit code) in the merged file. | none |
| 3 | 32-37 | T3 | Flag/env parsing table. | Keep, small. | none |

## Proposed end state
Cases 1-3 plus one spawned fail-mode check live in `test/tooling/upstream-pin.test.mjs`, importing from wherever the
reachability code lands (`verify-upstream.ts` after the scripts merge).
