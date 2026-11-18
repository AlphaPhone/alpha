# test/google-connection-return.test.mjs
- Lines: 201 | Kind: transplant + one source-text test (slices `connect`, `load`, `disconnect`, admission code and two `useEffect` bodies from `google-connection-ui.tsx`; strips and evals `google-accounts.ts`; real imports of `google-connection-return.ts`, `google-workspace-return.ts`, `gmail-grants.ts`) | Verdict: REWRITE: keep the return-watcher cases as an import-based integration in `test/integration/connection-cloud.test.mjs`; panel cases go to `journeys/settings.spec.ts`; delete the rest
- Covers: after Google consent, a return (native resume, focus, visibility) loads accounts once and only after a real background/foreground; any binding change (environment, owner, org, session, credential, client) retires the pending return; closing aborts reads and removes the native listener once; the verified Gmail tier is forwarded; workspace callbacks open the panel only after native admission; disconnect notices never cross owners. Duplicates: `google-calendar-connect` part B and `google-connections-resource-budget` mount the same panel. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-15, 105-109, 125, 164 | T2, T10 | Markers in `google-connection-ui.tsx`: `const unverifiedAccounts=`..`/** Browser Cloud stage only:`, ` function accountRead()`..`\n useEffect(()=>{if(!open)return;void load();`, ` async function connect(`..` async function disconnect(`, ` useEffect(()=>{\n  if(!open||!binding)return;`..`\n },[open,identity,cloud?.client]);`, ` useEffect(()=>{\n  const port=googleWorkspaceReturnPort`..` useEffect(()=>{if(!open)return;const accountsChanged`, ` async function disconnect(`..` /** Explicit Connect persists`. | Delete these harnesses. | medium |
| 2 | 85-88 | T1 | Regex pins (`DailyApps.addListener('appResumed'`, listeners, absence of `appUrlOpen`). | Delete. | none |
| 3 | 10 | T9 | `ALPHA_GOOGLE_RETURN_UI_SOURCE` env knob that nothing sets (repo grep). | Gone. | none |
| 4 | 35-38, 61-77 | — | `watchGoogleConnectionReturn` is imported for real; its arming, foreground, binding-change and listener-removal rules can be tested directly with fake event sources. | Keep those cases against the real module in the connection-cloud integration. | low |
| 5 | 16, 49 | T8 | Local `deferred`, bounded microtask loops. | `Promise.withResolvers`, `waitFor`. | none |

## Proposed end state
About eight cases that drive `google-connection-return.ts` and `google-workspace-return.ts` directly (real modules,
fake event sources); panel-level return behaviour is a settings-journey step. No slicing of the panel source.
