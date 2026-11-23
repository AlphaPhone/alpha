# scripts/mobile-bundle-smoke.ts
- Lines: 36 | Kind: build-output smoke (runs the produced mobile agent bundle) | Verdict: SIMPLIFY (keep)
- Covers: after `build-mobile-agent.ts` produces `dist-mobile/agent-bundle.js`, proves the bridged `uuid` namespace works inside the bundle and that the first message turn reaches the pre-provider setup (`CONTINUE_AFTER_ACTIONS`) without calling a provider. Duplicates: the UUID-algorithm half re-tests the `uuid@14.0.2` package itself (upstream library behaviour). Callers/importers: spawned by `scripts/build-mobile-agent.ts:24`; its bytes are hashed as one of `MOBILE_BUILD_INPUTS` (`scripts/mobile-uuid-adapter.ts:12`) and re-listed in `scripts/verify-packaged-runtime.py:161`; listed in `scripts/quint-lib.ts:25` (`runtimeScriptPaths`) and `scripts/source-snapshot.ts`; `specs/quint/services/manifest.json`. No npm script or workflow calls it directly.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-14 | T10 / D7 | Appends `export {MessageTurnLifetime as …, require_dist_node as …}` to a copy of the bundle: depends on two bundler-internal identifier names. A Bun minifier/renaming change breaks the build with an opaque import error. | Keep (there is no public export to use), but give a clear error when either symbol is missing (check the source text contains both names before import) and name the upstream symbol in one comment. | Low |
| 2 | 17-26 | T5 | Ten assertions re-verify `uuid` algorithms (known v3/v5 vectors, v1/v6/v7 versions, buffer offsets, NIL/MAX). The adapter only rewrites the barrel; `uuid` is pinned by digest in `upstream-mobile-build.ts`, so the algorithms cannot change without the digest gate failing. | Reduce to one bridge check: `uuid()` returns all 14 named exports as functions/constants and `validate(v4())` is true. | Low: the bridge is the only local transform. |
| 3 | 13, 36 | B4 | `process.argv=[process.execPath]` and trailing `process.exit(0)` work around bundle side effects on import (CLI argv parsing, open handles). Undocumented. | Keep with a one-line comment each, or move both into the bundle-import step. | Low |
| 4 | 28-29 | D8 | 200+ character runtime/message literal lines. | Format (Prettier pass, D9). | None |
| 5 | whole | C5 | The receipt in `mobile-uuid-adapter.ts:72` records `smoke:{uuidSemantics:true,messageTurnBeforeProvider:true}` as constants; the smoke's success is already the build's exit code. | See mobile-uuid-adapter report (B5). | Low |

## Proposed end state
A ~20-line smoke: copy bundle, append the two probe exports (with an explicit "upstream renamed X" error), check the uuid bridge exposes its 14 exports and produces a valid v4, run the pre-provider turn probe, exit. It stays spawned by `build-mobile-agent.ts` and stays an input of the mobile build identity. Editing it changes `MOBILE_BUILD_INPUTS` hashes, so the stored receipt / Quint `mobile-bundle-admission` harness must be regenerated in the same change.
