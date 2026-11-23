# specs/quint/refinement/services/mobile-bundle-admission.mjs
- Lines: 392 | Kind: Quint refinement harness over build tooling (imports real `scripts/mobile-uuid-adapter.ts`, `scripts/core-state-patch.ts`, `scripts/build-policy-source.ts`; runs them in private scratch from `test/fixtures/mobile-uuid-build.mjs`) | Verdict: KEEP; absorb the receipt cases of `test/mobile-uuid-build.test.mjs`
- Covers: the mobile agent bundle receipt gate — input admission (policy, source stamp, SDK lock, UUID package bytes, inventory, regular files, adapters, core authentication), receipt issue requiring exact UUID/connector transforms, written-vs-candidate separation, stale receipt after producer/adapter/stamp/bundle drift, malformed/missing receipt, tampered smoke/provenance fields, alternate consumer directory; 11 traces. Duplicates: `test/mobile-uuid-build.test.mjs` tests 3 (changed producer/lock/module/version rejected), 4 (symlink and extra modules) and 5 (exactly one transform, receipt tamper, bundle drift) are subsets of the scenarios here; its test 6 is a source-text test (T1) of `stage-local-agent-runtime.ts`, `android-build-preflight.ts`, `source-snapshot.ts`, `verify-packaged-runtime.py`, `build-mobile-agent.ts`. Callers/importers: `test/quint-mobile-bundle-admission.test.mjs`, `services/index.mjs:48,81`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Receipt/input-gate behaviour tested twice (here and `test/mobile-uuid-build.test.mjs` 3-5). | Delete tests 3-5 and 6 (T1) of `mobile-uuid-build.test.mjs`; keep its tests 1-2 (barrel bridge rewrite and parser refusal), which this replay does not cover. | low |
| 2 | 37-59 | T10 (message text) | `refusal` maps errors to outcome kinds by regex on error *messages* (`/Unreviewed mobile UUID build policy/`, `/source differs from reviewed pin/`, …). Rewording any message in `mobile-uuid-adapter.ts` breaks the replay. | Product: give each refusal a `code` (`policy`, `stamp`, `producer`, …) on the thrown error; harness maps `error.code`. | low |
| 3 | 296-308 | B5 | Hashes ~60 source paths (vendor files, node_modules/uuid files, core inputs) and asserts `core.inputHashes` equal its own capture before running. | Drop with `check-traces.mjs` simplification; the fixture already copies exact bytes. | low |
| 4 | 385-391 | B5 | Assumption prose. | Header comment. | none |
| 5 | 13-35 | — | Calls the real esbuild plugin `setup` with a fake `onLoad` to collect core transforms — a good port, keep. | Keep. | none |
| 6 | 300-305 | coupling | Sources list hard-codes `vendor/eliza/packages/app/scripts/lib/*.mjs`; breaks on upstream moves even though only used for hashing. | Gone with finding 3. | none |

## Proposed end state
~340 lines: same 11 traces, refusal classification by error code, no source-hash prelude. Build-tool model stays live (receipt gate runs in `stage-local-agent-runtime.ts` and `android-build-preflight.ts`). `test/mobile-uuid-build.test.mjs` shrinks to the two bridge/parser tests.
