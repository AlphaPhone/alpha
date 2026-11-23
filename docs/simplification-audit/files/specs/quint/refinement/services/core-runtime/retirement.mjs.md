# specs/quint/refinement/services/core-runtime/retirement.mjs
- Lines: 125 | Kind: Quint refinement harness (runs real `RuntimeRetirement` from `vendor/eliza`) | Verdict: KEEP (upstream-only; path-scope)
- Covers: work publication before callback, drain waits for pending/reentrant/spawned work, rejected work vs recorded failure, failure persistence, concurrent drains — against `CoreRuntimeRetirement.qnt`. Duplicates: partially exercised inside `lifecycle.mjs` and `shutdown.mjs` (both construct a retirement), but not its own schedules. Callers/importers: `test/quint-core-retirement.test.mjs`, `refinement/services/index.mjs:32` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P6 / §2.9 | Upstream-only code (`retirement.ts`, `errors.ts`); changes only on pin bump. | Upstream-pin lane; upstream follow-up (D14). | Low |
| 2 | 13-17 | T10-lite | Reads private `retirement.pending`/`failures`. Upstream internal names. | Accept. | Low |
| 3 | 6-7 | C3 | Local `action`/`flush`. | Shared support. | None |
| 4 | 121-125 | T9 | Unused CLI tail. | Delete. | None |

## Proposed end state
~115 lines, shared helpers, upstream-pin lane, one caller.
