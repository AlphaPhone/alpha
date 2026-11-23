# test/browser-navigation-creation.test.mjs
- Lines: 152 | Kind: transplant (T2; four slices of `prototype/browser-adapter.ts` run in `vm` with fake `state`, `shell`, `Browser`, plus the real upstream `BrowserTabSession` and `parseBrowserAddressInput`) | Verdict: DELETE; REWRITE selected cases as `test/browser/journeys/browser.spec.ts`
- Covers: address-bar navigation and tab creation races (close/switch while native creation is pending, tab limit, cancellation), agent history commands, committed-page history, and the approved-navigation path (HTTPS only, credentials refused, cancel closes orphan, deferred presentation). Duplicates: `browser-command-refusals.test.mjs` (lines 34-44 here); `browser-receipt-order.test.mjs` slices the same `navigate` + `browserNavigateApproved`; `specs/quint/refinement/application/browser-surface-navigation.mjs` / `browser-tab-lifecycle.mjs` (Quint replays of the same adapter regions); Playwright `browser-navigation.spec.ts` (address navigation, Back/Forward/Reload/Stop). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7, 34, 46-47, 72 | T2, T10 | Anchors: `'  async function navigate('`, `'  async function command('`, `'    this.browserCommand = async'`, `"  void Browser.addListener('stateChanged',"`, `').then((value:any)=>{listener=value;})'`, `'    this.browserNavigateApproved ='`, `'    // Identity only:'` (a comment). `ALPHA_BROWSER_ADAPTER_SOURCE` env knob nothing sets (T9). | Delete. | none |
| 2 | 15-25 | T5 | Address classification (localhost alias, time-like `10:30`, `site:`, credentials) is upstream `parseBrowserAddressInput`. | Upstream follow-up for the parser; carry 3 user-visible cases to the journey. | low |
| 3 | 34-44 | T4 | Duplicate of `browser-command-refusals.test.mjs`. | Delete. | none |
| 4 | 94-152 | T7 | 2 platforms x 9 parameterised tests over the same harness: 18 tests for one function. | Journey keeps web preview only; native via bridge fake. | low |
| 5 | 99-100, 110 | T1-like | `typeof h.approved==='function'` asserts the slice parsed. | Delete. | none |

## Proposed end state
Delete. `journeys/browser.spec.ts` (web preview + Capacitor Browser bridge fake that can hold `navigate`/tab creation) carries:
1. typing `localhost:3000` opens `https://localhost:3000/`; `10:30` and `site:example.com cats` search; `https://user:pw@example.com` is refused with a message and nothing loads;
2. closing a tab while it is still being created never navigates it;
3. opening a new tab at the 8-tab limit shows "Tab limit" and closes the half-created tab;
4. private and failed/unconfirmed pages add no history; a committed page adds one entry;
5. agent-approved open: HTTP/credential URLs refused without creating a tab; cancelling during creation closes the orphan; Browser view opens on the new tab only after dispatch.
