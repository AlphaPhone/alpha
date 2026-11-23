# specs/quint/services/BrowserCloudRequestCustody.qnt
- Lines: 78 | Kind: Quint model, live (4 tests, 5 invariants); models a development-server bridge | Verdict: KEEP (D6 development surface)
- Covers: the local browser dev bridge (`scripts/browser-cloud-dev-bridge.ts`) owns an active request slot until its exact handler settles. Properties: a pending invocation owns its slot, an occupied slot has its invocation, a duplicate never dispatches, an aborted invocation cannot succeed (409), and a disconnected pending invocation is aborted. Sources: `scripts/browser-cloud-dev-bridge.ts` and `vendor/eliza/packages/app/src/runtime/managed-google-agent/managed-google-agent-broker.ts` (exist). Duplicates: none. Callers: harness `refinement/services/browser-cloud-request-custody.mjs` (46 lines, which spawns `browser-cloud-request-custody-probe.mjs` under `--import=tsx` and esbuilds the bridge), wrapper `test/quint-browser-cloud-request-custody.test.mjs`, aggregate. A baseline note `browser-cloud-request-custody-baseline.md` sits beside it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D6 / owner | The bridge is development-only (`files/scripts/browser-cloud-dev-bridge.ts.md`: KEEP dev, MOVE to `dev-server/`, delete the retired cli-session branch in A4). The modelled slot custody is on the live dev route. | KEEP. When the bridge moves, update the manifest `sources` path in the same commit (`quint-lib.ts:233` fails on a missing source). | medium (path) |
| 2 | harness | T9 | The harness spawns a child process with `tsx` rather than importing. That was needed to load the bridge with module hooks, and it is a notable runtime cost. | Accept for now. If the bridge exports its request handler factory, import it directly. | low |
| 3 | `-baseline.md` | §2.15 | A narrative baseline note beside the harness. | Delete it with the stale spec-tree docs. | none |

## Proposed end state
Model unchanged. Manifest path follows the bridge's move to `dev-server/`. The harness eventually imports the bridge's exported handler instead of spawning.
