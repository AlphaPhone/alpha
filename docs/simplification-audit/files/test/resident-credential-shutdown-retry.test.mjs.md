# test/resident-credential-shutdown-retry.test.mjs
- Lines: 189 | Kind: Java transplant (slices `requireShutdownRetry`, `retryCredentialShutdown`, `stop`, `getStatus`, a lifecycle-lock block out of `AlphaLocalAgentPlugin.java` into generated harness classes) + one whole-class JVM run (`ResidentCredentialShutdownRetry.java` + fixture) | Verdict: DELETE
- Covers: strict credential-shutdown retry: exact acknowledgment + absence + current owner before a restart; stop reissues an unconfirmed strict stop. Duplicates: `specs/quint/refinement/native/resident-coordinator.mjs` compiles `AlphaLocalAgentPlugin.java` and `ResidentCredentialShutdownRetry.java` and checks the resident traces; `specs/quint/native/ResidentStartCancel.qnt`; `CredentialLeaseTraces.java`. Callers/importers: `npm test` glob; `test/fixtures/ResidentCredentialShutdownRetryTest.java` (only importer), `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-57, 66-121, 128-185 | T2 | Three harnesses paste sliced Java method bodies between hand-written stubs of `ElizaAgentService`, `PluginWorkers`, `PluginCall`; any rename or split of the plugin (D1) breaks them. | Delete. | Medium: risky fence, but modelled by Quint |
| 2 | 58-60 | T4 | `ResidentCredentialShutdownRetry` is also compiled and traced by the resident-coordinator refinement. | Delete. | Low |
| 3 | 104-119 | D8 | 16 scenarios on single 500-character lines. | Goes with the file. | Low |

## Proposed end state
File and `test/fixtures/ResidentCredentialShutdownRetryTest.java` deleted. The retry fence stays covered by the
resident Quint model and its refinement harness (which itself is on the T10 port list: it should call the plugin
class rather than paste text).
