# scripts/start-combined-agent.ts
- Lines: 66 | Kind: development launcher (frozen combined source) | Verdict: KEEP pending owner (live Quint model), SIMPLIFY
- Covers: launches a frozen, manifest-verified "combined" Eliza source tree with exact Node 26.13.0 / Bun 1.4.2 binaries on fixed port 47858 in an owner-only profile, using the Cerebras key. Duplicates: launcher skeleton of `start-local-remote.ts` (token/config/identity/env/log); its own `privatePath` check (30) twins `start-cloud-qa.ts:18-24`. Callers: no npm script/workflow; `scripts/android-browser-reading-live.ts:44-62` reads its profile and port 47858; `scripts/android-instrumentation.ts:329` names it for CombinedAgent instrumented tests; listed in `quint-lib.ts:16`; Quint `combined-agent-launcher.mjs:22`, `combined-agent-launcher-probe.mjs:14` (runs it), `CombinedAgentLauncher.qnt`, `services/manifest.json:2084`; tests `agent-identity.test.mjs:103` (runs `--validate-only`), `core-state-patch.test.mjs:113` (T1), `llama-cpp-only.test.mjs:36` (list).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26 vs `android-instrumentation.ts:329`, `CombinedAgentInstrumentedTest.java:18` | bug (PLAUSIBLE) | Launcher binds 47858, but the instrumentation note and `CombinedAgentInstrumentedTest`/`CombinedAgentRestartInstrumentedTest` target `10.0.2.2:47859`, which is `dev-cloud.ts`'s default port. No proxy maps one to the other. | Owner/device check: align the Java tests (or the note) on 47858. | Medium (those device tests would talk to the wrong host). |
| 2 | 16-17 | B3 | Exact Node/Bun version pins enforced by spawning both binaries. | Keep only if the frozen-source contract requires it (it is in the Quint model); otherwise read versions from `toolchain.ts`. | Low |
| 3 | 30, 35-49 | C5 / D8 | Own `privatePath` and token/config/log setup, dense one-liners. | Shared `privateFile()` and `launchPrivateDevServer` from `private-runtime-launch.ts`; `superviseLauncherChild` folds into it (research: merge `launcher-child.ts`). | Medium (model's launcher behaviour must stay identical). |
| 4 | 1-66 | D8 | Top-level script, no `main`. | Wrap in `main()` with the CLI guard. | — |

## Proposed end state
~35 lines: frozen-source admission (manifest + version contract) then the shared launch function. Owner
question: is the combined frozen-source launcher still used (only `android-browser-reading-live.ts`
and two instrumented tests depend on it)?
