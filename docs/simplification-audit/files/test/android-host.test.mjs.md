# test/android-host.test.mjs
- Lines: 177 | Kind: tooling integration (runs the pinned upstream `generateAndroidConsumerHost` on a temp consumer built from `android/consumer-host.json` references) + descriptor-value assertions + source-text (product.gradle, .gitignore, vendor `ElizaAgentService.java`) | Verdict: KEEP, trimmed; MERGE into `test/tooling/android-build.test.mjs`
- Covers: the upstream generator accepts Alpha's host descriptor; test mocks reach debug only; admission steps run before every build; generated files are git-ignored; resident socket names and notification strings stay Alpha's. Duplicates: `test/alpha-system-entry.test.mjs:97-131` (same rewrite and strings), `test/android-app-abi-selection.test.py` (ABI filters). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 64-86, 88-107 | B3-ish | Many `deepEqual`s of generated profile fields against the descriptor's own values (identity, sdk, signing names, admission list, generation inputs): data equals data; every descriptor edit means editing the test. | Keep: generator accepts the descriptor; release has `releaseMinify`, `shrinkResources`, `abiFilters ['arm64-v8a']`; test mocks only in debug; admission includes `stageLocalAgentSources`. Drop the rest. | Low |
| 2 | 108-112 | T1 | Regex over `product.gradle` for task names and banned words. | Delete. | None |
| 3 | 134-142 | - | Every generated file is git-ignored: cheap, real, prevents committing build outputs. | Keep. | Low |
| 4 | 144-166 | T5, T4 | Runs upstream rewrite on vendor source; duplicated by `alpha-system-entry`. The installed socket names are persisted identities (G5). | Keep the socket-name assertion only; delete the rest. | Low |
| 5 | 115-132 | - | Module list asserts `sense`, fixtures, and `elizaos-capacitor-secure-store-nativeonly` are separate; will change with the Android deletions (AlphaListener, fixtures). | Assert a property (fixture modules are never `appDependency`) instead of a literal list. | Low |
| 6 | 55 | P1 | Copies `node_modules/@capacitor/android/capacitor` per test (5 generations). | Generate once per file (`before`). | - |

## Proposed end state
Four cases in `test/tooling/android-build.test.mjs`, one generation shared by all: descriptor accepted with release
hardening; test mocks debug-only plus admission order; generated files git-ignored; installed socket names unchanged.
