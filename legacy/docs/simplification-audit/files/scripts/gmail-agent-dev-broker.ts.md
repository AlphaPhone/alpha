# scripts/gmail-agent-dev-broker.ts
- Lines: 13 | Kind: development-server middleware (owner-token check around the managed Google agent broker) | Verdict: MERGE with `scripts/gmail-agent-read-host.ts` into one `scripts/dev-server/gmail-agent.ts`
- Covers: authorises local-agent requests to the browser-profile Google host by comparing a bearer token with the owner token file. Duplicates: owner-token file checks (`isFile`, mode `0o077`, 64-hex) also in `scripts/local-agent-dev-bridge.ts:171-173` and `:264-265`. Callers/importers: `scripts/local-agent-dev-bridge.ts:4`; `test/calendar-managed-rejection.test.mjs:79-80` bundles this file and replaces `./gmail-agent-read-host.ts` by exact specifier.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | file | D4 | 13-line file whose only job is to wrap an 8-line file. | Merge both into one module (21 lines) next to the other dev-server middleware; research/scripts.md suggests merging into the 309-line `local-agent-dev-bridge.ts`, but a separate small module keeps that god file from growing. | L |
| 2 | 8-9 | C3 | Owner-token file validation duplicated in `local-agent-dev-bridge.ts`. | One `readOwnerToken(file)` helper in the dev-server folder. | L |
| 3 | 8 | B2 | `process.getuid?.()`: `getuid` exists on every POSIX Node, and the dev bridge runs only on the developer's machine. On Windows the optional call yields `undefined` and every token is refused. | Keep (it fails closed) or state the POSIX-only assumption. | L |
| 4 | 6-12 | D8 | Dense one-line statements. | Format. | L |
| 5 | — | T5 | `test/calendar-managed-rejection.test.mjs` resolves `./gmail-agent-read-host.ts` by name to inject a fake reader; merging the files breaks that hook. | When merging, give `createGmailAgentDevBroker` the read host as a parameter (it already receives `profile` and `access`), and let the test pass its fake. | M |

## Proposed end state
`scripts/dev-server/gmail-agent.ts` exporting `createGmailAgentReadHost` and `createGmailAgentDevBroker({host, tokenFile})`, using a shared
`readOwnerToken`. The calendar rejection test passes a fake host instead of rewriting an import path.
