# scripts/toolchain.ts
- Lines: 13 | Kind: script helper (Android SDK/JDK environment) | Verdict: KEEP, extend (it is the one place adb/SDK resolution should live)
- Covers: resolves `ANDROID_HOME`/`JAVA_HOME` through the upstream mobile toolchain and returns an env + build-tools path. Duplicates: 27 scripts resolve `ANDROID_HOME` themselves and 16 build their own `adb` runner (research `scripts.md` §4 table: `ci/emulator-suite.ts:50`, `android-instrumentation.ts:85`, `provision-unit.ts:74`, `pilot-update.ts:49`, and the three `verify-aosp-*` CLIs in this chunk). Callers/importers: 25 scripts, `specs/quint/refinement/services/pilot-update.mjs`, 5 tests (git grep "toolchain.ts").

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11–13 | — | `tool()` calls `androidEnv()` on each use, re-resolving SDK and JDK (spawns `java -version` upstream via `javaMajorVersion`). | Memoise `androidEnv()` once per process. | Low |
| 2 | 12 | C6 | Build-tools `36.0.0` and the "platform 36"/"JDK 21" literals are also hard-coded elsewhere (Gradle files, `prepare-ci-emulator.ts`). | Export `BUILD_TOOLS = '36.0.0'` here and import it. | Low |
| 3 | — | C3 | Missing `adb(serial)` helper, so every device script rebuilds `path.join(env.ANDROID_HOME,'platform-tools/adb')` + `execFileSync(adb,['-s',serial,…])` + the same serial regex. | Add `adb(serial, {timeout, maxBuffer})` returning `(...args) => string` and `type Adb`; migrate the 16 call sites. | Low |

## Proposed end state
`toolchain.ts` (or `scripts/lib/android.ts` per the helpers ledger) exports memoised `androidEnv()`, `tool(name)`, `BUILD_TOOLS`, `adb(serial)` and `type Adb`; no other script reads `ANDROID_HOME` directly.
