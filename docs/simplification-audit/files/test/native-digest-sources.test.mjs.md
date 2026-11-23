# test/native-digest-sources.test.mjs
- Lines: 30 | Kind: host-JVM test of real `NativeDigestSources.java` (+ notice sources prepared by `test/fixtures/native-source.mjs`) with `test/fixtures/NativeDigestSourcesTest.java` (16-23) + source-text cross-check of a vendor TS constant against a Java constant (24-30) | Verdict: DELETE
- Covers: native digest consent and source reads stay bounded across persistence and revocation; the native read window covers the agent's run window. Duplicates: Quint `specs/quint/refinement/native/native-digest.mjs` (+ `NativeDigestTraces.java`) executes the actual `NativeDigestHost` and `NativeDigestSources` with admission and generation checks. Callers/importers: `npm test` glob; it is the only user of `test/fixtures/NativeDigestSourcesTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-15 | C3 / T9 | Own org.json jar discovery in the Gradle cache, duplicating `jvm-tools.mjs` `jsonJar`; CI-only failure branch. | Gone. | None |
| 2 | 16-23 | T4 | Same classes executed by the native-digest refinement. | Delete with the Java fixture, after confirming the refinement covers revocation persistence; else add that trace there. | Medium |
| 3 | 24-30 | T1 | Regex over vendor `hosted-digest-policy.ts` and Alpha Java constants. | Delete. Drift between the two windows then has no guard: owner question whether to derive the Java constant at build time (BuildConfig field from the pinned TS) instead. | Medium |

## Proposed end state
File and `test/fixtures/NativeDigestSourcesTest.java` deleted; the refinement is the proof. Window alignment becomes a build-time constant if the owner wants it guarded.
