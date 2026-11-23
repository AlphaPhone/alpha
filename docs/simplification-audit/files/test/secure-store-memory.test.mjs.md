# test/secure-store-memory.test.mjs
- Lines: 29 | Kind: JVM unit of patched upstream `JsonCredentialSlots.java` with its key acquisition text-replaced | Verdict: DELETE
- Covers: the patched native secure store reads/writes/CASes a 32 MiB authenticated record within a 192 MiB heap. Duplicates: none in Alpha. Callers/importers: `npm test` glob; `test/fixtures/native-source.mjs`, `jvm-tools.mjs`, `test/fixtures/secure-store-memory/` (also imported by `test/gmail-background-lock-contention.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-23 | T2 | Cuts `private SecretKey key()` out of the source by `indexOf` and splices a fixed key. | Delete. | Low |
| 2 | 10-29 | T5 | Upstream class (`plugin-native-secure-store`); memory bound is an upstream property. | Delete; upstream follow-up. | Low |
| 3 | 26 | cost | `-Xmx192m` with a 600 s timeout and 32 MiB crypto: one of the slowest host tests. | Goes with the file. | Low |

## Proposed end state
File deleted. `test/fixtures/secure-store-memory/` stays while `gmail-background-lock-contention.test.mjs` uses it
(its own report decides). Upstream follow-up: large-record memory test in plugin-native-secure-store.
