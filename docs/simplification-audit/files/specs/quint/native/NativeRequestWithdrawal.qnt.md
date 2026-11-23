# specs/quint/native/NativeRequestWithdrawal.qnt
- Lines: 136 | Kind: Quint model with witnesses, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness bundles the real `apps/app/src/runtime/local-agent.ts` with esbuild and compiles a text slice of `AlphaLocalAgentPlugin` | Verdict: KEEP (harness: PORT the Java side)
- Covers: Plain local-agent requests: renderer abort → native `cancelRequest` withdraws queued/enrolling calls before dispatch, a dispatched call is answered once while the worker stays on the transport, supersession answers each call once, two workers bound (5 runs, 7 invariants, 5 witnesses). Duplicates: none. Callers/importers: manifest (`symbols` pins `cancelRequest`, `withdrawable`, `forgetWithdrawable`, …; `sharedSources` → `packages/app/platforms/android/.../ElizaAgentService.java`); `specs/quint/refinement/native/request-withdrawal.mjs` (+`request-withdrawal-platform.mjs`, `RequestWithdrawalReplay.java`, `itf-replay.mjs`); `test/quint-native-request-withdrawal.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`). Not listed in `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `request-withdrawal-platform.mjs:14-22` | T10 | Reads `AlphaLocalAgentPlugin.java` (1.4k-line god class, D1) and cuts the request path from ` @PluginMethod public void request(` between further anchors; any edit or the planned split breaks it. | PORT: move request admission/withdrawal (`request`, `cancelRequest`, `withdrawable`, `forgetWithdrawable`, the two workers) into a package-private class (e.g. `LocalAgentRequests`) that the harness compiles whole with `PluginWorkers.java`. | Medium: harness must be ported in the same change as the split |
| 2 | `request-withdrawal.mjs:25-55` | T10 / B5 | Parses this `.qnt` file's own `run … = …then(…)` text by regex to rebuild commands, asserts exactly 5 runs and `/5 passing/`. | Generate ITF traces with `quint run`/`test --out-itf` and replay states only; drop the count asserts. | Low |
| 3 | manifest `symbols` | T10 | Symbol-name pins in the manifest fail on any rename. | Pin files, not symbols. | None |
| 4 | renderer side | — | Renderer half already imports the real module (esbuild bundle). Target shape. | None. | — |
| 5 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |

## Proposed end state
Model unchanged. Java half compiled from a small extracted class instead of a text slice; renderer half unchanged; traces from ITF only; manifest pins files. Add a `native/README.md` line.
