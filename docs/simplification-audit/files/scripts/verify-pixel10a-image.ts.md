# scripts/verify-pixel10a-image.ts
- Lines: 29 | Kind: manual device CLI (Pixel 10a target of the shared launcher image verifier) | Verdict: MERGE into `scripts/aosp-check.ts launcher --target pixel10a`
- Covers: same as `verify-cuttlefish-launcher.ts` plus the verified-boot state rule (green/yellow only). Duplicates: `verify-cuttlefish-launcher.ts` (same verifier, other target). Callers/importers: `test/pixel10a-image.test.mjs` only (stub-adb unit test, T3).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20–25 | D7 | `verifiedBootProblem` and `verifyPixel10aImage` are thin re-exports for the test. | Delete with the test (D10). | Low |
| 2 | 2–14 | — | Long usage docstring with the `/product/priv-app` vs `/product/app` rule. Useful; keep it as the subcommand's help text. | Move into `aosp-check.ts` help. | None |
| 3 | whole | A7 | No npm/CI caller. | Owner question: manual image acceptance tool still used? Keep if yes. | None |

## Proposed end state
Deleted; `aosp-check.ts launcher --target pixel10a` carries the help text and delegates to upstream (which already implements the verified-boot rule).
