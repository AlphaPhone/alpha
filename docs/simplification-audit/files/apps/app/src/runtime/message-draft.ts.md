# apps/app/src/runtime/message-draft.ts
- Lines: 68 | Role: pure reducer for one SMS thread's composer draft and the agent's suggested/asked reply (owner text always wins; suggestions retire on newer inbound messages). Modelled in `specs/quint/native/MessageThreads.qnt`. | Verdict: KEEP
- Importers: 1 (`prototype/sms-adapter.ts`). Text/path pins: `specs/quint/native/manifest.json:4411`, `specs/quint/refinement/native/telephony.mjs:32,35`, `test/message-draft.test.mjs:5,67`, `test/support/feature-parity.mjs:557`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 62-64 | — | `reviewFinished(state, result)` handles `'failed'`/`'unknown'` identically (keep state); documented intent. | Keep. | — |
| 2 | — | — | No dead code, no duplication, consistent formatting. | None. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DraftState` | type | 7-18 | Quint `MessageThreads` state | stays |
| `emptyDraft` | helper | 19 | — | stays |

## Proposed end state
Unchanged (68 lines). A model of how the other runtime files should look.

## Verification
Quint `MessageThreads` + `telephony.mjs` refinement; Messages suggestion Playwright journey.
