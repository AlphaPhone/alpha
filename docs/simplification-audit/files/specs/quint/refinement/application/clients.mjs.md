# specs/quint/refinement/application/clients.mjs
- Lines: 86 | Kind: Quint refinement harness (imports real `AlphaClient` via `sourceModule`) | Verdict: KEEP (needs its own per-model test)
- Covers: `AlphaClient` (`apps/app/src/runtime/alpha-client.ts`) for two models: `AssistantConversation` (send/cancel/sensitive-view retirement, proposal consume-once, late dispatch result cannot revive a proposal, automatic workflow survives navigation/cancel) and `Application` (owner switch retires the in-flight request). Duplicates: `composer-send.mjs` also drives the real `AlphaClient` but through the composer; no overlap on proposals. Callers: `index.mjs` only (exports `assistantConversation`, `application`); run solely by the aggregate `test/quint-application-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | B4 | `captureSources([...])` runs at import time (module side effect). | Call inside each exported function. | L |
| 2 | 7-8 | C5 | Local `checkTraces` wrapper that appends fixed sources; same wrapper in `contracts.mjs`. | Use `boundInputs({sources})` directly. | L |
| 3 | 18-22 | — | Reads private fields `client.epoch`, `proposals`, `consumed`, `activeWorkflow`. Acceptable; upstream-independent (Alpha file). | None. | — |
| 4 | — | Coverage risk | Only the aggregate runs these two models. Deleting the aggregate (recommended) leaves them unexecuted. | Add `test/quint-assistant-conversation.test.mjs` and `test/quint-application.test.mjs` (or one `test/quint-alpha-client.test.mjs` running both) before deleting the aggregate. | M |
| 5 | 72-86 | — | `Application` model campaign is a single trace of one property. | Keep (cheap); could be one more schedule in the AssistantConversation campaign if the models merge. | L |

## Proposed end state
Two exported campaigns with their own test wrapper; no import-time side effects; shared `boundInputs` call.
