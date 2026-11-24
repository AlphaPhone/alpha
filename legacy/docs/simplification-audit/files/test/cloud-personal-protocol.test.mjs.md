# test/cloud-personal-protocol.test.mjs
- Lines: 44 | Kind: unit (real `CloudPersonalProtocol` through the Vite-aware `fixtures/browser-source.mjs` loader, synthetic transport) | Verdict: DELETE
- Covers: the retired personal/Dedicated Cloud agent protocol reads a disconnected or migrating target as `provisioning` / `invalid-response` and never POSTs activation while reading. Duplicates: `test/browser/cloud-personal-onboarding.spec.ts`, `scripts/test-cloud-personal-flow.ts`, `scripts/test-connection-history.ts` (personal parts). Callers/importers: `npm test` glob (`scripts/run-node-tests.ts`); imports `test/fixtures/browser-source.mjs` (17 importers, survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-44 | A3 / D5 | `apps/app/src/runtime/cloud-personal-protocol.ts` is the hosted personal-Cloud path (`delete-candidates.md` A100, research a–m line 415: production reaches it only through `testMocksEnabled`). DECISIONS D5 deletes it. | Delete this file together with the module, `cloud-personal-setup.tsx`, `cloud-personal-intent.ts`, `development-cloud-agents.ts`. | None once D5 lands; until then it is the only host test of that module. |
| 2 | 8-22 | T3 | Single class with every port stubbed; three cases. | No carry-over. | None |

## Proposed end state
File deleted in the same commit as the personal-Cloud renderer code (D5 / A4). No replacement: the feature is excluded by the PRD ("No hosted-agent pairing").
