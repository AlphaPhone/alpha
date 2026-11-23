# test/local-agent-voice-bridge.test.mjs
- Lines: 239 | Kind: integration (real `createLocalAgentDevHandler` from `scripts/local-agent-dev-bridge.ts` behind a real `http` server, a real runtime HTTP/WebSocket upgrade server, temp token file; re-execs itself under `--import tsx`) | Verdict: KEEP, SIMPLIFY; MERGE with the other dev-bridge tests into `test/integration/dev-bridge.test.ts`
- Covers: the Vite development bridge (`vite.config.ts:106` `localAgentDevBridge()`) between the browser and a local agent: owner-bound voice session controls, minted socket tickets single-use and same-origin, paired bearer and root token never returned, credential rollover closes tunnels, renderer channel tickets, strict path allow-list (message pagination, notes/calendar records, prepared navigation), localhost does not widen host/origin trust, Cloud realtime attestation, SDK17 stop-intent metadata, `turnTerminal` negotiation. Duplicates: `scripts/local-agent-dev-bridge.ts` is also exercised by `test/development-conversation-stream.test.mjs`, `development-cloud-voice.test.mjs`, `automations-transport.test.mjs`, `direct-transcription-proxy.test.mjs`, `cloud-prewarm.test.mjs`, `enabled-view-transport.test.mjs`, and `test/browser/browser-cloud-dev.spec.ts`; `local-agent-contracts.test.mjs` runs `scripts/test-local-agent*.ts` against the same bridge. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T9 | The file re-spawns itself under tsx when not already loaded with it (a second Node process, 60 s timeout). | Run the test runner with tsx (or rely on Node type stripping) once for the whole integration lane; drop the self-respawn. | Low |
| 2 | 15-36 | D8, C3 | 20-line minified fixture (hand-written WebSocket handshake, fake runtime routes) duplicated in spirit across 7 dev-bridge test files. | One shared `test/integration/fixtures/dev-bridge.ts` fixture (runtime stub + handler server + `upgrade()` helper) used by every dev-bridge case. | Low |
| 3 | 82-86, 122-141, 154-186 | — | Path allow-list and navigation-preparation refusal tables: the security surface of a dev server reachable from the LAN. | Keep as tables. | Low |
| 4 | 189-200 | A1 | "legacy tickets" case: a runtime that sends no stop-intent metadata. Whether pre-SDK17 runtimes still exist at the pinned upstream is a fact to check; if the pin always sends metadata, the legacy branch in the bridge and this case go. | Owner/upstream check; delete if unreachable. | Low |
| 5 | 94 | T8 | Overrides global `Date.now` to expire a ticket. | Use `mock.timers` with `Date`. | Low |
| 6 | whole | D6, P1 | A development-only surface tested in every `npm test` run. | Path-filter the dev-bridge lane to `scripts/local-agent-dev-*.ts`, `scripts/browser-cloud-dev*.ts`, `vite.config.ts`. | Low |

## Proposed end state
`test/integration/dev-bridge.test.ts`: this file's cases (trimmed of the legacy-ticket case if unreachable) plus the
dev-bridge cases from the six sibling files and `local-agent-contracts.test.mjs`, on one shared fixture, run only when
the dev bridge sources change.
