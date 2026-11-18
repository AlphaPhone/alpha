# test/managed-calendar-broker-read-header.test.mjs
- Lines: 91 | Kind: unit of an upstream module (broker from `.eliza/client-features/.../managed-google-agent/` with a `Proxy` host and hand-built req/res), self re-exec under tsx | Verdict: MERGE 3 cases into `test/integration/managed-google-broker.test.mjs`; DELETE the rest
- Covers: Calendar read refusals carry only the shared closed diagnostic header; no header for unauthorized, non-read, or successful requests; no secret text anywhere. Duplicates: `managed-google-broker-diagnostic.test.mjs`, `managed-google-stage-diagnostic.test.mjs` (same broker, same refusals). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T9 | Self re-exec under tsx (24 files do this). | Gone: merged file runs under the shared test loader. | None |
| 2 | 22-32 | C4 / T7 | Hand-written `Readable` + `EventEmitter` response fake, repeated in three sibling files. | Use the real HTTP server pattern of `managed-google-agent-broker.test.mjs`. | Low |
| 3 | 35-54, 66 | - | Header present and decodable for sources/feed refusals; absent for 401/403/non-read; never contains the secret. | Carry: one sources-refusal header case, one unauthorized/forbidden no-header case, one non-read refusal table (collapsed). | Low |
| 4 | 68-71 | T5 | Decoder canonical-form refusals test the upstream contract codec. | Delete (upstream contract). | Low |
| 5 | 73-91 | B2 / T5 | Deletes `DOMException`, `AbortSignal`, `AbortSignal.any/timeout` globals to test capability reporting; runtime always has them. | Delete. | None |
| 6 | 59 | A2? | `linked-sync` listed as a non-read operation. | Keep as a row only if `linked-sync` survives D4 (owner question). | - |

## Proposed end state
File deleted; three cases live in the merged broker integration file, which drives the broker over a real loopback HTTP server.
