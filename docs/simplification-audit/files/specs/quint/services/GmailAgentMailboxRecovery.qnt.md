# specs/quint/services/GmailAgentMailboxRecovery.qnt
- Lines: 172 | Kind: Quint model, live (services manifest); sources are upstream `vendor/eliza/packages/app/src/runtime/managed-google-agent/gmail-agent-mailbox-host.ts` and `plugins/plugin-inbox/src/mailbox/managed-gmail-client.ts` plus Alpha `apps/app/src/runtime/cloud-protocol.ts` | Verdict: KEEP (upstream-lock lane + `cloud-protocol.ts`)
- Covers: agent-initiated Gmail mailbox mutations (archive/trash/mark): dispatch only with the exact review and a reconfirmed grant, a non-prepared durable receipt never resubmits, one recovery read after a lost dispatch, abort never reports success (6 runs, 5 invariants). Duplicates: none (InboxCoordinator/InboxDelivery model the owner composer path, not the agent mailbox host). Callers/importers: manifest; `refinement/services/gmail-agent-mailbox-recovery.mjs` + `-probe.mjs` (esbuild-bundled real host + client, child process); `test/quint-gmail-agent-mailbox-recovery.test.mjs`; aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Two of three sources are upstream; only `cloud-protocol.ts` is Alpha (the managed Google route table). The model is about the upstream host. | Path filter: `upstream.lock.json`, `patches/eliza/**`, `apps/app/src/runtime/cloud-protocol.ts`, `scripts/prepare-client-features.ts`, model + harness. Upstream follow-up. | None |
| 2 | — | D5 check | Managed Google is a Cloud *service* used by the resident agent (AP-03), not hosted-agent pairing; not covered by D5. | Keep. | — |
| 3 | harness | B5, T4 | Spawns a child Node process per run, hashes inputs, runs twice. | One runner; drop input-hash receipts. | None |

## Proposed end state
Model unchanged; harness already executes real modules; runs in the upstream lane and when `cloud-protocol.ts` changes.
