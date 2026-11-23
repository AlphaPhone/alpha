# specs/quint/refinement/services/inbox.mjs
- Lines: 68 | Kind: Quint refinement harness (imports the real `apps/app/src/runtime/inbox-operation.ts` directly) | Verdict: KEEP; add a per-model test wrapper before the services aggregate goes
- Covers: `InboxDelivery.qnt` — durable prepare before review, refusal of a competing operation, single dispatch after the durable `dispatching` phase, outcome mapping, restart without re-dispatch, and owner retirement rejecting a late review. Duplicates: `inbox-provider-drafts.mjs` drives the same `InboxOperation` through the full composer (prepare/confirm/restart/unknown outcome) — the component-level cases here are the narrower subset; `inbox-coordinator.mjs` covers restart/unknown outcome at coordinator level. Callers/importers: only `services/index.mjs:14,76` (aggregate). `grep -rn "inbox.mjs\|inboxRefinement" test` finds no per-model test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 / coverage | Runs only inside the 40-minute `quint-services-refinement` aggregate. If the aggregate is deleted (research §2.4), InboxDelivery loses its only replay. | Add `test/quint-inbox-delivery.test.mjs` (5 lines) calling `inboxRefinement()` and asserting `passed`. | medium if forgotten |
| 2 | 30-31, 67 | B5 | `sources` + `captureInputs` + `driverHashes` only feed the receipt. | Drop with `check-traces.mjs` simplification. | low |
| 3 | 30 | B5 | Lists `apps/app/src/runtime/inbox-attachment.ts` as a source but never exercises attachments. | Drop from the list (or the list entirely, finding 2). | none |
| 4 | 67 | B5 | Assumptions prose in the receipt. | Short header comment instead. | none |

## Proposed end state
Same 60-odd lines, no input-hash bookkeeping, one header comment naming what runs (real `InboxOperation`, CAS store and controlled Gmail client). Run by its own `test/quint-inbox-delivery.test.mjs`; `InboxDelivery.qnt` stays live (it is also imported by `InboxProviderDrafts.qnt`, manifest lines 1131/1216).
