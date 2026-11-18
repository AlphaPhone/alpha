# scripts/test-cloud-delegation.ts
- Lines: 172 | Kind: integration in a separate browser bundle (Vite-builds `scripts/fixtures/cloud-delegation/` = real `CloudDelegationPanel` + `HostedDigestProtocol` with `native-connection` and `@capacitor/core` aliased to fakes; own `http` server plays Cloud) | Verdict: REWRITE as `test/browser/journeys/connection-cloud.spec.ts` cases on the app's own dev server
- Covers: the "Cloud reads" delegation grant used by hosted digests (product: `hosted-digest-ui.tsx` is imported by `main.tsx`): callback state matching, response loss + reload recovery, bounded completion on repeated "waiting", owner switch isolation, denied callback cancels, invalid authorization links refused, expiry, secure-slot races, revoke retry after reload. Duplicates: `test/digest-delegation-host.test.mjs` and the Quint `hosted-digest-refresh.mjs` harness (stubs `./cloud-delegation-ui`). Callers/importers: `test/browser/adapters.spec.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-24 | P3, T9 | Runs a full `vite build` of a fixture app on every run (notable cost, ~10-20 s) inside a child process of a Playwright test. | Mount the panel in the real app (it is reachable from the digests surface) and fake Cloud with `page.route`; no extra build. | M |
| 2 | 52-121 | T7 | Own HTTP server re-implementing the delegation API. | `page.route('**/api/**')` handler in the journey with the same state machine (keep it, ~40 lines). | L |
| 3 | 136-172 | D8 | Whole scenario is 30 statement-soup lines of 500-2,000 chars. | One `test.step` per scenario. | L |
| 4 | 44-51, 157, 162, 169 | T8 | `quiet()` 200 ms negative windows and `for(...;Date.now()<end;) await sleep(10)` polls. | `expect.poll` / `expect(...).not.toHaveBeenCalled` style checks on route counters; keep one bounded negative window helper. | L |
| 5 | fixture native.ts | D7 | `cloudDelegationSlot` regex exported from product only for this fixture (delete-candidates B274). | Move the regex into the fixture or the harness. | L |

## Proposed end state
`journeys/connection-cloud.spec.ts` carries: (a) callback completes, response lost, reload + refresh shows Connected without a second completion; (b) foreign-owner callback does not complete; (c) repeated waiting completes at most once per explicit check; (d) owner switch during completion stops the retired owner; (e) denied callback cancels; (f) invalid/expired authorization links are neither stored nor opened; (g) revoke failure shows "Off · retry" and retry after reload revokes. `scripts/fixtures/cloud-delegation/` deleted once nothing else imports it (it is also listed by `audit-production-bundle.ts`, `ci/export-browser-proof.ts`, `prototype-capture.ts` and Quint specs: check them in the same change).
