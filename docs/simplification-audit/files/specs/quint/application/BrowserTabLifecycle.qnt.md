# specs/quint/application/BrowserTabLifecycle.qnt
- Lines: 198 | Kind: Quint model (live, 6 runs, 8 invariants, 5 witnesses, symbol pins) | Verdict: KEEP (merge target for `BrowserSession.qnt`); PORT harness
- Covers: renderer tabs against native tabs: creation in flight, the tab limit on every creation path (restored unloaded tabs count), typed tab never replaced by restore, bounded retry then report of a cold-start tab whose saved page fails. Duplicates: `BrowserSession` (limit, hydrate/late restore) — merge that one in. Callers/importers: manifest (source `prototype/browser-adapter.ts`; sharedSources `tab-host.ts`, `browsing-session.ts`); harness `browser-tab-lifecycle.mjs` (133 lines); only `test/quint-browser-tab-lifecycle.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness:38-61 | T10 | Three slices of `browser-adapter.ts`: `'  function ensure('`…`'  async function command('`, `'  function forgetTabs(ids'`…`'  async function confirmBrowser('`, `"  void Browser.addListener('tabOpened',"`…`"  void Browser.addListener('notice',"`; types stripped, run in `vm`. Upstream `parseBrowserAddressInput`, `browsingSnapshot`, `restoreBrowsing`, `BrowserTabSession` are imported properly. | Extract `ensure`/`navigate`/`restoreSession`/`forgetTabs` and the `tabOpened`/`tabClosed` listener bodies into the exported browser-tabs factory proposed in `BrowserSessionPersistence.qnt.md`; harness imports it. | Medium |
| 2 | harness:36, 47 | A7 / D20 | Harness loads `createSessionSaver` from `browser-poll.ts` and injects it into the `vm` context although the sliced adapter never calls it. D20 deletes `createSessionSaver`; this line would then throw. | Remove the import and the context entry now. | None |
| 3 | 5 | — | `Cap = 3` stands for `MAX_TABS = 8`. | Keep; share with merged BrowserSession content. | — |
| 4 | manifest | T10 | Symbol pins on adapter closure names (`restored`, `restoreAttempts`, `ensure`, `navigate`, `MAX_TABS`, `tabOpened`, …). | Replace with the factory's export after the port. | Low |

## Proposed end state
One browser-tabs model (~240 lines after absorbing BrowserSession's private-tab/order/focus invariants), harness importing the extracted factory with the real upstream session helpers, no text slices, no `createSessionSaver`.
