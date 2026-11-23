# specs/quint/application/MountedUpdateAdmission.qnt
- Lines: 125 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (main.tsx slice)
- Covers: mounted app-update admission: one active activation/bridge owns navigation blocking, acknowledgement is exact, Continue coalesces, refusal notice only at the exact failure (`main.tsx` `prepareMountedUpdate`, upstream `app-update-gate.ts`, `AlphaDevicePlugin.java`). Duplicates: native `specs/quint/refinement/native/update-barrier.mjs` references the same model name. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `mounted-update-admission.mjs` via `test/quint-mounted-update-admission.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 214-229 | T2/T10 | Slices main.tsx from `async function prepareMountedUpdate(` to `\nlet nativeAppUpdateGate`, slices settings-adapter.ts `export function updateIdle(`…`automaticUpdateIdle`, injects at `  let notified = false;` in the upstream gate. | Move `prepareMountedUpdate` + `watchMountedAppUpdates` glue out of main.tsx into `runtime/mounted-update.ts` (main.tsx split, stage F) and export the idle policy from settings-adapter; import both. | H: main.tsx split breaks it |
| 2 | harness 205-212 | B5 | Hashes the projected gate and the vendor file and asserts the stamp, plus "retired updater patch has no receipt". | Delete; `prepare-client-features` owns projection integrity. | L |
| 3 | manifest | — | Lists `AlphaDevicePlugin.java` but this harness is renderer-only (native side in update-barrier.mjs). | Keep only if update-barrier is its refinement; otherwise drop. | L |
| 4 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports `runtime/mounted-update.ts` and the settings idle policy; no hashes.
