# scripts/test-cloud-personal-flow.ts
- Lines: 49 | Kind: integration of retired code (`DevelopmentCloudAgentProtocol.personal()` over loopback HTTP) | Verdict: DELETE
- Covers: personal-Cloud dedicated-agent activation/adoption quotes, job polling and cutover. Duplicates: `test/cloud-personal-protocol.test.mjs` (also deleted). Callers/importers: `test/adapter-contracts.test.mjs` list.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A3 / D5 | Exercises `cloud-personal-protocol.ts` and `development-cloud-agents.ts`, both on the D5 delete list (delete-candidates A100, cross-file-actions U-R5 names this script). | Delete with the product files; remove from `adapter-contracts.test.mjs`. | L |
| 2 | 13-20 | D8 | Server handler is one 1,500-char statement chain. | Gone. | L |

## Proposed end state
Deleted. No product behaviour loses coverage (no production build reaches personal Cloud).
