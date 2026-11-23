# test/connection-contracts.test.mjs
- Lines: 13 | Kind: wrapper (T9) spawning `scripts/test-remote-protocol.ts` (161 lines) and `scripts/test-connection-history.ts` (471 lines) through `test/fixtures/child-suite.mjs` | Verdict: DELETE wrapper; split the two child suites (see below)
- Covers: `RemoteProtocol` pairing/auth/conversation/truncate over a loopback HTTP fixture, and a broad development-controller + Cloud protocol sweep (`test-connection-history.ts` imports ~25 runtime modules, plus a `vm` transplant of `connection-ui.tsx` via `strip-types` and `workflow-device-bindings`). Duplicates: `test/browser/connection-boundaries.production.spec.ts:411-412` explicitly defers revocation/history to these two scripts. Callers/importers: `npm test` glob; the scripts have no other caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-13 | T9 | The test is a process launcher; the real tests live in `scripts/`. Each child re-execs itself under `--import=tsx` (second process). | Delete the wrapper; tests live under `test/integration/`. | Low |
| 2 | 7 | A3 / D5 | `test-remote-protocol.ts` exercises `RemoteProtocol` pairing (`/api/auth/pair`). PRD: no hosted-agent pairing; `cross-file-actions.md` moves `RemoteProtocol` to `dev/` as the D5 harness, and `remote-protocol.ts:297-338` conversation helpers to `runtime/agent-conversation.ts`. | Delete the pairing/revocation cases with the class (C4). Keep only the conversation helper cases (truncate path, room id) and move them into `test/integration/connection-cloud.test.ts` once the helpers move. | Medium: until C4 lands, the D5 harness has no other host coverage. |
| 3 | 8 | T2 + mixed | `test-connection-history.ts` mixes real imports (cloud-sign-in, cloud-protocol, alpha-client, resident-recovery, subscription-entitlement) with a sliced `connection-ui.tsx` and dev-only `development-cloud-agents.ts`. | Move the real-import cases into `test/integration/connection-cloud.test.ts`; delete the sliced and `cloud-personal-*`/development-agent cases (C4). | Medium |

## Proposed end state
Wrapper deleted. `scripts/test-remote-protocol.ts` deleted with `RemoteProtocol` (C4/D5), its conversation-helper cases moved.
`scripts/test-connection-history.ts` dissolved: real-module cases (Cloud protocol errors, sign-in, entitlement, alpha-client
session attach) become cases of `test/integration/connection-cloud.test.ts`; transplant and personal-Cloud cases deleted.
Update the comment at `test/browser/connection-boundaries.production.spec.ts:411`.
