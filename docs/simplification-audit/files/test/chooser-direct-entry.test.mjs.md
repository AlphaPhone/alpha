# test/chooser-direct-entry.test.mjs
- Lines: 144 | Kind: transplant (esbuild-transforms `status-ui.tsx`, `cloud-sign-in-ui.tsx`, the `requiredSignInView` branch, `automaticSignInProbe`, `cancelSignIn`, `explicitSignedOutCloudEntry` and `OwnKeyForm` slices of `connection-ui.tsx`, evals each with 10-20 positional fakes) | Verdict: DELETE; carry 5 cases to `journeys/startup-permissions.spec.ts` / `journeys/connection-cloud.spec.ts`
- Covers: signed-out welcome page stays quiet until readiness then shows sign-in methods; runtime start warning stays off the sign-in page; failed readiness shows one retry; "Restore saved sign-in"; in-flight sign-in disables "Use my own keys"; readiness probe runs once per entry; Cancel aborts without clearing credentials; provider switches wait while a reply streams. Duplicates: `test/browser/native-cloud-signin.spec.ts`, `post-sign-in-setup.spec.ts`, `own-provider.production.spec.ts`, `connection-boundaries.production.spec.ts` (all drive the sign-in page and "Use my own keys"). Callers/importers: `npm test` glob only; uses `test/fixtures/assert-order.mjs` (import unused in this file).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-19, 64, 77-80, 95 | T2 | Seven slices of `connection-ui.tsx` (4.2k lines, D1); `renderBranch` takes 20 positional parameters. | Delete. | None |
| 2 | 8 | A7 | `assertBefore` imported, never used. | Gone with the file. | None |
| 3 | 47-53 | A1 | "Restore saved sign-in" is `legacySignInRecovery` (Android `LegacyCloudRecovery`, deleted under D1/C5). | Drop with the feature. | None |
| 4 | 31, 56 | T1 | Exact markup class strings (`class="alpha-btn alpha-btn--text"`). | Delete. | None |
| 5 | 22-46, 54-62, 106-144 | T3 | Visible behaviours worth journeys: quiet loading then methods; failed readiness -> one "Try again"; start warning absent from sign-in; own-key Save disabled while a reply streams, Cancel usable; Cloud/Own keys disabled while replying. | `journeys/startup-permissions.spec.ts` (first two) and `journeys/connection-cloud.spec.ts` (rest), production project. | Low |
| 6 | 63-90 | T3 | Probe-once and Cancel-delegation are effect counts on fakes. | Journey: open sign-in, back, reopen -> one readiness request (count via route). | Low |

## Proposed end state
Deleted. Sign-in entry and provider-switch behaviours live in the startup and connection-cloud journeys on the
production project; legacy recovery copy goes with D1.
