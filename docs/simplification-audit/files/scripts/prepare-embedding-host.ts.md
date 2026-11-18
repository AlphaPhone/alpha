# scripts/prepare-embedding-host.ts
- Lines: 100 | Kind: build step (top-level CLI) | Verdict: KEEP, SIMPLIFY; MERGE `embedding-build-remap.ts` (18 lines, one caller) into it
- Covers: stages the pinned fused engine's relocated JNI sources into an isolated output, optionally builds `libelizainference`/`libelizavoicejni` with the NDK, checks ABI, required symbols and 16 KiB alignment, and writes `PREPARATION.json`. Duplicates: pin/gitlink check twin `paradee-runtime.ts:34-39`. Callers/importers: `build-embedding-host.ts:164` (spawned; `npm run agent:build-embedding-host`, part of `android:build:local`, resident-android.yml); workflows mention it only in comments; tests `embedding-host-preparation.test.mjs` (spawns it), `embedding-host-producer-closure.test.mjs`, `strict-build-inputs.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-16 | C3 | Hand-written arg loop + `option()`. | `node:util parseArgs`. | none |
| 2 | 22 | C3 | Local git wrapper. | Shared. | none |
| 3 | 49, 55-57, 88, 91-92 | C3 | SHA-256 computed inline five different ways. | Shared `sha256()`. | none |
| 4 | 90-96 | B5 | Re-hashes producer inputs and re-checks both pins after the build. | Delete; the build ran on the staged copy, and the receipt already records hashes taken before it. | low |
| 5 | 73 | B5 | Receipt constants `packaged:false`, `runtimePolicyChanged:false`. | Drop constant fields. | low (check `stage-embedding-host.ts` reads) |
| 6 | 9 | D4 | `embedding-build-remap.ts` has one caller. | Inline. | none |
| 7 | all | D8 | Dense multi-statement lines throughout. | Format and split into functions (`stage`, `build`, `inspect`). | none |

## Proposed end state
~80 readable lines with a `main()`, shared hash/git/arg helpers, the remap inlined, no post-build re-authentication. Its host test should run only the staging (no `--build`) path against a fixture fork, as an integration test of the build input closure.
