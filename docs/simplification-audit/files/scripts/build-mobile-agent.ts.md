# scripts/build-mobile-agent.ts
- Lines: 30 | Kind: build pipeline step (Bun: wrap upstream mobile agent bundler with the core-state patch, smoke-test the bundle, write receipt) | Verdict: KEEP + SIMPLIFY (light)
- Covers: the on-device agent bundle is built by the pinned Bun with Alpha's core-state transform and passes a UUID/message-turn smoke before staging. Duplicates: none. Callers/importers: spawned by `scripts/stage-local-agent-runtime.ts`; referenced by `mobile-uuid-adapter.ts`, `verify-packaged-runtime.py`; receipt `alpha-mobile-build.json` is read by `mobile-uuid-adapter.ts:77` / `stage-local-agent-runtime.ts` (real hand-off); tests `mobile-uuid-build.test.mjs:55-56` (T1 regex on this file), `android-build-path.test.mjs:218`, `android-runtime-staging-selection.test.mjs:51` (T1 order checks on the caller's text); Quint `services/manifest.json:2231`; `quint-lib.ts`, `source-snapshot.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-21 | D2 | Monkey-patches `Bun.build` globally so the upstream builder picks up the plugin. Works, but is a global patch. | Ask upstream to accept extra plugins via env/option (D14 follow-up); keep until then. | - |
| 2 | 14 | B3 | Exact Bun version/revision check; the receipt binds it. Release-relevant (bytes depend on Bun). Keep. | - | - |
| 3 | 11 | - | Usage check requires the literal `--target=android` argument that is never varied. | Drop the argument from the caller and the check. | None. |
| 4 | whole | T1 | Three tests regex this file or its caller's text instead of running it. | Delete those assertions; the staged-runtime build in `android:build:local` / resident CI is the integration coverage. | None. |

## Proposed end state
Unchanged ~28 lines; T1 tests removed. Upstream follow-up for a plugin option.
