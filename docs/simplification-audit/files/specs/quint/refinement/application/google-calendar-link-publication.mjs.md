# specs/quint/refinement/application/google-calendar-link-publication.mjs
- Lines: 133 | Kind: Quint refinement harness; esbuild bundle of the fixture with a virtual-module port map and one hook-locals seam in `google-connection-ui.tsx`; launches Chromium | Verdict: KEEP (not DELETE as C3 proposes)
- Covers: in the mounted Google panel, a Calendar link and an account read have independent busy ownership; a link publishes its notice and retained review only while its token, Cloud binding and Calendar intent are current; old replies cannot overwrite replacements; inert/focus released on close. Duplicates: run by `test/quint-google-calendar-link-publication.test.mjs` and aggregate `index.mjs:65` (T4). Callers/importers: those two.
- Model: `GoogleCalendarLinkPublication.qnt`, live (sources `google-connection-ui.tsx`, `google-connection-return.ts`, `modal-inert.ts`). Production reachable: Settings → Google Calendar → `googleConnectionController.openCalendar` → `linkGoogleCalendar` → agent `changeSync`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | – | ledger | `delete-candidates.md` C3 lists `google-calendar-link-publication.{mjs,md}` with the unreachable client linked-sync stack. The panel's link path is the live D4 path (`google-accounts.ts:353` uses `AgentCalendar.changeSync`). | Keep; remove from C3. | High if deleted |
| 2 | 47-52 | T10 | Inserts `globalThis.inspectGoogleLinkPublication=()=>({read:accountRead(),verified:verifiedAccounts.current,accounts,accountBusy,linkBusy,busy,notice,active:active.current,linking:linking.current})` before `' function accountRead(){'`: couples to ten hook-local names. | Derive what the model needs from DOM (`aria-busy`/disabled buttons, `[role=status]`, `.os` inert) and port calls (`linking.signal` = the signal passed to `link`/`browserCall`); keep a seam only for `verified` if no DOM equivalent exists. | Med |
| 3 | 13-38 | – | Virtual ports keyed by the panel's import specifiers (`'./google-accounts'`, `'./connection-ui'`, …); importer-scoped so other modules get real code. Good technique; fragile only to specifier renames. | Reuse it for `google-account-panel.mjs`. | Low |
| 4 | 105-126 | – | Chromium launch per run (notable seconds). | Acceptable; or JSDOM, since nothing layout-dependent is observed. | Low |
| 5 | 35-37 | D5 | `'./browser-cloud-resident'` port plus five `browserHost=true` schedules cover a dev-only loopback host. | Owner question (fixture report #3). | Low |

## Proposed end state
Keep the model and campaign; drop or minimise the hook-locals seam; make its bundling helper the shared panel mount for
`google-calendar-access-choice.mjs` and `google-consent-admission.mjs`. One runner. Lane: the three manifest sources,
`google-accounts.ts`, model.
