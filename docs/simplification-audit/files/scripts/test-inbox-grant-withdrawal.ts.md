# scripts/test-inbox-grant-withdrawal.ts
- Lines: 182 | Kind: source transplant (T2): `prototypeScript('inbox-provider-controls.ts', ...)` regex-strips `apps/app/src/prototype/inbox-provider-controls.ts` and runs it in `vm` with real `InboxOperation`, `review-controller`, `gmail-grants` and an in-memory secure store | Verdict: PORT to a real import in `test/integration/inbox-provider.test.ts` (shared with `test-inbox-sent-cleanup.ts` and `test-inbox-multiple-drafts.ts`)
- Covers: P-37: a withdrawn Gmail change grant discards an undispatched review in review and preparing phases, also across a same-turn unbind, and never dispatches it; confirmed operations keep their receipt; a newer capability refresh wins over a stale success/failure, initial bind and teardown; a refresh does not cancel restoration of a saved review. Duplicates: `test/browser/gmail-grant-recovery.spec.ts` covers the *read* grant, not the change grant; `specs/quint/refinement/services/inbox-coordinator-ports.mjs` models coordinator ports, not this discard. Callers: `test/adapter-contracts.test.mjs:6`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16, 55-57 | T2/T10 | Product file read as text, imports/exports removed by regex, types stripped, globals injected. | Import `inboxProviderControls` through `loadBrowserModule` (`test/fixtures/browser-source.mjs`, real bundling) with the Capacitor/native boundaries replaced; the module already exports `inboxProviderControls`. | M |
| 2 | 19-25 | T8 | `waitFor` polls with 1 ms timers up to 5 s. | Await `provider.bind/prepare` promises and expose one `settled()` from the controller if needed. | L |
| 3 | whole | — | Privacy-critical race (withdrawal while a provider run is in flight) that Playwright cannot hit deterministically; the only coverage of P-37 change-grant discard. | Keep all 5 withdrawal cases + 2 capability-staleness cases + restore-overlap case. | — |
| 4 | 128, 167, 182 | — | Narrative success logs. | Remove. | L |

## Proposed end state
Eight `test()` cases in `test/integration/inbox-provider.test.ts`, which bundles the real `inbox-provider-controls.ts` and `inbox-drafts.ts` once and shares the device/remote fixture with the sent-cleanup cases. `scripts/fixtures/prototype-script.ts` is deleted when its last importer (`inbox-adapter-fixture.ts`, this file, sent-cleanup) is gone.
