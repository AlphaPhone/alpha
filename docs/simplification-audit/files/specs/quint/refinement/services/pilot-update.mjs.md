# specs/quint/refinement/services/pilot-update.mjs
- Lines: 207 | Kind: Quint refinement driver (imports and runs real `planHome`/`updateUnit` and the real rotation journal against a scripted adb port on a temp filesystem) | Verdict: KEEP
- Covers: `PilotApkUpdate` (live, `manifest.json:1833`): device lock, HOME hand-off/restore readbacks, process quiescence before install and launch, pre/post data readback, unknown installer response consuming the rotation, verified install certified even if the agent refuses startup. Duplicates: `test/pilot-units.test.mjs` and `test/pilot-update-export.test.mjs` test parts of `pilot-update.ts` directly (other chunks). Callers: `services/index.mjs:40,88`; `test/quint-pilot-update-refinement.test.mjs` (DELETE per its report, so the aggregate replacement must run it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 65-68, 182 | A1 / D17 (owner) | `legacy-export` fault: the device answers `Unknown authority` for the integrity export, i.e. an installed APK that predates `DataIntegrityProvider`. After the 2026-11-10 package rename every pilot unit runs a build that has the provider, unless pilot units still carry the old package. | Owner question (install-base fact, D17 class). If confirmed, delete the scenario, the fault branch and the `package-only` evidence class in model and script. | Medium |
| 2 | 10-17 | B5 | 14 pinned input paths captured before import; receipts only. | Keep while receipts exist. | — |
| 3 | 23-27 | — | Real dynamic imports of the scripts: the model the T10 port aims at. | Keep. | — |
| 4 | 99-106 | — | Locates command order by scanning adb argv (`add-role-holder`, `set-home-activity`, `force-stop`): ties the trace to adb command shapes, which are the effect boundary. Acceptable. | Keep. | — |
| 5 | — | owner | `scripts/pilot-update.ts` has no npm/CI caller (operator tool per its report). The model is live while the tool is. | No change. | — |

## Proposed end state
Unchanged import-based campaign, minus the legacy-export scenario if the owner confirms; run once from the
manifest-driven runner with a path filter on `scripts/pilot-update.ts`, `scripts/owner/pilot-rotation*`,
`scripts/android-instrumentation.ts`.
