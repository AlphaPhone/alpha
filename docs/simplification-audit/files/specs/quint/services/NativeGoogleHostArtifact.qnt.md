# specs/quint/services/NativeGoogleHostArtifact.qnt
- Lines: 131 | Kind: Quint model of build tooling (services family, live; 10 tests) | Verdict: KEEP (D11), SIMPLIFY with the script; path-gate
- Covers: `scripts/native-google-host-artifact.ts` build/verify of the fixed-name `google-host.mjs` worker module: input-bound receipt, producer order (projection → version → compile → module → metadata), failed builds keep the prior pair, verify reports missing/source/bytes. Manifest lists 56 sources (scripts, product runtime files, ~35 upstream files, `package.json`, `tsconfig.json`); all exist. Duplicates: `test/native-cloud-routing`-style checks in `scripts/test-native-cloud-runtime-config.ts` verify the same artifact (scripts report). Callers/importers: manifest; harness `refinement/services/native-google-host-artifact.mjs` (spawns the real script in a temp checkout; imports `coreStateReceipt` from `scripts/core-state-patch.ts`) + `native-google-host-artifact-probe.mjs`; wrapper `test/quint-native-google-host-artifact.test.mjs` + aggregate (T4). Runtime: spawns Bun builds; one of the slower services campaigns.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-16, 28-45 | B5 | Twenty failure modes mirror the script's check-act-check ceremony (re-hash inputs after compile, compare to snapshot, roll back a failed manifest rename). `scripts/native-google-host-artifact.ts` report proposes removing that ceremony (~90-line script). | When the script is simplified, shrink `Modes` to what remains (ok, input/sdk drift, compiler refusal, output drift, manifest refusal) and drop the matching tests. | Medium: model and script must change together |
| 2 | manifest sources | P1 | 56 sources including `package.json` and `tsconfig.json` make almost any change re-run this campaign. | Gate on `scripts/native-google-host-artifact.ts`, `build-native-google-host.ts`, `workflow-worker-artifact.ts`, `upstream.lock.json`. | Low |
| 3 | — | T4 | Wrapper + aggregate. | One runner. | Low |

## Proposed end state
Model kept while the build step exists; trimmed to the simplified script's real outcomes (~90 lines); runs only on its own script or the upstream pin. Owner question (chunk summary): whether build-tool models stay formal or become plain integration tests.
