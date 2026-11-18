# specs/quint/services/AndroidBuildInputReadiness.qnt
- Lines: 118 | Kind: Quint model, live (8 tests, 4 invariants, no symbols); models build tooling | Verdict: KEEP (owner question on build-tool models)
- Covers: `npm run android:build`'s input report (`android-build-preflight.ts --report`) and its two gates, early native prerequisites and full admission. Four properties: full admission implies early admission, a reported payload requires an exact source stamp, the Google host check follows payload admission, and an "attention" row is never also "ready". Modelled code: `scripts/android-build-preflight.ts`, `build-embedding-host.ts`, `mobile-uuid-adapter.ts`, `stage-embedding-host.ts`, `voice-host.ts` (all exist). Duplicates: the preflight exit-2 behaviour may also be covered by host tests of `android-build-preflight` (`files/scripts/android-build-preflight.ts.md`). The model adds the gate-ordering properties. Callers: harness `refinement/services/android-build-input-readiness.mjs` (223 lines, which imports `checkoutProblems, formatProblems, formatReport, preparedRuntimeProblems, strictBuildInputs` and runs them on temporary git checkouts), wrapper `test/quint-android-build-input-readiness.test.mjs`, aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-37 | — | `observe` recomputes the whole state from inputs in one pure function. That is a good shape: the harness compares the real report against it. | — | none |
| 2 | 33 | B5-adjacent | `ready.size() == 9` hard-codes the number of report rows, so adding an input row changes model, harness and report together. | Accept. It is the specified report. | low |
| 3 | harness 163 | T10 (mild) | The harness changes a stamp with `sourceStamp.replace('first','second')` on fixture text, not product text. Fine. | — | none |
| 4 | whole | §2.11 | Build-tool model. | KEEP (D11); owner question as for the other build-tool models. | owner |

## Proposed end state
Unchanged. If `android-build-preflight.ts` is simplified (its report says SIMPLIFY), keep the exported names the harness imports, or update the harness in the same change.
