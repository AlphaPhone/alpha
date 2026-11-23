# test/browser/post-sign-in-setup.spec.ts
- Lines: 232 | Kind: Playwright, chromium; starts its **own Vite dev server** in `beforeAll` (test mocks off, `VITE_ALPHA_CLOUD_RESIDENT=1`, separate cache) and routes the dev:cloud host bridges `__alpha-browser-cloud` and `__alpha-local-agent` | Verdict: MERGE tests 2 and 4 into `post-sign-in-setup.production.spec.ts`; DELETE the rest
- Covers: on the dev:cloud browser renderer: signed-out guests see the full-page Cloud sign-in; a wrong code reports in-page; a verified code opens access setup while the agent restarts, then the agent sheet shows Starting/Running and "No plan"; a first start shows a neutral loading screen, never Home; a signed-in start opens setup directly; a start undecided after 60 s shows Home and the sign-in still follows; own keys after a held readiness check are rejected inside the own-key form. Duplicates: `post-sign-in-setup.production.spec.ts` tests 1-2 (same verified-code and signed-in paths on the APK bundle), `own-provider.production.spec.ts` (welcome own-key rejection), `accessibility-sign-in.production.spec.ts` (wrong-code page). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-21 | P1, T8 | A second Vite server with its own dependency cache is cold-started per worker; tests wait up to 60 s for the first page. | Removing the file removes the extra server. | None. |
| 2 | 86-157 | T4 | Verified-code → setup-while-starting duplicates the production test 1 on a development-only renderer (dev:cloud bridge). | Delete; the APK path is the product. | Low: the dev:cloud browser surface loses its only end-to-end sign-in check. |
| 3 | 174-187 | T4 | Signed-in start → setup duplicates production test 2. | Delete. | None. |
| 4 | 159-172, 189-200 | — | Neutral loading screen during a held first start, and the 60 s fallback to Home with `page.clock`, have no production twin. | Move both to the production spec (hold `Agent.start` in the flag-off fixture). | Low. |
| 5 | 202-232 | T4 | Own-key rejection after a held readiness check overlaps `own-provider.production.spec.ts` welcome rejection; the "held readiness check" variant is the only new part. | Add the held `AlphaCloudSignIn.status` variant to the own-provider welcome case if wanted; delete here. | Low. |
| 6 | 82, 142, 150 | T6 | Reads/opens via `connectionController.getSnapshot()/open()` imported from `/src`. | Gone with the file. | None. |

## Proposed end state
File deleted. Its two unique cases (neutral loading during a held first start; 60 s fallback to Home with sign-in following) live in the production startup journey. Owner question: whether the dev:cloud browser renderer (`scripts/dev-cloud.ts`, `browser-cloud-dev-bridge.ts`) needs any end-to-end coverage of its own.
