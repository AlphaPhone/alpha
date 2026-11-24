# test/fixtures/jvm-tools.mjs
- Lines: 63 | Kind: test support (JDK / org.json / sqlite3 discovery, `runJvm` javac+java runner, path helpers) | Verdict: KEEP (shrink as its DELETE importers go); MOVE to `test/support/jvm.mjs`
- Covers: nothing by itself; it is the shared host-JVM runner. Duplicates: `test/fixtures/calendar-sync-snapshot-jvm.mjs:9-19`, `specs/quint/refinement/native/java.mjs`, ~70 host tests that call `execFileSync(javaBinary('javac'))` with their own `mkdtemp`/`rmSync`, 7 local `JAVA_HOME` resolvers (tests-host.md P6). Callers/importers: 146 files: ~113 host tests, 31 Quint refinement harnesses (`specs/quint/refinement/native/*`, `application/os-*.mjs`, `services/native-google-access-file.mjs`), `test/fixtures/kotlin-tools.mjs`, `test/fixtures/calendar-sync-snapshot-jvm.mjs`, `scripts/test-android-notification-device-slot.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | — | Survival: the great majority of host-test importers are T2 transplants that compile sliced Java (DELETE per D10). The 31 live Quint native harnesses still need `javaBinary`/`runJvm`/`jvmSkip`, so the module survives. | Keep; prune exports no surviving importer uses after the test deletions. | Low. |
| 2 | 10-18 | A7, D13 | Six path helpers (`nativeSource`, `fixture`, `upstreamConnection`, `upstreamAgentRuntime`, `upstreamVoiceSource`, `upstreamBridgeSource`, `upstreamVoiceFixture`) used by ~26 files, several pointing into `vendor/eliza` source and upstream test fixtures (`paradee-voice/speech-pipeline`). Upstream fixtures exercised from here are T5 (tests of upstream). | Re-check after deletions; drop helpers with no importer; upstream-fixture helper goes with the upstream tests (R6 follow-up). | Low. |
| 3 | 25-27 | C7, P3 | Scrapes `~/.gradle/caches/.../org.json/json/20250517` for the jar. Works only after a Gradle run; CI depends on cache state. | Resolve org.json once in the CI setup step (or a Gradle `copyTestJars` task) and set `ALPHA_JSON_JAR`. | Low. |
| 4 | 40-46 | B3/T9 | `jvmSkip` returns `false` on CI so missing tools fail loudly; locally it skips. Reasonable policy, keep, but it is evaluated at import (`jsonJarSkip` constant), spawning nothing for json but `javac -version` lazily. Fine. | Keep. | None. |
| 5 | 49-56 | C3 | `runJvm` is the one helper the ~70 inline javac callers should use. Hardcodes `--release 11` and `:` classpath separator (non-Windows only; acceptable). | Make `runJvm` the only JVM runner; delete `calendar-sync-snapshot-jvm.mjs`'s copy (its D4 importers are being deleted anyway) and have `specs/quint/refinement/native/java.mjs` import this one. | Low. |
| 6 | 7, 58-63 | D7 | `sharedSpeechSource` triggers `preparePatchedNative` (stages patched upstream sources) at call time; the importer of `prepare-patched-native.ts` makes every importer of this file load that script. | Move `sharedSpeechSource` to `test/fixtures/native-source.mjs`, which already wraps `preparePatchedNative`. | Low. |

## Proposed end state
`test/support/jvm.mjs` (~35 lines): `javaBinary`, `jsonJar` (from env set by CI setup), `jvmSkip`, `runJvm`, `root`,
`nativeSource`. It is the only JVM runner used by tests and Quint native harnesses. Upstream path helpers kept only
if a surviving importer needs them; `sharedSpeechSource` moves to `native-source.mjs`.
