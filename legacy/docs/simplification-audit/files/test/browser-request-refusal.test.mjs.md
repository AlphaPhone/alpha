# test/browser-request-refusal.test.mjs
- Lines: 38 | Kind: integration-ish (real `runtime/device-actions.ts` loaded by `test/fixtures/device-action-policy.mjs` via `browser-source.mjs`, with `listing`/`card`/`mutation` overridden) | Verdict: MERGE into `test/integration/device-actions.test.mjs` (with `direct-browser-grounding.test.mjs`)
- Covers: a browser-navigate proposal whose destination the owner did not author is blocked locally (no card, no owner decision sent, no auto-reject); explicit URLs/sites keep the card; a stale/rebound session cannot publish a block; old/unbound/workflow proposals are not auto-rejected; a changed digest re-evaluates; the policy cache is bound to credential+session. Duplicates: `test/direct-browser-grounding.test.mjs` (same fixture, same grounding policy), `browser-receipt-order.test.mjs:125-132` (ungrounded proposal stays pending). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10 | T3 | Overrides three instance methods (`listing`, `card`, `mutation`) of the real class: monkey-patching (D7 shape). | In the merged file, use the dev agent HTTP fixture instead of method overrides where possible. | low |
| 2 | 15 | T7 | 6 generated tests for refused texts, 4 for accepted. | Two table-driven tests. | none |
| 3 | 15 | naming | Test title says "legacy current unrequested destination": not A1 legacy data, just an older proposal shape. | Rename in merge. | none |
| 4 | 36-37 | — | Cache keyed by credential/session tuple: security-relevant, keep. | Carry. | none |

## Proposed end state
Merged into the device-actions integration file: one table of authored texts → blocked/carded, plus stale session, workflow/old proposals untouched, digest change re-evaluated, cache rebound on credential change. `device-action-policy.mjs` fixture survives.
