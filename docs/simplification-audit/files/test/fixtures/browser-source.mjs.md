# test/fixtures/browser-source.mjs
- Lines: 20 | Kind: support helper (esbuild bundle of real browser/runtime modules for Node, with explicit Vite env flags) | Verdict: KEEP (the one module loader for integration tests)
- Covers: loading real `apps/app/src` modules into Node with `import.meta.env` and `import.meta.url` defined. Duplicates: `browser-daily-stores.mjs:42` and `canonical-calendar-draft-owner.mjs:19` hand-roll their own esbuild builds; `tsx`'s `tsImport` used in `cloud-voice-view.mjs`. Callers/importers (21): 16 host tests (automation-completion, automations-transport, calendar-day-context, chat-ui-failed-turn, client-observation-handshake, cloud-personal-protocol, committed-device-changes, connection-step-contracts, google-workspace-return, local-agent-native-events/stream, native-browser-view-binding, optional-view-channel-chat, owner-route-parity, view-navigation-settle), `test/fixtures/device-action-policy.mjs`, four `scripts/test-*.ts` (connection-history, local-agent-stream, local-agent, resident-reuse), and Quint `client-observation-support.mjs`, `native/native-stream-bridge.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-17 | C7 | Transforms every non-node_modules file twice (onLoad transform + bundle). Fine, but three other fixtures re-implement bundling. | Add an optional `stubs` map here and delete the other bundlers. | Low |
| 2 | 10 | D5 | Sets `DEV` from `testMocks`; production-shaped loads should be the default (it is). | none | - |
| 3 | - | - | Its existence is what makes D7 shims (`import.meta.env === undefined`) unnecessary; keep it as the single path. | Document as the integration loader. | - |

## Proposed end state
Move to `test/integration/support/load-module.mjs` with an optional stub-map parameter; the other ad-hoc esbuild/tsImport loaders use it. Survives regardless of which importers are deleted (many are B/integration KEEP/MERGE).
