# test/pixel10a-image.test.mjs
- Lines: 55 | Kind: tooling (fake adb responder plus the CLI with a generated fake `adb` executable) | Verdict: DELETE
- Covers: `scripts/verify-pixel10a-image.ts` admits green or yellow verified boot, rejects orange, red and empty states, and the CLI writes a failing report for an unlocked device. Duplicates: `vendor/eliza/packages/os/scripts/__tests__/verify-launcher-image.node.test.ts` (upstream owns `verifiedBootProblem` and `verifyLauncherImage`); `test/cuttlefish-launcher-postboot.test.mjs` (the Alpha wrapper `runAlphaLauncherVerifier`/`verifyAlphaLauncherImage` that this script calls with `'pixel10a'`). Callers/importers: `npm test`. The script has no caller other than this test (`research/scripts.md:783`: manual tool).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-37 | T5 | The verified-boot rules are upstream's `sharedVerifiedBootProblem('pixel10a', …)`; the script is a 3-line alias over `verify-cuttlefish-launcher.ts`. | Delete. Upstream tests the rule. | none |
| 2 | 38-55 | T9 | Writes a fake `adb` executable that inlines the responder's source text (`${respond}`) and toggles `process.env` and `process.exitCode`. | Gone with the file. | none |
| 3 | — | A7/C5 | `scripts/verify-pixel10a-image.ts` (29 lines) duplicates the cuttlefish verifier entry point with a different target string. | Script follow-up: fold it into `verify-cuttlefish-launcher.ts --target pixel10a`, or keep it as the documented manual device tool (owner question). | low |

## Proposed end state
Test deleted. Device-image acceptance stays a manual step (AGENTS.md: an image boot is not proved by host tests). The script either
merges into the launcher verifier with a `--target` flag, or stays as is with no test of its own.
