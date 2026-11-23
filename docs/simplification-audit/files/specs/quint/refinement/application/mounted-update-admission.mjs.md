# specs/quint/refinement/application/mounted-update-admission.mjs
- Lines: 286 | Kind: Quint refinement harness, source transplant (T2/T10) | Verdict: PORT
- Covers: the mounted Android app-update freeze (`prepareMountedUpdate` in `main.tsx` plus upstream `watchMountedAppUpdates` in `app-update-gate.ts`): draft flush of five owners, exact activation/bridge ownership, single-flight Continue, reconnect only after exact cancel, automatic refusal while busy. Model `specs/quint/application/MountedUpdateAdmission.qnt` (live, manifest-listed).
- Duplicates: the same campaign runs twice, via `test/quint-mounted-update-admission.test.mjs` and via `index.mjs:102` inside `test/quint-application-refinement.test.mjs` (T4). No Playwright spec drives the update modal. Callers/importers: those two only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 213-234 | T10/T2 | Cuts `main.tsx` from `async function prepareMountedUpdate(` to `\nlet nativeAppUpdateGate`, cuts `settings-adapter.ts` from `export function updateIdle(` to the end of `automaticUpdateIdle`, splices `globalThis.inspect` into the upstream gate after the marker `  let notified = false;`, strips `export`, then runs the text in `vm` with `let shell = fixtureShell`. Any rename, split or reformat of `main.tsx` breaks it. | Move `prepareMountedUpdate` out of `main.tsx` into an exported module (for example `apps/app/src/app-update-mount.ts`) that takes `shell` and `connectionController` as parameters. Import `updateIdle`/`automaticUpdateIdle` (already exported). Load with `sourceModule`/`loadProductModule` and stub `@capacitor/core`. | Medium: observation of `active/acknowledged/reconnect/localRefusal` needs the injected inspector. |
| 2 | 224-225 | T10, D14 | The inspector is spliced into upstream code (`.eliza/client-features/packages/ui/src/state/app-update-gate.ts`). | Either observe only DOM + port calls (dialog open, Continue visible, `activateUpdate`/`continueUpdate` payloads, restart calls) and drop the four private fields from the projection, or ask upstream to export a read-only `inspect()` (D14 follow-up). | Medium: model projection loses 4 of 17 fields if the first option is chosen. |
| 3 | 204-212 | B5 | sha256 of the prepared gate vs `.source.json` vs `vendor/eliza`, plus `assert.equal(Object.hasOwn(stamp,'appUpdateResumePatch'),false,'the retired updater patch has no receipt')`. That is `prepare-client-features` checking its own output, and a tombstone assertion (A8). | Delete lines 204-212 and the `checkClientFeatures()` call; `npm run prepare` owns projection integrity. | Low. |
| 4 | 200-203 | B5 | `AlphaDevicePlugin.java`, `upstream.lock.json`, `scripts/*.ts` are captured as "sources" though nothing here executes them. | Capture only executed modules (the bundle metafile gives them). | Low. |
| 5 | 38 | C1 | Shell fake `S()` and flag names re-declared inline. | Use the shared shell type once `prototype/shell-types.ts` lands. | Low. |

## Proposed end state
- Harness imports the extracted `prepareMountedUpdate` module and the upstream gate through one bundler helper; no text slicing, no hash ceremony.
- Keep the 7 schedules (they are the only coverage of the update freeze).
- One test entry point: either the per-model wrapper or the family aggregate, not both.
- Add a Playwright case to `journeys/settings.spec.ts` ("update ready → Continue update → navigation blocked") only if the test-mocks native bridge can emit `alphaUpdateReady`; otherwise this harness remains the sole coverage.
