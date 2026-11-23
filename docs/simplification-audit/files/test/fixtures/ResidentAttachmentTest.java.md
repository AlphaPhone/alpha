# test/fixtures/ResidentAttachmentTest.java
- Lines: 79 | Kind: unit (host JVM, compiles only the upstream class `vendor/eliza/plugins/plugin-native-agent/.../runtime/ResidentAttachment.java`) | Verdict: DELETE
- Covers: the resident attach decision (every refusal reason, no-provider generation, refusal text never carries a token/identity/generation, bounded `Requests` memory, the MVP-16 "pending enrollment is not shared" limit). Duplicates: upstream `vendor/eliza/plugins/plugin-native-agent/test/connection/ResidentLifecycleTest.java` (same `admitted(now)` fixture shape and every reason string: `lifecycle-retiring`, `provider-changing`, `attach-unverified`, `runtime-token-unavailable`, `not-enrolled`, `runtime-changed`, `enrollment-expiring`, `provider-changed`, `provider-unadmitted`, `no-provider`, `runtime-not-running`, `unavailable`, `Requests.LIMIT`, and the same secret-leak loop at its line 263). Callers/importers: only `test/resident-attachment.test.mjs:11-20`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-79 | T5, T4 | Tests upstream code that upstream already tests case for case. No Alpha source is compiled. | Delete with the importer's test 1. | Low |
| 2 | 66-76 | — | The MVP-16 pending/half-written enrollment cases are the only lines not obviously in the upstream test (upstream tests `not-enrolled` for null root and empty token, not the three-step completion). | If the owner wants the MVP-16 limit pinned, add it upstream (D14 follow-up), not here. | Low |
| 3 | 4 | A8 | Comment says "production attach decision"; the class is upstream's. | Goes with the file. | — |

## Proposed end state
Deleted. Resident attach behaviour is covered by the upstream suite plus the Quint resident models; the Alpha-side
wiring (attach precedes retirement) is a device/emulator concern, not a host test.
