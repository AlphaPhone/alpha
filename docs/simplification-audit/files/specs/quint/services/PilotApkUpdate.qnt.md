# specs/quint/services/PilotApkUpdate.qnt
- Lines: 131 | Kind: Quint model of an operator tool (services family, live; 7 tests) | Verdict: KEEP (D11); path-gate
- Covers: `scripts/pilot-update.ts` in-place pilot-unit update: device lock owns the run, HOME moved away only from Alpha and restored before agent start, dispatch only after a pre-read, signer rotation only with a durable inventory journal, start only after verified install + final stop + proven HOME. Sources exist (`scripts/pilot-update.ts`, `android-instrumentation.ts`, `provision-unit.ts`, `owner/pilot-rotation-journal.ts`, `owner/pilot-rotation.ts`, `owner/VerifyApkRotation.java`, upstream `apk-release-record.mjs`). Duplicates: `test/pilot-units.test.mjs` fake-adb integration cases of `updateUnit`/`planHome` (kept by its report); `test/pilot-rotation-journal.test.mjs` relies on this model for lost-install/re-dispatch. Callers/importers: manifest; harness `refinement/services/pilot-update.mjs` (imports `planHome`/`updateUnit`, `pilot-rotation-journal.ts` and `test/fixtures/pilot-update.mjs`; runs them against a fake adb); wrapper `test/quint-pilot-update-refinement.test.mjs` (report: DELETE) + aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P1 | Operator tool with no CI caller; the campaign runs on every PR touching `scripts/**`/`specs/**`. | Gate on `scripts/pilot-update.ts`, `scripts/owner/pilot-rotation*`, `provision-unit.ts`. | Low |
| 2 | — | D9 (script) | `pilot-update.ts` report proposes splitting `updateUnit` into `quiesce/readback/install/restore` with the same result shape; harness imports `updateUnit` and must follow. | Keep the export names stable or update the harness in the same change. | Medium |
| 3 | 14 | — | `init` enumerates four start states; fine. | None. | — |

## Proposed end state
Model unchanged; runs only when the pilot tooling changes. Owner question: keep formal models of operator tools, or let `test/pilot-units.test.mjs` be the only check.
