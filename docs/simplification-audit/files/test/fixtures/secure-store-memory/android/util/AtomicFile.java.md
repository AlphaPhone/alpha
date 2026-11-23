# test/fixtures/secure-store-memory/android/util/AtomicFile.java
- Lines: 22 | Kind: fixture (host-JVM stand-in for `android.util.AtomicFile` with corruption injection) | Verdict: KEEP
- Covers: a filesystem `AtomicFile` whose `finishWrite` can corrupt the committed bytes (flip first/last byte, truncate, extend) so the store's commit verification is exercised. Duplicates: none. Callers/importers: `test/secure-store-memory.test.mjs` (with `MemoryTest.java`) and `test/gmail-background-lock-contention.test.mjs` (via `fixture('secure-store-memory/android/util/AtomicFile.java')`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | — | `corruptNextCommit` is a static test knob; acceptable in a fixture. | Keep. | none |
| 2 | — | — | Two importers, both kept or rewritten as JVM tests (see their reports), so it survives. | Move to a shared `android-jvm` fixtures folder (it is not specific to the memory test). | none |

## Proposed end state
Unchanged code in a shared host-JVM Android-shim folder used by the credential-store and Gmail lock tests.
