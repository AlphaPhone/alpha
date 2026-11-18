# test/quint-indicator-provider.test.mjs
- Lines: 41 | Kind: Quint wrapper (javac replay) + Java probe + source-text assertions on Gradle/JSON/Java files | Verdict: DELETE (fold the probe into the driver)
- Covers: SystemUI indicator lease provider keeps generation/death ownership and restores caller identity (patched upstream `IndicatorLeaseProvider.java`); two held-monitor acquires keep the current death recipient; both host flavours select the patched listener source set. Duplicates: native index runs `checkIndicatorProvider` in `quint-native-refinement`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-16 | T4 | Aggregate duplicate (360 s budget, javac). | Delete. | None |
| 2 | 18-23 | — | `probeIndicatorProvider()` runs 32 real-Java race attempts; not in the aggregate. | Run the probe inside `checkIndicatorProvider` so the runner covers it. | Low |
| 3 | 25-41 | T1 | Regex on `android/sense/build.gradle` (`commandLine 'node', 'scripts/prepare-patched-native.ts'`, `ext.elizaSenseSourceDir…`, `apply from…consumer.gradle`), `android/consumer-host.json` flavour names, staged `consumer.gradle` sourceSets/buildTypes and a `synchronized(IndicatorLeaseProvider.class){…generation=Listener.lease.acquire(boot);` Java pattern. Only the APK build proves the wiring. | Delete; the Android build of both variants (AGENTS.md) is the check. | Low |
| 4 | 6 | — | Calls `preparePatchedNative()` (writes a staged tree) inside `npm test`. | Gone. | None |

## Proposed end state
Deleted. Provider replay + probe run once from the native index.
