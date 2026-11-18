# specs/quint/refinement/services/gmail-agent-mailbox-recovery-probe.mjs
- Lines: 252 | Kind: Quint refinement probe (imports real `gmailAgentMailbox` and `createManagedGoogleClient` from the prepared `.eliza/client-features` projection and Alpha's `productionCloud` from `cloud-deployment.generated.ts`; in-memory transport) | Verdict: KEEP
- Covers: Gmail mailbox mutation via the managed Google agent: scope/turn binding, prepare/review digest checks, grant recheck, single dispatch, one readback after lost reply, abort handling, prior receipts never resubmitted (45 traces). Live product path: `managed-google-agent-host.ts:395` → shipped through `scripts/native-google-product-host.ts` / `native-google-host-artifact.ts`. Duplicates: none found in host tests. Importers: `gmail-agent-mailbox-recovery.mjs` (child process).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-5 | D13 | Deep relative imports `../../../../.eliza/client-features/packages/app/...`. | Use the `@eliza/*` alias once it exists (stage F). | Low |
| 2 | 1-252 | — | Behaviour lives almost entirely upstream (`gmail-agent-mailbox-host.ts`, `managed-gmail-client.ts`); the Alpha part is `cloud-protocol.ts` / the production API origin. | Treat as upstream-pin + `cloud-protocol.ts` lane. | Low |
| 3 | 7 | — | Network closed via `globalThis.fetch` throw: correct isolation; no credentials (opaque reference only). | Keep. | — |
| 4 | 207-224 | — | Table-driven scenario list is compact and readable. | Keep. | — |

## Proposed end state
Unchanged apart from alias imports; runs when upstream pin, `cloud-protocol.ts` or `cloud-deployment.generated.ts` change.
