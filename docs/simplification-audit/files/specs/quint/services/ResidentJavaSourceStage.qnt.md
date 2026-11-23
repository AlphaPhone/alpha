# specs/quint/services/ResidentJavaSourceStage.qnt
- Lines: 86 | Kind: Quint model of build tooling (services family, live; 7 tests) | Verdict: KEEP (D11); path-gate
- Covers: `scripts/stage-local-agent-sources.ts` (Gradle `stageLocalAgentSources`): resident-host Java and its provenance manifest publish as one generation; refused inputs (wrong pin, no stamp, dirty), anchor rewrite failure or occupied output keep the published pair; a failed restore keeps both prior and candidate. Sources exist (`stage-local-agent-sources.ts`, `local-agent-source.ts`, `android/consumer-host.json`, `app.config.json`, `upstream.lock.json`, upstream `resident-host-sources.mjs`, `immutable-workspace-source.mjs`). Duplicates: `test/android-host.test.mjs:95`, `test/resident-native-ci-admission.test.mjs` (text checks, other chunks). Callers/importers: manifest; harness `refinement/services/resident-java-source-stage.mjs` (runs the real script via `test/fixtures/resident-java-source-stage.mjs`); wrapper `test/quint-resident-java-source-stage.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 33-50 | B5 | Faults `move`/`publish`/`restore` model a backup-and-restore publication around a directory rename. If the script simplification replaces it with build-into-temp + single rename (the Gradle output dir is disposable), the `stranded` state and two tests go. | Shrink with the script; otherwise keep. | Low |
| 2 | — | T4 | Wrapper + aggregate. | One runner. | Low |

## Proposed end state
Model kept while the stage step keeps its restore protocol; runs only when the stage script, `consumer-host.json` or the upstream pin changes.
