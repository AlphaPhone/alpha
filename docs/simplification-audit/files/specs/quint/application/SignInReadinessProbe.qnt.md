# specs/quint/application/SignInReadinessProbe.qnt
- Lines: 171 | Kind: Quint model (live: manifest, 10 scenarios, 8 invariants, 8 witnesses, 12 symbol pins on `connection-ui.tsx`) | Verdict: KEEP
- Covers: ownership of the connection step slot by the sign-in readiness probe: the automatic entry's single probe after startup, Back during a probe, own-keys save over a probe, and late readiness answers. Duplicates: implementation exercised by host tests `test/cloud-sign-in-late-readiness.test.mjs`, `test/cloud-sign-in-readiness-retry.test.mjs`, `test/chooser-direct-entry.test.mjs`, `test/connection-presentation-state.test.mjs` (not tied to the model); `refinement/application/cloud-plan-recheck.mjs` references `signInReadinessOwner`. Callers/importers: manifest only (no README mention, no harness).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Only tie to code: 12 regex symbol pins in `connection-ui.tsx` (`signInReadinessOwner`, `beginSignIn`, `adoptLate`, `automaticSignInProbe`, `cancelSignIn`, `closeExplicitEntry`, …). They break on the `connection-ui.tsx` split and prove nothing about behaviour. | Pin the file; drop or narrow symbol pins. | Low |
| 2 | 295, 392 | — | `startsAfterTakeover` is a ghost counter whose only use is `TakeoverStartsNothing == 0`; it is the property, not dead state. | None. | — |
| 3 | 400 | — | `probes < 4` bound is model-checking scaffolding, fine. | None. | — |

## Proposed end state
Unchanged model; symbol pins replaced by file pins. Missing in the codebase: any refinement link. When the connection step slot is extracted from `connection-ui.tsx` (D1 split), add a trace replay or keep relying on the connection-cloud journey; record this in the chunk's coverage list.
