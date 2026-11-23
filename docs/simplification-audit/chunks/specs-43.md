# Chunk specs-43 — services refinement: launchers, Contacts replay, core-runtime harnesses

All 15 files exist and were read in full. None of them slices product source text: the launcher probes copy whole
scripts into a scratch repo and run them behind `registerHooks` ports; the Contacts replay bundles the real adapter with
regex-specifier stubs; the core-runtime harnesses bundle and run real (core-state-patched) `vendor/eliza` classes. Their
problems are path/specifier pins, duplicated skeletons, double execution, evidence ceremony and live imports from
`specs/quint/legacy`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `services/cloud-qa-launcher-probe.mjs` | launcher probe (integration) | KEEP pending owner; SIMPLIFY | shared `launcher-probe-support.mjs`; delete with `start-cloud-qa.ts` if retired |
| `services/cloud-qa-launcher.md` | prose | KEEP, trim | drop commit narrative |
| `services/cloud-qa-launcher.mjs` | driver | KEEP pending owner; SIMPLIFY | shared `runLauncherProbe` |
| `services/combined-agent-launcher-baseline.md` | historical note | DELETE | — |
| `services/combined-agent-launcher-probe.mjs` | launcher probe (integration) | KEEP pending owner, lean DELETE with `start-combined-agent.ts` | shared support if kept |
| `services/combined-agent-launcher.md` | prose | KEEP pending owner, trim | drop baseline link |
| `services/combined-agent-launcher.mjs` | driver | KEEP pending owner; SIMPLIFY | shared runner |
| `services/contacts-session-replay.mjs` | Quint MBT replay (real modules + stubs) | KEEP; SIMPLIFY | one export, no canary, stubs on typed seams |
| `services/core-runtime/connector-custody.md` | prose | KEEP, trim | drop legacy baseline link |
| `services/core-runtime/connector-custody.mjs` | refinement adapter | KEEP; MERGE legacy driver in | move `legacy/core/check-plugin-connector-custody.mjs` here |
| `services/core-runtime/lifecycle.mjs` | refinement (upstream-only) | KEEP | upstream-pin lane |
| `services/core-runtime/module.mjs` | harness support (loader) | KEEP; SIMPLIFY | drop legacy import, receipts, `loadProviderStateComposer` |
| `services/core-runtime/retirement.mjs` | refinement (upstream-only) | KEEP | upstream-pin lane |
| `services/core-runtime/shutdown.mjs` | refinement (upstream + patched) | KEEP | upstream-pin lane |
| `services/core-runtime/turns.mjs` | refinement (patched turn controller) | KEEP | upstream-pin lane |

## Coverage lost if the DELETEs happen
- `combined-agent-launcher-baseline.md`: none (documentation of a fixed bug; `metadata-write`/`metadata-stubborn` stay).
- If the owner retires `scripts/start-combined-agent.ts` (and so its harness), launcher child-custody/signal coverage goes
  with the code it covers; nothing else needs replacing. Same for `start-cloud-qa.ts`.
- Indirect: deleting `test/contacts-adapter.test.mjs` and `test/core-runtime-transform.test.mjs` (host-test chunks) loses
  nothing — this chunk's replays cover the same behaviour through real modules.
- Not covered anywhere: the writable-Contacts path (port forces `writable:false`). Owner question below.

## Shared helpers worth keeping / creating
- `specs/quint/refinement/support.mjs`: `action`, `flush`, `until` (redeclared in all four core-runtime harnesses and
  ~23 harnesses repo-wide).
- `refinement/services/launcher-probe-support.mjs`: scratch fixture writer, trace recorder, port-module + hook registration,
  exit reporter, `runLauncherProbe(probe, scenario, opts)` — shared by cloud-qa, combined and reviewed-workflow launchers.
- One `bundleAndImport` used by `core-runtime/module.mjs` and `identity-comms-traces.mjs#sourceModule`.

## Cross-file actions
1. Remove `materializeHistoricalFormalSources` from `core-runtime/module.mjs` (no-op for live callers) and move
   `legacy/core/check-plugin-connector-custody.mjs` under `core-runtime/` — both are prerequisites for retiring
   `specs/quint/legacy` (D11, specs-12).
2. Delete `loadProviderStateComposer` with legacy `check-provider-execution-refinement.mjs`.
3. Each harness here runs twice per `npm test` (per-model test + `services/index.mjs` aggregate / `forward-replays.mjs`).
   Pick one entry point for all services harnesses (T4).
4. CI: put `core-runtime/*` in an "upstream pin" lane triggered only by `upstream.lock.json`, `scripts/upstream-core-sources.ts`,
   `scripts/core-state-patch.ts` and `specs/quint/{services/Core*.qnt,refinement/services/core-runtime/**}`; put launcher
   harnesses in a lane keyed on their scripts.
5. Script renames proposed elsewhere (scripts-02 `agent-profile.ts`, scripts-08 `cloud-sdk-authority` merge, scripts-13
   `speech-env.ts`, scripts-17 manifest to JSON) must update probe copy lists in the same change — or derive the lists from an
   esbuild metafile first.
6. Contacts replay stubs must move with app-15 (`native-adapter` → `runtime/return-to-app.ts`) and app-12 (typed
   `contacts-plugin.ts`).
7. Delete unused CLI tails in `lifecycle/retirement/shutdown/turns.mjs`; delete the two exports split in
   `contacts-session-replay.mjs` in favour of one.

## Owner questions
- Is `scripts/start-combined-agent.ts` still used now that its only Android consumers (`CombinedAgent*InstrumentedTest`) are
  never run and agent pairing is out of the PRD? If not, delete it with `CombinedAgentLauncher.qnt` and its harness files.
- Is staging Cloud QA (`scripts/start-cloud-qa.ts`) still run? If yes, give it an npm script; if not, delete with `CloudQaLauncher`.
- Should the upstream-only core models (CoreRuntimeRetirement, CoreServiceLifecycle, CoreRuntimeShutdown) be offered
  upstream (D14) and dropped here after that?
- The Contacts replay pins a read-only host; does the product need a trace for the writable path the adapter now probes?
