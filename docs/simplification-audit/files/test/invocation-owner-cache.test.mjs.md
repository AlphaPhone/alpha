# test/invocation-owner-cache.test.mjs
- Lines: 65 | Kind: source-text (5 regexes over `AlphaLocalAgentPlugin.java` and an index-sliced region of `AlphaCredentialStore.java`) plus a host-JVM unit test (javac of the whole `InvocationOwnerCache.java` with a hand-written `Harness.java`); research's "slices Java methods into a generated class" is inaccurate | Verdict: DELETE (regex half); MOVE the JVM harness to the Gradle JVM test set (`android/app/src/test/java/.../ResidentCredentialsTest.java`) or fold its expiry cases into the resident Quint replay
- Covers: the cached listener/invocation owner is read once per credential state, invalidated around every credential commit, never caches a read overlapping a commit or a failure, and expires exactly at the Cloud credential's `expiresAt` (fractional and non-finite values handled). Duplicates: `specs/quint/refinement/native/resident-coordinator.mjs:12` compiles `InvocationOwnerCache.java` into the resident traces but its scenarios (`stop`, `late-cancel`, …) do not exercise expiry; `test/agent-always-local.test.mjs` mentions the class (text). Callers/importers: `npm test` glob; uses `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-19 | T1 | Regexes pin exact one-line Java bodies (`commitCredentials`, `invocationOwner`, the `mutateSlotOnce` guard with `"cloud:production"` literals) and count `mutation.commit()` occurrences; any reformat (D9) breaks them. | Delete. | Low |
| 2 | 22-61 | T3 | Unit test of one class, but the only coverage of the expiry boundary (`clock==expiresAt` returns null, fractional floor re-read, NaN/Infinity immediate). A stale owner after credential expiry is a security-relevant bug. | Move to Gradle JVM tests (no javac-from-Node), or add an `expiry` scenario to the resident coordinator Quint model. | Medium |
| 3 | 8 | C3 | Local comment-stripping regex, duplicated in many text tests. | Gone. | Low |

## Proposed end state
File deleted. The expiry/invalidations harness becomes a JUnit class under `android/app/src/test/java` run by Gradle
`testDebugUnitTest` (owner decision whether such JVM unit tests are wanted; otherwise the resident Quint model gains an
expiry action so the replay covers it). Listed under coverage at risk until one of the two lands.
