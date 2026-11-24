# test/digest-capabilities.test.mjs
- Lines: 46 | Kind: test 1: integration of the real (upstream-staged) `HostedDigestProtocol`, `digestLoopState`, `digestRenewals` in a tsx child process; test 2: source-text over `hosted-digest-ui.tsx` | Verdict: MERGE test 1 into `test/integration/digests.test.ts`; DELETE test 2
- Covers: native evening briefs, source pausing and the dossier are offered only when the agent's `/api/workflow/status` advertises them, and loop state text for expired/revoked sources. Duplicates: `apps/app/src/runtime/hosted-digests.ts:15` is `export * from '.eliza/client-features/plugins/plugin-workflow/src/client/hosted-digests.ts'`, so test 1 exercises upstream client code (T5 risk) through the app's import. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-26 | T9 | Builds a script string and `execFileSync`s `node --import=tsx -e` just to import a TS module. | Import directly in a tsx-loaded `digests.test.ts`. | None. |
| 2 | 12-23 | T5 | The capability parse and loop-state functions are upstream's (`plugin-workflow/src/client`). Upstream tests should own their parsing; the app needs only "the UI hides what the agent does not advertise". | Keep one advertised-vs-not row and the expired/revoked label row; drop the rest. | Low. |
| 3 | 38-46 | T1 | Regex over a JSX line for `features.dossier&&` and the `nativeSupported` expression. | Delete; assert in `journeys/digests.production.spec.ts` that the "Review on-demand brief" button is absent without resident phone sources. | Low. |

## Proposed end state
Two rows in `test/integration/digests.test.ts` (advertised capabilities gate features; lapsed-source loop label); the
dossier-button visibility rule is a journey assertion.
