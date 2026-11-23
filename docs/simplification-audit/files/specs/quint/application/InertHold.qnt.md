# specs/quint/application/InertHold.qnt
- Lines: 56 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT test (whole-file transplant)
- Covers: shared inert hold of the phone element by overlapping modal panels; restored only after the last release, release idempotent (`holdPhoneInert` in `apps/app/src/runtime/modal-inert.ts`). Duplicates: ModalScrimOwnership's Chromium fixture exercises `holdPhoneInert` as integration; overlap is acceptable (different properties). Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); `test/quint-inert-hold.test.mjs` (not in the aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 11-14 | T2 | Test strips modal-inert.ts and evals it in a vm to reach the private `owners` WeakMap. | Import `holdPhoneInert`; observe `phone.inert` and count holds in the driver (the model's `count` is the driver's tally); no access to `owners`. | L |
| 2 | manifest symbols | T10 | Pins local names `released`, `previous`. | Pin the file. | L |

## Proposed end state
- Model unchanged.
- Test imports the module; observes only the element and the handles it holds.
