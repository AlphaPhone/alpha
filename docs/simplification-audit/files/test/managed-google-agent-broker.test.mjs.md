# test/managed-google-agent-broker.test.mjs
- Lines: 48 | Kind: integration (real broker behind a real loopback `http` server; synthetic host via Proxy) | Verdict: KEEP as the base of `test/integration/managed-google-broker.test.mjs`
- Covers: the private Google broker returns only closed refusal reasons, never host error text, and bounds requests/results by kind. Duplicates: refusal shape overlaps `managed-calendar-broker-read-header.test.mjs` and `managed-google-broker-diagnostic.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | T9 | Self re-exec under tsx with `--conditions=eliza-source`. | Use the shared loader once for the merged file. | Low |
| 2 | 22-25 | T7 | Ten test instances for ten reasons. | One table-driven test. | None |
| 3 | 30-48 | - | 8 KiB write passes / read refused unread; 256 KiB result refused; overlong Gmail query and non-JSON refused before host. | Keep. | - |

## Proposed end state
Renamed/moved to `test/integration/managed-google-broker.test.mjs`; absorbs the carried cases of the four sibling
`managed-google-*` / `managed-calendar-*` files and `native-google-agent-host-access.test.mjs`. One `call()` helper over a real server.
