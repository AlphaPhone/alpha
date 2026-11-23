# test/android-runtime-staging-selection.test.mjs
- Lines: 54 | Kind: tooling unit/integration (real `runtimeStagingSelection` from `scripts/stage-local-agent-runtime.ts` with a temp SDK lock and archive) + source-text (44-54) | Verdict: KEEP lines 18-43; DELETE 44-54; MERGE into `test/tooling/android-build.test.mjs`
- Covers: `agent:stage-android` refuses fallback ABIs, unreviewed Bun channels and archives that differ from the pinned SDK artifact hash. Duplicates: `test/android-app-abi-selection.test.py` (same ABI validation, Gradle side). Callers/importers: `npm test` glob; uses `fixtures/assert-order.mjs` (also used by `chooser-direct-entry`, `ci-emulator-evidence`, `cloud-email-resend`, so it survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-38 | - | Supply-chain check on the staged Bun archive (hash against pinned lock). | Keep. | Medium if dropped |
| 2 | 39-43 | D11 | Named "legacy producer" but `linux-musl` is the default target and the one `.github/workflows/resident-android.yml:76` sets, so it is live, not legacy. | Keep one assertion (default is musl with both ABIs), renamed; fold into the accept case. | Low |
| 3 | 44-54 | T1 | Package.json script strings and `includes`/order checks over the script source. | Delete. | None |

## Proposed end state
Two cases (accepts the reviewed ARM64 archive and the musl default, keeping parent env; refuses every bad selection and a
changed archive) in the Android build tooling file.
