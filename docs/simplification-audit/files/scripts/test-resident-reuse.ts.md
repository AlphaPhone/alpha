# scripts/test-resident-reuse.ts
- Lines: 116 | Kind: integration at the native-bridge boundary (real `LocalAgentProtocol`, `residentAttachable`, `bindResidentCloudProvider` loaded via `test/fixtures/browser-source.mjs`; bridge is a synthetic object) | Verdict: MERGE into `test/integration/local-agent.test.ts` (with `scripts/test-local-agent.ts`)
- Covers: MVP-16 renderer side: attach only on exact `attachable:true`, provider not rebound when attachable, repeated assistant connects keep one owner/agent/origin identity, a failed attach disables attach until a verified connection, cancelled/superseded/displaced attaches do not force a restart. Duplicates: none for the renderer half (the Java half is `test/fixtures/ResidentAttachmentTest.java` in `test/resident-attachment.test.mjs`). Callers/importers: `test/resident-attachment.test.mjs:22` (spawn shim; the same file also slices `AlphaLocalAgentPlugin.java` text: T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | Spawned and output-regex-matched (`/PASS resident reuse/`). | `test()` cases in the local-agent integration file. | None |
| 2 | 26 | B2 | Tests "older native bridge without the query" (`{}`): the bridge ships in the same APK (B2). | Drop the case once `residentAttachment` is made required. | Low |
| 3 | 22, 76 | B3 | Exact-boolean checks on native answers are a real trust boundary. | Keep. | - |
| 4 | 5 | - | `loadBrowserModule` loader exists because `local-agent.ts` reads `import.meta.env`; a test loader for the renderer is the shared fix (D7). | Use the shared renderer test loader. | Low |

## Proposed end state
~90 lines of cases inside `test/integration/local-agent.test.ts`; shim test deleted (its Java JVM case stays, its source-slice case goes).
