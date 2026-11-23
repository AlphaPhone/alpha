# scripts/fixtures/workflow-host.ts
- Lines: 102 | Kind: manual probe support (pairs with a running local agent profile and calls workflow routes) | Verdict: DELETE with the six unwired workflow host probes
- Covers: helpers for probes that pair with an already-running agent in `~/.local/share/alphaphone/<profile>` and call `/api/workflow/*`, writing JSON "host reports". Duplicates: workflow protocol behaviour is covered by `scripts/test-workflow-protocol.ts` (wired through `test/adapter-contracts.test.mjs`) and `test/browser/workflow*.spec.ts`. Callers/importers: `scripts/test-reviewed-workflow-host.ts`, `test-workflow-approval-crash.ts`, `test-workflow-approvals-host.ts`, `test-workflow-cancel-recovery.ts`, `test-workflow-lifecycle-host.ts`, `test-workflow-metadata-host.ts`. None of those six has a caller: a repo grep finds them only in each other and in a comment in `scripts/start-reviewed-workflow-agent.ts:5-8`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | file | A7 | Support for six probes that no package script, workflow or test runs. | Delete with them. | L |
| 2 | 65-81 | A3 | Pairs through `RemoteProtocol.pair` with a pairing code: the paired-remote path DECISIONS D5 retires for products. | Goes with the file. | L |
| 3 | 97-102 | B5 | `writeHostReport` writes a JSON receipt per run that nothing reads. | Goes with the file. | L |
| 4 | 32,41 | — | Reads and writes the developer's real home profile (`~/.local/share/alphaphone`), unlike every wired test. | Goes with the file. | L |

## Proposed end state
Deleted together with the six `scripts/test-*-host.ts` probes and the comment block in `start-reviewed-workflow-agent.ts:4-8`. Whether
`start-reviewed-workflow-agent.ts` itself stays is a separate question: it is modelled by `specs/quint/services/ReviewedWorkflowLauncher.qnt`
and its probe, so keep it unless that model is retired with it (D20 rule: code and model go together).
