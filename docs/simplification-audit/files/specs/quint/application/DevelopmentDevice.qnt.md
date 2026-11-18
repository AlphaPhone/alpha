# specs/quint/application/DevelopmentDevice.qnt
- Lines: 75 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; SIMPLIFY (drop Wallet payment); PORT harness
- Covers: Test-mocks device simulator: incoming/screened/declined calls, in-call controls, messages, and production inertness. Duplicates: Playwright phone/dialer simulator specs. Callers/importers: `specs/quint/refinement/application/surfaces.mjs` (`developmentDevice`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)), README; 3 symbol pins (pnDecline, pnEnd, pnStart in model.js).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6,11,15,45-46,51,54,73 | A3/D2 | `fakePayment`, `fakeReview`, `fakeConfirm` and `simulatedPaymentTest` model the simulated Wallet pay flow (`model.js` wallet module, D2 delete). | Delete the field, actions, invariant clause and run. | None after Wallet deletion. |
| 2 | surfaces.mjs 59 | T2/T10 | Harness slices `model.js` from `var PN =` to `registerView("phone",`, strips types, runs in vm. | Move the phone simulator into `dev/` as a module (D6/stage F) and import it. | Depends on model.js split. |
| 3 | manifest symbols | T10 | 3 pins. | Delete. | None. |

## Proposed end state
Model without payment; harness imports the dev phone simulator module.
