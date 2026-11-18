# specs/quint/legacy/sign-in/check-sign-in-refinement.mjs
- Lines: 182 | Kind: Quint refinement harness (Playwright-mounted renderer replay against historical `legacy/SignIn.qnt`) | Verdict: DELETE (with `specs/quint/legacy/**`, C17 / P6)
- Covers: boots the real Android renderer sign-in chooser in flag-off Chromium over the synthetic native Cloud sign-in fixture, drives three schedules (email wrong code then verified; phone challenge then Back with Google unavailable; held Google then Back/cancel), records them as ITF-style steps and checks them against the historical `SignIn` model, plus one deliberately failing "historical boot gate" trace. Duplicates: `test/browser/native-cloud-signin.spec.ts` (email wrong-code retry and bind, phone code, Google cancel/Back, offline, MFA, readiness — every behaviour here and more); live models `application/SignInChooser.qnt`, `SignInReadinessProbe.qnt`, `services/IdentitySession.qnt`. Callers/importers: `specs/quint/refinement/legacy/index.mjs:10,176` (legacy family aggregate) and `test/quint-legacy-sign-in-refinement.test.mjs:6` (per-model test; same check run twice, T4). No workflow or package.json script names it directly.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 | Refines `legacy/SignIn.qnt`, a historical 2026-11 design comparison (its own receipt assumption, l.168-170, says the model's "current historical profile" no longer matches the product). Not a model of live code; `SignIn.qnt` is already DELETE. | Delete with the legacy family. | Low |
| 2 | 171-181 | B5 | Half the function exists to prove the model is *wrong*: builds a mutated trace, asserts `checkTraces` rejects it, then re-reads the negative receipt JSON. Evidence ceremony about a superseded design. | Goes with file. | None |
| 3 | 107-160 | B5 / T10 | Hashes ~every file under `apps/app/src`, `.eliza/client-features`, two vendor plugin trees and lockfiles before the run, then a Vite `transform` plugin asserts each loaded module matches the pre-run hash and that four "watched" files (`runtime/connection-ui.tsx`, `runtime/cloud-sign-in.ts`, `runtime/cloud-sign-in-ui.tsx`, `.eliza/.../auth/native-cloud-sign-in.ts`) were loaded. Pins file paths: any split/move of `connection-ui.tsx` (D1) breaks it. | Goes with file; do not port. | Low |
| 4 | 18-23 | T6 | Reads state through `window.signInFixture` and `window.planController.getSnapshot()` backdoors in addition to the UI. | n/a after delete. If anything is carried, use UI + fixture call log only. | — |
| 5 | 1-182 | T4 | Runs a full Chromium + Vite dev-server boot (test timeout 360 s); run twice (per-model test and legacy aggregate). Same journeys already in `native-cloud-signin.spec.ts` under the chromium Playwright project. | Delete both runners. | None |
| 6 | 8-9 | — | Only consumer outside `test/browser` of `test/browser/helpers/native-cloud-signin.ts` (`startNativeCloudSignInFixture`, `entitlements`, `USER`) and of `fenceNetwork`. Those helpers survive: `native-cloud-signin.spec.ts` imports them. `checkClientFeatures`, `filesWithin`, `sha256` and `check-traces.mjs` are shared and stay. | No helper orphaned. | None |

## Proposed end state
File deleted together with `specs/quint/legacy/SignIn.qnt`, the `SignIn` entry in
`specs/quint/refinement/legacy/index.mjs` (l.10 import, l.175-180 adapter) and
`test/quint-legacy-sign-in-refinement.test.mjs`. Sign-in behaviour stays covered by
`test/browser/native-cloud-signin.spec.ts` (future `journeys/connection-cloud.spec.ts`), and formally by the live
`SignInChooser` / `SignInReadinessProbe` / `IdentitySession` models. One behaviour worth confirming survives in that
journey: "Google Back cancels the held native request (`cancel` call) and no `openExternal` / `/api/auth/cli-session`
call happens" — the spec's "cancelling a Google sign-in burns the pending attempt" test covers the cancel; add the
no-external-handoff assertion there if it is missing.
