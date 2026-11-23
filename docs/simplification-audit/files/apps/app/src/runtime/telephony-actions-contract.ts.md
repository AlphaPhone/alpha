# apps/app/src/runtime/telephony-actions-contract.ts
- Lines: 10 | Role: named re-export of upstream `packages/contracts/src/telephony-actions.ts`. | Verdict: DELETE (import upstream via alias)
- Importers: `prototype/agent-adapter.ts:22`, `runtime/phone-context.ts:8`. (`telephony-executor.ts:15` imports the upstream `plugin-assistant/.../telephony-actions-contract.ts`, a second upstream path for the same contract.)
- Text/path pins: `feature-parity.mjs`. (`scripts/prepare-client-features.ts:288` projects the upstream file.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-10 | D4 | pure shim; 7 of 10 names unused outside (`validateTelephonyAction`, all six `*_CAPABILITY` constants). | Importers use `@elizaos/contracts/telephony-actions`; delete. | Low |
| 2 | — | C7 | two upstream homes used for one contract (`packages/contracts/.../telephony-actions.ts` here, `plugin-assistant/.../telephony-actions-contract.ts` in the executor). | Pick `@elizaos/contracts/telephony-actions` everywhere. | Low |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
`test/telephony-agent-flow.test.mjs`, `npm run verify`.
