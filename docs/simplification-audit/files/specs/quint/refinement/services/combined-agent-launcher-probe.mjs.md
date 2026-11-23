# specs/quint/refinement/services/combined-agent-launcher-probe.mjs
- Lines: 389 | Kind: Quint refinement probe (integration: copies `scripts/start-combined-agent.ts` and helpers into a scratch repo, runs it with `registerHooks` ports for `node:child_process`, `node:net`, `node:fs`, spawns a real synthetic Node child with IPC) | Verdict: KEEP pending owner — lean DELETE with `scripts/start-combined-agent.ts` (see chunk android-06/scripts-08 questions)
- Covers: 21 schedules of the combined launcher: version/source/port/profile/speech/marker/routing refusals, validate-only, core overlay choice, metadata write failure with SIGTERM/SIGKILL fallback, signal forwarding, child exit. Duplicates: `test/agent-identity.test.mjs:103` (runs `--validate-only`), twin probes `cloud-qa-launcher-probe.mjs`, `reviewed-workflow-launcher-probe.mjs`. Callers/importers: only `combined-agent-launcher.mjs:11` (spawned).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-20 | T10 (path pins) | Copies ten scripts by literal path; scripts-02 plans merging `agent-identity.ts`/`agent-model.ts` into `agent-profile.ts`, scripts-13 drops `speech-env.ts`. Each breaks this probe. | Derive the copy set from an esbuild metafile of the launcher (shared helper with twins). | Low |
| 2 | 341-350 | T10 | Module-hook port mapping keyed on `parentURL === entry`; moving `spawn` into `launcher-child.ts` would bypass the port. | Prefer exporting a `launch(ports)` function from the script. | Medium |
| 3 | 72-76 | B3 | Re-asserts scratch layout/mode the parent just created. | Delete. | None |
| 4 | 223-228 | T8 | Busy-wait (`Atomics.wait` up to 5 s) for the stubborn child's ready file. Condition-based, bounded; acceptable. | Keep. | Low |
| 5 | whole | C5 | Skeleton shared with two twin probes (write/json helpers, `action`, trace/point, port module writer, exit reporter). | One `launcher-probe-support.mjs`. | Low |
| 6 | whole | D5 / A3 | The launcher hosts an agent on 47858 for emulator tests over `10.0.2.2`; the only Android consumers (`CombinedAgent*InstrumentedTest`) are never run and android-06 proposes deleting them; PRD excludes agent pairing. Remaining caller: `scripts/android-browser-reading-live.ts`. | Owner decision: if retired, delete probe, driver, docs, `CombinedAgentLauncher.qnt`, manifest entry, `test/quint-combined-agent-launcher-refinement.test.mjs`, `combined-agent-source.ts`, frozen branch of `core-state-preload.ts`. | Medium (owner) |
| 7 | whole | cost | 21 child processes, each with `git init` and a real child Node; timeout 20 s each; run twice (test + aggregate). | Run once; path-scope. | Low |

## Proposed end state
Either deleted with the combined launcher (preferred if the owner confirms no live use), or kept at ~250 lines on a shared
probe support module with a metafile-derived copy list.
