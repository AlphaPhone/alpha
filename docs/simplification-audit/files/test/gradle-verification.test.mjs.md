# test/gradle-verification.test.mjs
- Lines: 204 | Kind: tooling (imports `scripts/gradle-verification.ts`; runs `checkVerification` on the real repo and on mutated temp copies) + some source-text | Verdict: KEEP, SIMPLIFY (move to `test/tooling/android-supply-chain.test.ts`)
- Covers: Gradle dependency verification is on, every APK coordinate has exactly one SHA-256, only reviewed publishers and repositories are used, and the checker rejects each weakening. Duplicates: `test/one-runtime-profile.test.mjs` and `test/sbom.test.mjs` also import the script. Callers/importers: `npm test` glob. Note: `npm run android:deps:check` is in no workflow and not in `verify`; this test is the only CI execution of `checkVerification(ROOT)`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-46, 93-126, 128-156, 172-180, 197-204 | — | Real tool, real inputs, mutation cases: a release gate (T5 exception). | Keep. | — |
| 2 | 40-45, 158-170 | T1 | Regex over `consumer-host.mjs`, three build scripts, every workflow and `package.json` scripts text. | Delete; the checker itself should own any "no `--dependency-verification` flag" rule if it matters. | Low |
| 3 | 48-54 | A1 / A8 | "AAPT2 provenance retains the historical producer" pins a `.mjs` filename string in the metadata for compatibility. | Delete the case; let the checker accept the current origin only after one `--write`. Owner check: rewriting metadata is a reviewed change. | Low |
| 4 | 188-195 | A8 | Asserts refusal text for removed options (`--runtime-profile`, `--local-embeddings`): a tombstone. | Delete with the refusal branch in the script. | Low |
| 5 | 182-185 | T1 | Path-list assertion about one staged module. | Delete (case 1 already fails if a script is unscanned). | Low |
| 6 | 35, 70 | B5 | `> 400` components and `>= 55` archives: counts that only guard against an empty file. | Keep `> 0` only. | Low |

## Proposed end state
About 120 lines: real-repo check, mutation rejections, repository scan, reviewed-group equality, `addArtifact` ordering.
Make `android:deps:check` a step of the Android lane (or `verify`) so the real-repo check does not depend on `npm test`.
