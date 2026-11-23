# test/action-message-presentation.test.mjs
- Lines: 119 | Kind: unit (esbuild bundle of real `runtime/action-message-presentation.ts`; plus real `DeviceActions` from `fixtures/device-action-policy.mjs` with a stub journal) | Verdict: REWRITE as `journeys/chat.spec.ts` cases + MERGE receipt cases into `test/integration/device-actions.test.mjs`
- Covers: chat collapses an action card, its protocol notice and its device receipt into one truthful result line, and cold history only restores a fully matched browser receipt. Duplicates: partly `test/browser-receipt-order.test.mjs`, `test/system-notice-collapse.test.mjs`, `scripts/test-connection-history.ts`; no Playwright spec asserts "Opened example.com." (grep). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-22, 40-119 | T3 | Pure projection function fed hand-built message rows (`render()` fakes the view model fields `c`, `cGeneric`, `displayText`). The rows are not what the shell produces. | Rewrite the user-visible cases as a chat journey. | Medium: this is the only coverage of the dedup rules. |
| 2 | 24-38 | T3 | Cold-history receipt restore drives real `DeviceActions` with a stub journal `get`; the refusal matrix (unknown status, applying phase, foreign owner/enrollment, changed URL, wrong hash) is security relevant. | Merge into the device-actions integration file with the real journal adapter in memory. | Medium |
| 3 | 2 | - | A full esbuild bundle at import time (~0.5 s). | Gone with rewrite. | - |

## Proposed end state
Journey cases in `journeys/chat.spec.ts` (helper: typed `test.extend` harness with the development agent and a synthetic
browser bridge): (a) "open example.com" shows one answer, live and after reload; (b) a failed browser receipt stays visible;
(c) a queued clock action and its later receipt show one result. The cold-history refusal matrix (lines 36-38) moves into
`test/integration/device-actions.test.mjs`. The remaining projection cases (offscreen reply, quoted user text) are dropped.
