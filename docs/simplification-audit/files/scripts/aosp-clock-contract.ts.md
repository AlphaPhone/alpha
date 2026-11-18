# scripts/aosp-clock-contract.ts
- Lines: 2 | Kind: pass-through re-export of `vendor/eliza/packages/os/scripts/android/aosp-clock-handlers.mjs` | Verdict: DELETE
- Covers: nothing of its own. Duplicates: the upstream module. Callers/importers: `scripts/stage-aosp.ts:13` (`clockProductRequirement`), `scripts/verify-aosp-clock.ts:4` (`verifyAospClockHandlers`), `test/aosp-release-signing.test.mjs:19`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | D4/A7 | Two-line re-export shim. | Import from upstream in the two scripts and the test; delete the file. | None |

## Proposed end state
Deleted; three import lines point at the upstream module.
