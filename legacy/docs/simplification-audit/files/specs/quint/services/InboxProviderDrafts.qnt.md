# specs/quint/services/InboxProviderDrafts.qnt
- Lines: 189 | Kind: Quint model, live (services manifest; `components` InboxCoordinator, InboxDelivery); imports `RetainedInboxOperation` three times from `InboxCoordinator.qnt` | Verdict: KEEP
- Covers: provider (Gmail) draft create / replace / permanent delete: each request reviewed and sent once, provider references adopted only after a matching readback by the current owner, forwarded parts and bytes fixed by the review, non-atomic replacement uses the reviewed snapshot, uncertain retirement needs reload (13 runs, 7 invariants + three slot safeties). Duplicates: none. Callers/importers: manifest; `refinement/services/inbox-provider-drafts.mjs` + `inbox-provider-draft-ports.mjs` (reuse the real-module Inbox bundle from `inbox-coordinator-ports.mjs`); `test/quint-inbox-provider-drafts.test.mjs`; aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42-65 | C5 | Eight `xCurrent` actions repeat a three-way slot dispatch (same shape as the coordinator's `xFor`). Language limitation. | Keep. | — |
| 2 | 80, 115, 144-145, 156 | D8 | Several lines exceed 200 characters (`removePart`, `readReply`, `step`, `safety`). | Break onto multiple lines when touching. | None |
| 3 | manifest `sources` | P1 | Includes `upstream.lock.json` and `scripts/prepare-client-features.ts`, so any pin bump or client-features script edit re-runs this campaign. Justified (upstream `plugin-inbox` mailbox controllers are sources). | Keep. | — |
| 4 | runners | T4, B5 | Wrapper + aggregate; receipts. | One runner. | None |

## Proposed end state
Model unchanged; harness already imports real modules; one runner in the Inbox lane (with InboxCoordinator/InboxDelivery).
