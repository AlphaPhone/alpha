# scripts/test-cloud-delegation-return.ts
- Lines: 37 | Kind: integration (real static `apps/app/public/delegation-return.html` served through `page.route`, run in Chromium) launched as a child process | Verdict: MOVE into Playwright as `test/browser/journeys/connection-cloud.spec.ts` case "delegation return page"
- Covers: the HTTPS return page strips the query from the address bar, forwards `state`+`code` (or `error`) to `alphaphone://cloud-delegation`, rejects duplicate codes and says when the page was reopened. Duplicates: `test/quint-conformance.test.mjs:44` (reads the page as model input). Callers/importers: `test/browser/adapters.spec.ts` (spawns it); the page itself is pinned by its CSP hash, `scripts/ci/export-browser-proof.ts:73` and the application Quint manifest.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 9 | T9 | Own `chromium.launch` inside a Playwright test (via `adapters.spec.ts`). | Use the `page` fixture directly; same `page.route` technique. | L |
| 2 | 7 | T9 | `ALPHA_HOSTED_SOURCE_ROOT` knob: nothing sets it. | Read the file relative to the repo root. | L |
| 3 | whole | — | Good test: real file, user-visible assertions, no product imports. | Keep all four scenarios. | L |

## Proposed end state
A 30-line `test()` in `journeys/connection-cloud.spec.ts`; script and its `adapters.spec.ts` entry deleted.
