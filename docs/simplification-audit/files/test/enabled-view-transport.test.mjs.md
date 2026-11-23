# test/enabled-view-transport.test.mjs
- Lines: 39 | Kind: integration (real `createLocalAgentDevHandler` over a real HTTP server; synthetic upstream) | Verdict: MERGE into `test/dev-local-agent-bridge.test.mjs`
- Covers: the dev bridge forwards view-profile GET and conditional POST with the owner bearer and the existing device headers (`X-Eliza-Device-Id/Key/Capabilities`) unchanged. Duplicates: `test/automations-transport.test.mjs` covers bridge route admission for automation routes the same way. Callers/importers: `npm test`. Research row 726 is right.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T9 | tsx self-respawn (third copy in this chunk). | Gone in the merged tsx-loaded suite. | None. |
| 2 | 16-24 | C4 | Fifth copy of the pairing fake. | Shared fixture. | None. |
| 3 | 12-39 | - | Header forwarding on the device-profile route is unique; one case. | Carry as a row of a "forwarded routes keep device headers" table. | - |

## Proposed end state
One row in `test/dev-local-agent-bridge.test.mjs`.
