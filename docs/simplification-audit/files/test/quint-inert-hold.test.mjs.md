# test/quint-inert-hold.test.mjs
- Lines: 47 | Kind: Quint replay with source transplant (strips types from all of `runtime/modal-inert.ts`, removes `export`, evaluates in `vm` to reach the private `owners` map) + one unit case | Verdict: PORT and MOVE (to `specs/quint/refinement/application/inert-hold.mjs`, registered)
- Covers: `holdPhoneInert` keeps the phone inert while any panel holds it and restores the earlier flag on last release (60 InertHold traces). Duplicates: modal Playwright specs observe inertness indirectly; `modal-scrim-ownership` replay covers scrim, not inert. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-16 | T2 | Whole-file transplant so the test can read module-private `owners`. | PORT: import `holdPhoneInert`; project the model onto observable `phone.inert` plus handle count, or export a read-only `inertHoldCount(phone)`. Prefer the projection change (no test-shaped export, D7). | Medium |
| 2 | 44-47 | T3 | "missing phone element yields a no-op release": one-line unit check. | Delete (or one guard step in the replay). | None |

## Proposed end state
A driver imports `holdPhoneInert`, replays InertHold on a stand-in element, registered in the application index; no `vm`.
