# specs/quint/legacy/core/check-service-lifecycle-refinement.mjs
- Lines: 350 | Kind: Quint refinement harness (historical/legacy family; imports and runs real upstream code, no text slicing) | Verdict: DELETE (with the `specs/quint/legacy` retirement, D11 / P6)
- Covers: replays 7 bounded schedules of upstream `AgentRuntime` service registration / public load / plugin unload / shutdown (vendor `packages/core` compiled by `loadTaskService`, isolated PGlite) against the historical TLA translation `specs/quint/legacy/CoreServiceLifecycleDesign.qnt` (+ `...Siblings` profile), and asserts one expected mismatch (publication survives a throwing `registerSendHandlers`).
- Duplicates: current-source twin `specs/quint/services/CoreServiceLifecycle.qnt` and its harness under `specs/quint/refinement/services/core-runtime/` (research ci-and-formal §2.9 lists the pair as an audit twin); upstream's own `vendor/eliza/packages/core/test/service-lifecycle-model.test.ts` (which this harness even lists as a captured source, line 201).
- Callers/importers: `specs/quint/refinement/legacy/index.mjs:21` (legacy aggregate, run by `test/quint-legacy-campaign-report.test.mjs`) and `test/quint-core-service-lifecycle-design-refinement.test.mjs:4` (per-model test) — the same campaign runs twice per test run (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12, 198-203 | P6, T5 | Models upstream-only code (`vendor/eliza/packages/core`) against a translation of upstream TLA that upstream has since retired (`packages/core/tla` no longer exists in the vendor checkout; sources are re-materialised from a historical Git revision by `loadTaskService` -> `materializeHistoricalFormalSources`). No alphaphone product code is under test. | Delete with the model, its manifest entry and both test wrappers. | Low: no product code covered; upstream keeps its own model tests. |
| 2 | 1-350 | T4 | Run by both the legacy aggregate index and a per-model test file. | Moot after delete; if kept, run from one place only. | None |
| 3 | 333-349 | B5 | Writes a mismatch receipt to `test-results/quint-refinement/*.json`, re-reads it and asserts its fields; `driverHashes`/`sources` capture is evidence ceremony. | Delete with file. | None |
| 4 | 146-151 | T8 | `waitForStart` polls with 20 ms sleeps up to 10 s for the real eager-retry timer (2 s backoff upstream) — real wall-clock wait in the test. | Delete with file. | None |
| 5 | 19-179 | C3/C5 | Local `gate()`/`settle()`/`tick` helpers duplicate `deferred`/`flush` helpers re-declared in ~37 harnesses (ci-and-formal §4). | Moot after delete. | None |

## Proposed end state
File deleted together with `specs/quint/legacy/CoreServiceLifecycleDesign.qnt`, its `legacy/manifest.json` entry, `service-lifecycle-refinement.md`, the import and `CoreServiceLifecycleDesign` row in `specs/quint/refinement/legacy/index.mjs`, and `test/quint-core-service-lifecycle-design-refinement.test.mjs`. Service-lifecycle behaviour of the runtime the APK ships stays covered by the live `services/CoreServiceLifecycle.qnt` campaign and upstream's model test. The send-handler publication divergence (finding recorded in the harness) is an upstream observation: list it as an upstream follow-up (D14), not as alphaphone coverage.
