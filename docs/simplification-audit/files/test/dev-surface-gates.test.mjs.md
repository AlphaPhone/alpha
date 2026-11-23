# test/dev-surface-gates.test.mjs
- Lines: 176 | Kind: integration over real modules through two Vite SSR servers (flag on/off, `ssrLoadModule` of `runtime/remote-protocol.ts`, `alpha-client.ts`, `cloud-protocol.ts`, `prototype/mvp-features.ts`, `browser/dev-profile.ts`, `runtime/local-agent*.ts`, `prototype/model.js`, `device-actions.ts`) with `dc-lite.js` stubbed by a Vite plugin; plus one transplant (lines 98-115: `maps/regional-provider.ts` stripped of imports and run in `vm`) | Verdict: REWRITE as `journeys/production-gating.spec.ts` (production Playwright project); delete Wallet and remote-origin cases with D2/C4
- Covers: with `ELIZA_DEV_ALLOW_TEST_MOCKS` off: no plain-HTTP loopback agent or session origins, no Cloud staging, `?mode=dev` ignored, deferred views stay deferred and telephony prompts refused, the local agent host bridge makes no request, regional Maps never fetches a gateway, Wallet routes/prompts/proposals refused, Settings pages hold no fixture callbacks. Duplicates: `scripts/audit-production-bundle.ts` (string-level absence in build output), `test/browser/connection-boundaries.production.spec.ts` and `connection.production.spec.ts` (production project), `test/dev-local-launcher.test.mjs` (flags). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-24 | — | Two Vite dev servers started in `before()`: notable cost (several seconds, scans generated trees). The flag is read at module evaluation, so each module is loaded twice. | The production Playwright project runs against a real production build; the same checks there need no server pair. | Low |
| 2 | 26-54 | A3 / D5 | Loopback-origin rules for `RemoteProtocol` and `AlphaClient.attachVerifiedTransport(developmentOrigin)`; part of the D5 harness that moves to `dev/`. | Delete with C4; the production bundle audit should refuse `127.0.0.1:31337`/`10.0.2.2` literals in output. | Low |
| 3 | 56-70 | — | Staging unavailable in flag-off builds, refused before the host is asked. | Production journey: account sheet offers no environment choice; no request to a staging host (`page.on('request')`). | Medium |
| 4 | 72-94 | — | `?mode=dev` ignored, deferred views closed, local agent bridge silent. | Production journey: load `/?mode=dev`, assert no dev rail and no `/__alpha-local-agent` request; type "call 5550100", assert the unavailable copy. | Medium |
| 5 | 96-136 | T2 | Regional Maps transplant with `import.meta.env` rewritten. | Production journey: open Maps, assert no request to a regional gateway; delete the transplant. | Low |
| 6 | 138-160 | A3 (D2) | Wallet refusal: Wallet is decided deleted; the test asserts `VIEWS.wallet` exists in mock builds. | Delete with Wallet. | Low (it will fail when D2 lands). |
| 7 | 162-176 | — | Flag-off Settings pages render no fixture pairing/update/download controls. | Production journey: walk the listed Settings pages, assert no such controls. | Low |

## Proposed end state
File deleted. `journeys/production-gating.spec.ts` (production project, real production build) carries rows 3, 4, 5 and 7
as user-visible checks plus request-log assertions; the bundle audit carries string absence. Wallet and remote-origin cases
leave with D2 and C4.
