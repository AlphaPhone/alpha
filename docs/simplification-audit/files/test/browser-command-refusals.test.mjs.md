# test/browser-command-refusals.test.mjs
- Lines: 73 | Kind: transplant (T2: slices `browserCommand` out of `prototype/browser-adapter.ts` and the view executor out of `prototype/agent-adapter.ts`, strips types, runs with `new Function` and stub tab state) | Verdict: DELETE; carry cases to REWRITE target `test/browser/journeys/browser.spec.ts`
- Covers: agent `browser-command` (back/forward/reload) refuses unsupported/unavailable commands with typed codes before any native dispatch. Duplicates: `test/browser-navigation-creation.test.mjs:34-44` slices the same region and asserts the same refusals (foreign tab, view change, unsupported `tabId`, empty history, single dispatch with `requiresReadback`). Callers/importers: none (node:test glob only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15 | T2, T10-like text anchors | Cuts code between literals `'    this.browserCommand = async'` / `'    this.browserNavigateApproved ='` and `'    connectionController.setViewInteractionExecutor('` / `'\n    });'`. Any reformat (D9 Prettier) breaks it. | Delete. | none |
| 2 | 17-24 | T2 | 10 free variables (`state`, `tabInfo`, `tabs`, `Capacitor`, `Browser`, ...) are faked; the test proves the slice works against its own fakes. | Delete. | none |
| 3 | 49-51 | T1/T5 | Asserts two strings are in an upstream constant list (`BROWSER_DISPATCH_FAILURE_KINDS` from `vendor/eliza`). Tests upstream, not behaviour. | Delete. | none |
| 4 | 26-62 | T4 | Same refusal cases as `browser-navigation-creation.test.mjs:38-44`. | Delete both; one journey. | none |
| 5 | 64-73 | T2 | View executor refusal (`Native view capability is unavailable`) when no live browser / non-browser view. | Carry as one journey case. | low |

## Proposed end state
File deleted. `journeys/browser.spec.ts` (Capacitor Browser bridge fake recording `command` calls, dev agent fixture issuing `browser-command`) carries:
1. agent Back with no history returns UNAVAILABLE and the bridge records no `command`;
2. agent Back after the user switched to Notes returns UNAVAILABLE, nothing dispatched;
3. a supported Back dispatches exactly once and the agent receipt says readback is required;
4. a bridge failure surfaces as an error (not a refusal).
