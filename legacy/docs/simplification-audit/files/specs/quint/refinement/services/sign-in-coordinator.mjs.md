# specs/quint/refinement/services/sign-in-coordinator.mjs
- Lines: 68 | Kind: Quint refinement harness (compiles and executes real Java on a JVM) | Verdict: KEEP (SIMPLIFY)
- Covers: `IdentitySession.qnt` (live, `specs/quint/services/manifest.json:31`) against `android/.../AlphaCloudSignInPlugin.java`, `CloudDeployment.java`, `PluginWorkers.java` and the patched shared `ai/eliza/auth/cloud/*` classes produced by `scripts/prepare-patched-native.ts`; 21 schedules via `SignInCoordinatorTraces.java`/`SignInTestPorts.java`. Duplicates: run twice per verify — `test/quint-signin-refinement.test.mjs` (subprocess) and the services aggregate `services/index.mjs:23,77`. Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 6 | D8 | Two separate imports from `../native/java.mjs` (`root`, `javaTraceCampaign`). | One import. | None |
| 2 | 33-41, 47-54 | B5 | `sources` list includes the harness file, the test file (`extraSources`), `upstream-native-sources.json` and `AlphaCredentialStore.java` (which is *not* compiled: the stub in `sign-in-platform.mjs` replaces it) only to hash them into a receipt; `assumptions` strings are receipt prose. | Drop `captureInputs`/`driverHashes`/`extraSources`/`assumptions` when `check-traces.mjs` drops receipts; keep only the compile list. | Low |
| 3 | 64-68 | T9 | Standalone CLI entry is a third way to run the same check; nothing calls it (grep: only the `.md` mentions the command). | Delete. | None |
| 4 | – (test) | T9 | `test/quint-signin-refinement.test.mjs` spawns `node -e` to call this function, although every schedule already runs in its own JVM (`javaTraceCampaign`), so there is no in-process URL-factory leak to isolate. | Call `runSignInCoordinatorRefinement()` directly from the runner. | Low |
| 5 | 9-15 | – | Real Java executed, no text slicing; Alpha's legacy-recovery paths are not exercised (stub members in `sign-in-platform.mjs` throw). | Keep the harness shape. | – |

## Proposed end state
~40 lines: compile the product + patched shared sign-in classes with the stubs from `sign-in-platform.mjs`, run the 21
schedules, compare with `IdentitySession`. No receipt inputs, no CLI block, one caller (manifest-driven refinement
runner, JVM lane). Cost note: one JVM per schedule; the test allows 360 s, so it belongs in the JVM/refinement lane
selected only when `android/**/AlphaCloudSignIn*`, `AlphaCredentialStore`, the shared auth sources or the model change.
