# apps/app/src/maps/agent-navigation.ts
- Lines: 36 | Role: re-exports upstream `plugin-maps/client/agent-navigation.ts`, owns the launcher's singleton `residentMapsNavigationPort`, and `keepCloudMapsCoverage` (re-reads Cloud Maps coverage on each new Cloud account) | Verdict: SIMPLIFY
- Importers: 1 app (prototype/maps-adapter.ts:27 — `bindAgentNavigation` (upstream), `keepCloudMapsCoverage`, `residentMapsNavigationPort`); maps/resident-relay.ts:3; scripts/test-maps-device-navigation.ts:9; test/maps-navigation.test.mjs:172 (esbuild stdin).
- Text/path pins: specs/quint/services/manifest.json:349,398,4384,5142 (sources) and symbol pins at :4409-4417 (`keepCloudMapsCoverage`, `pending`, `seen`) and :5163 (`residentMapsNavigationPort`); specs/quint/native/manifest.json:631; specs/quint/application/manifest.json:2839; specs/quint/legacy/manifest.json:375 and specs/quint/legacy/maps/check-maps-refinement.mjs:27 (URL `/src/maps/agent-navigation.ts`); specs/quint/refinement/services/maps-connection.mjs:4,44 and resident-maps-relay-offer.mjs:29 (compile `export {...} from './apps/app/src/maps/agent-navigation.ts'`); test/support/feature-parity.mjs:314. Local variable names `pending` and `seen` are pinned by the services manifest (T10): renaming them breaks the model check.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | D4, D13 | `import { createMapsNavigationPort } ...` then `export * from '.../agent-navigation.ts'` — the file doubles as a re-export shim so maps-adapter can take `bindAgentNavigation` from here | Drop the `export *`; maps-adapter.ts:27 and scripts/test-maps-device-navigation.ts:9 import `bindAgentNavigation`, `AgentNavigationOptions`, `CloudInstallation`, `createMapsNavigationPort` from upstream (alias) | Low; test/maps-navigation.test.mjs:172 imports `createMapsNavigationPort` through this path and must switch too |
| 2 | 7 | C1 | `type CloudAccount = Readonly<{ sessionId: string; credentialId: string; client: unknown }>` — same shape as upstream cloud-session.ts `MapsSession` (not exported) and as `BoundClient` in cloud-maps.ts:12 / the return of `connectionController.getCloudClient()` | Use `ReturnType<typeof connectionController.getCloudClient>` (or an exported `CloudBinding` type from runtime/connection-ui.tsx) | Low; types only |
| 3 | 24 | C3 | `account?.sessionId !== seen?.sessionId \|\| account?.credentialId !== seen?.credentialId \|\| account?.client !== seen?.client` — the session/credential identity compare appears in 6 renderer files (maps/agent-navigation.ts, maps/cloud-maps.ts x2, browser/voice.ts, prototype/inbox-cloud-adapter.ts, runtime/google-accounts.ts) plus upstream cloud-session.ts | Add one `sameCloudBinding(a, b, {client})` next to `getCloudClient` in runtime/connection-ui.tsx (or a small `runtime/cloud-binding.ts`) and call it here | Low; keep the `client` comparison here — this site deliberately differs from cloud-maps.ts:51, which ignores `client` |
| 4 | 13-36 | NEW (upstream candidate) | `keepCloudMapsCoverage` has no Alpha-specific input (everything is injected through `options`) | Owner question: move it into upstream `plugin-maps/client/agent-navigation.ts` beside `bindAgentNavigation`; Alpha keeps only `residentMapsNavigationPort` | Medium — needs an upstream change and an advance of `upstream.lock.json`; the quint symbol pins move with it |
| 5 | 8-12 | A8 | Comment "A change is handled after the account-change retirement in cloud-maps.ts" couples two files by narrative | Keep the ordering fact (it is why `queueMicrotask(sync)` exists at :33) but state it at :33 | None |

No B1/B2/A-pattern issues: `disposed` guards a real async race (listener queued in a microtask after dispose).

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CloudAccount` | type | 7 | `BoundClient` maps/cloud-maps.ts:12; upstream `MapsSession` .eliza/client-features/plugins/plugin-maps/src/client/cloud-session.ts:4; `Binding` runtime/paired-voice.ts:6 (different shape) | exported `CloudBinding` type in runtime/connection-ui.tsx |
| session/credential compare (inline) | helper | 24 | maps/cloud-maps.ts:16,51; browser/voice.ts; prototype/inbox-cloud-adapter.ts; runtime/google-accounts.ts; navigation-voice.ts:54 (part of a larger snapshot) | `sameCloudBinding()` beside `getCloudClient` |
| `residentMapsNavigationPort` | const | 5 | none | stays |

## Proposed end state
~28 lines: one import of `createMapsNavigationPort` via the alias, `residentMapsNavigationPort`, and `keepCloudMapsCoverage` using the shared binding type and compare helper (or, if the owner agrees, only `residentMapsNavigationPort` with ~4 lines, the rest upstream). No `export *`.

## Verification
test/maps-navigation.test.mjs; scripts/test-maps-device-navigation.ts (via its test shim); quint refinements services/maps-connection.mjs and services/resident-maps-relay-offer.mjs; `specs/quint/legacy/maps/check-maps-refinement.mjs` (if P6 has not retired it yet); `npm run verify`.
