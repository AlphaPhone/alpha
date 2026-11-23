# test/os-update-enrollment.test.mjs
- Lines: 63 | Kind: tooling integration (spawns the real `scripts/stage-os-update-enrollment.ts` on a disposable AOSP-like tree built from the real upstream `admitSystemUpdater` in `vendor/eliza/packages/os/scripts/android/system-updater-staging.mjs`, `android/aosp/pilot-system-update-enrollment.json` and the public release certificate) | Verdict: KEEP while the script is kept (owner decision, D17); MOVE to `test/tooling/os-update-enrollment.test.mjs`
- Covers: the OTA enrollment staging tool plans without writing by default, writes only the reviewed overlay and public key with `--execute`, refuses a changed product.mk, changed updater bytes, a symlink or a wrong certificate before any write, and refuses unknown/repeated options. Duplicates: none. Callers/importers: `npm test` glob. The script's only caller is this test (grep: no npm script, workflow or doc), see `files/scripts/stage-os-update-enrollment.ts.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25 | - | Real process, real inputs, temp tree: the right shape for a tooling test. | Keep. | - |
| 2 | 30-35 | B5 | Asserts several "never" booleans of the plan (`platformOrAVBKeysRotated`, `wipeData`, `signedImageProduced`, `deviceQualified`) that the script writes as constants. | Drop those four asserts (self-validation of constants); keep `executed:false` + no writes. | None |
| 3 | 49-58 | - | Four refusal modes, each with its own fixture: real safety value. | Keep. | - |
| 4 | 60-63 | B3 | Unknown/repeated option refusal tests the arg parser. | Keep one combined case; once arg parsing moves to `scripts/lib` it is covered there. | Low |
| 5 | 12 | C3 | Local sha256 helper. | Use the shared `scripts/lib` hash helper when it lands. | None |

## Proposed end state
If the owner keeps `stage-os-update-enrollment.ts` (a device/image concern, D17), this test moves to `test/tooling/` with the constant-echo asserts removed (about 55 lines). If the script is deleted, the test goes with it.
