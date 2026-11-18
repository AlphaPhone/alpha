# specs/quint/native/ResidentRuntime.qnt
- Lines: 178 | Kind: Quint model (live; imported by `ApplicationComposition.qnt:51`) | Verdict: KEEP (remove dead state)
- Covers: resident agent process lifecycle (owned vs attached start, native admission epoch, cancellation of unowned/owned starts, last-surface retirement), Cloud inference-provider binding to the current credential generation, uncertain unbind, crash with retained recovery review, reset fence. Duplicates: lifecycle/cancel overlaps `ResidentStartCancel.qnt` (finer, Java-level); scheduling overlaps `ResidentScheduling*`. Callers/importers: manifest; `ApplicationComposition.qnt`; `refinement/native/resident-coordinator.mjs` (`ResidentTraces.java`, `ResidentCoordinatorTraces.java`), `credential-coordinator.mjs`, `residentLifecycleTraces` (`index.mjs:172-179`, bundles unmodified `local-agent.ts`); README rows; `specs/quint/ui-return-review-20261109.md` (point-in-time note, delete candidate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 13, 18-21, 123 | A7 / B4 | `profile` ("native"/"cloud") is written by `chooseProfile` but never read by any guard, invariant or test in this model. `ApplicationComposition.qnt:71,471-472` exports and calls `chooseProfile` (as `chooseResidentProfile`), so it is a no-op transition in the composition too. | Delete the field and `chooseProfile`, and the composition's `chooseResidentProfile` action; or, if the profile matters, add the invariant that reads it. | low (two-file model edit) |
| 2 | 6, 15, 158 | B4 | `history` is constant 1 (`TypeOK` asserts `s.history == 1`); `packaged` never changes. Constant state. | Delete `history`; make `packaged` a guard-free constant or delete. | low |
| 3 | 25-28 vs 30-36 | — | `start` (renderer path) and `admitStart` (native admission advancing the epoch) are two start entries; both are replayed (TS lifecycle vs Java coordinator). | Keep; one comment naming the harness for each. | none |
| 4 | 1 | — | Header "See README.md for source mapping" points at the README table slated for removal. | Point at manifest `sources`/`abstractions`. | none |
| 5 | manifest sources | A3 check | `apps/app/src/product/native-cloud-runtime.ts` and Cloud provider binding: this is Cloud *inference* (Eliza Cloud provider for the resident), not hosted-agent pairing (D5). Still product. | Keep. | none |
| 6 | harness | — | Ties are run-the-code: whole `AlphaLocalAgentPlugin` compiled with ports; `local-agent.ts` bundled unmodified. No text slicing in these harnesses. | none | — |

## Proposed end state
Model minus `profile`/`chooseProfile`/`history` (with the matching `ApplicationComposition` edit). All product sources exist after DECISIONS. Stage F's
`AlphaLocalAgentPlugin` split (cross-file-actions U-A2) changes `residentSources` in `resident-coordinator.mjs` and
the manifest paths, nothing in the model.
