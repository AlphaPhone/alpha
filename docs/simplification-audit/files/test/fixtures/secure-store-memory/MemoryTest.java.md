# test/fixtures/secure-store-memory/MemoryTest.java
- Lines: 83 | Kind: integration fixture (host-JVM `main` driving the real patched `JsonCredentialSlots`) | Verdict: KEEP (move to the Android JVM test set; upstream follow-up)
- Covers: the native secure store writes, reads and compare-exchanges a 32 MiB authenticated record inside a 192 MiB heap; rejects invalid JSON, tampered/truncated/extended AES-GCM streams and corrupted commits; capacity lowering keeps old data, allows shrinking and refuses growth (the Notes Trash 30 MiB cap order). Duplicates: on-device `NotesStorageDurabilityInstrumentedTest` drives the same lowered-cap order on Android (comment line 64); no host duplicate. Callers/importers: only `test/secure-store-memory.test.mjs` (compiles it with `-Xmx192m`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T5 | The class under test is upstream `plugins/plugin-native-secure-store/.../JsonCredentialSlots.java` (patched by Alpha's native overlay). Most of these cases are upstream behaviour. | Upstream follow-up (D14): propose the heap, tamper and capacity cases to the plugin's own suite. Keep here until then, because the 192 MiB heap budget and the 30/32 MiB Notes caps are Alpha's. | low |
| 2 | 20-32 | — | Two loops over the same three invalid-JSON strings (plain write, then authenticated ciphertext). They are distinct cases. | Keep. Name the array once. | none |
| 3 | 5-82 | D8 | Dense `if(!x)throw new AssertionError` lines. | Format; a tiny `check(cond,msg)` helper like other JVM fixtures. | none |
| 4 | — | cost | It allocates two 32 MiB values and runs under a 600 s timeout in the wrapper test. | Keep it in a slow JVM lane that runs only when `android/**`, `vendor` pin or `test/fixtures/secure-store-memory/**` changes (P1). | none |

## Proposed end state
One JVM integration test of the credential slot store (Alpha's heap and cap budgets) in the Gradle JVM test set,
using the `AtomicFile` host shim. Its pure-upstream cases are proposed upstream and removed here once the pin carries them.
