# test/fixtures/device-action-policy.mjs
- Lines: 8 | Kind: integration helper (real `device-actions.ts` via `loadBrowserModule`; seeds `proposals` and replaces `approve`/`card`) | Verdict: MERGE into the device-action/browser-view integration support
- Covers: constructing a real `DeviceActions` with seeded proposals and a recording `approve`. Duplicates: none. Callers/importers: `test/action-message-presentation.test.mjs`, `agent-action-preferences.test.mjs` (research: delete, C), `browser-receipt-order.test.mjs` (delete, C), `browser-request-refusal.test.mjs`, `direct-browser-grounding.test.mjs` (merge into browser-view integration), `photo-library.test.mjs` (merge into camera-photos integration).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T3 | Overwrites private state (`f.proposals`) and methods (`card`, `approve`) on the real instance, so the approval path under test is the fake one. | Feed proposals through the class's public sync input and fake only the network approval port. | Medium |
| 2 | 2 | - | Top-level await bundle at import time. | fine | - |

## Proposed end state
A `deviceActions()` factory in the browser-view integration support module, using public inputs. Survives because three of six importers are MERGE (browser-request-refusal, direct-browser-grounding, photo-library).
