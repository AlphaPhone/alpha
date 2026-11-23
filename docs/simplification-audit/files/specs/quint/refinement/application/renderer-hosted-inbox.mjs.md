# specs/quint/refinement/application/renderer-hosted-inbox.mjs
- Lines: 224 | Kind: Quint refinement harness, import-based (`bundledSource('apps/app/src/runtime/digest-inbox.ts')`, fault-injecting storage, held provider results/ack, notice port) | Verdict: KEEP
- Covers: hosted workflow digest delivery — store row, index it, offer the notice, then ACK; replay after each storage fault position; lost notice/ACK replies retried; refused ACK cannot overwrite a stored digest; abort before results/during ACK; renderer-fallback scope vs native inbox on verified Android (live model `RendererHostedInbox.qnt`, manifest ~l.3095). Duplicates: none at this granularity (the browser notice ledger has its own model). Callers/importers: `index.mjs`, `test/quint-renderer-hosted-inbox.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | "Hosted" here means hosted workflow results (production), not hosted-agent pairing (D5). Keep. | None. | — |
| 2 | 174-177 | — | Asserts `createDigestInbox({android:true,nativeReady:true})` returns the native inbox: real routing check. | Keep. | — |
| 3 | 174, 218 | B5 | Double source capture (as in `renderer-digest-queue.mjs`). | One capture. | None |
| 4 | 22-27, 49-53 | — | Fault classes keyed on error message strings it throws itself. Fine (test-local). | None. | — |
| 5 | 9-27 | C5 | `ids`, `runId`, payload helpers overlap `renderer-digest-queue.mjs`, `hosted-digest-refresh.mjs`, `hosted-digest-mutation.mjs`. | Optional shared `digest-fixtures.mjs` when those files are reviewed together. | Low |

## Proposed end state
Unchanged harness with a single capture; optionally shares digest payload helpers with its three sibling harnesses.
