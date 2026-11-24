# scripts/verify-cuttlefish-launcher.ts
- Lines: 55 | Kind: manual device CLI + adapter around upstream `verify-launcher-image.mjs` (Alpha package admission) | Verdict: MERGE into `scripts/aosp-check.ts launcher --target cuttlefish|pixel10a` (with `verify-pixel10a-image.ts`)
- Covers: read-only check that a booted Cuttlefish/Pixel image carries Alpha's launcher APK bytes, certificate, fingerprint and HOME role, refusing descriptors for another package. Duplicates: `verify-pixel10a-image.ts` is the same verifier with `target='pixel10a'`. Callers/importers: `verify-pixel10a-image.ts:18`; `test/cuttlefish-launcher-postboot.test.mjs` (fake-adb unit test, T3). No npm script or workflow runs the CLI.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38–41, 50 | D4 | `as unknown as` casts because the upstream `.mjs` has no types matching the `{target, admitDescriptor}` options. | Upstream follow-up (D14): add a `.d.ts` / JSDoc types to `verify-launcher-image.mjs`; then call it directly. | Low |
| 2 | 44–52 | D7 | `verifyCuttlefishLauncher` and `parseArgs` exist only for `cuttlefish-launcher-postboot.test.mjs` (stub-adb unit test, T3 → DELETE per D10). | Remove the exports when that test goes. | Low |
| 3 | 15–23 | C1 | `ImageExpectation` re-declares the upstream descriptor shape. | Use the upstream type once it exists. | None |
| 4 | 26–30 | — | The one Alpha-specific rule: descriptor `packageName` must be `app.config.json appId`. Keep. | — | — |

## Proposed end state
One `launcher` subcommand in `aosp-check.ts` (≈15 lines) that admits the descriptor's package and delegates to upstream with `--target`; `verify-cuttlefish-launcher.ts` and `verify-pixel10a-image.ts` deleted; their two stub-adb tests deleted under D10. Owner question: is either run by hand today?
