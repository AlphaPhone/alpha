# specs/quint/application/AccountSheet.qnt
- Lines: 33 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP (small fixes)
- Covers: Account sheet sign-out is owner-bound (a switched owner cannot confirm), dismiss/mode switch never remove keys or data, settings and startup open the same account section. Models: `apps/app/src/runtime/connection-ui.tsx`, `runtime/cloud-membership-ui.tsx`, `prototype/settings-adapter.ts` (exist). Duplicates: Partly `AssistantConversation`/`Application` owner-switch idea, different surface; Playwright account/membership specs drive the same panel. Callers/importers: manifest (4 tests, no symbols); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/account-sheet.mjs` (Vite dev server + Chromium + esbuild; imports `test/browser/flag-off-android.ts`, `test/browser/helpers/native-cloud-plan-fixture.ts`, `scripts/prepare-client-features.ts`), wrapper `test/quint-account-sheet-refinement.test.mjs` and `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-25 | — | `run directSettingsRemainReachable` is not listed in the manifest `tests` (only 4 of 5 runs are registered), so the explicit gate does not claim it. | Register it in the manifest or delete it. | Low |
| 2 | 3-6, 20-21 | — | `keys` and `dataRevision` are never changed by any action; in the model the `safety` conjuncts on them are constant-true. They only matter as refinement observations (the harness reads real keys / a retained document). | Keep, but comment that they are refinement observables, not model state. | — |
| 3 | harness | T6 / cost | The harness is a full browser run (Vite server, Chromium, `page.evaluate(import('/src/browser/documents.ts'))`, Capacitor `nativePromise` monkey-patch). It is effectively a Playwright journey plus trace replay, run twice (wrapper + aggregate). | Run once; long term host it beside `journeys/settings.spec.ts` (same fixtures). | Low |

## Proposed end state
Model unchanged apart from registering or removing the fifth run. Harness runs once from one runner.
