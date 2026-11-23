# test/development-cartesia-conversation.test.mjs
- Lines: 278 | Kind: transplant (concatenates `runtime/development-cartesia-flag.ts` + `development-cartesia-conversation.ts`, strips imports and types, runs in `vm` with ~15 faked globals) + one case pairing the transplant with an esbuild bundle of the real upstream SDK client | Verdict: REWRITE as `test/integration/voice.test.ts` (dev-Cartesia section, ~10 cases) importing the real module
- Covers: the DEV-only direct/Cloud Cartesia realtime voice controller: ticket renewal and its fences, navigation dedupe, automatic microphone pause, owner/ask-first action execution, health/attestation admission. Duplicates: `test/development-voice-navigation.test.mjs` transplants the same module (navigation/camera cases); `test/local-agent-voice-bridge.test.mjs` covers the host side of ticket minting. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33, 38-39, 67-70 | T2 | Source is read as text, imports deleted with regexes, `import.meta.env` replaced by string `replace`, run in `vm`. Any new import in the module breaks it; the real wiring to `connection-ui`, `voice-timing`, `device-preferences` is never run. | Bundle the real module with esbuild, aliasing only `./connection-ui` (one fake `connectionController`) and passing `loadClient`; or import with tsx after the `dev/` move. | Medium: needs the module to take `connectionController` and `loadClient` as inputs (D3). |
| 2 | 6-32 | T3, T5 | `sdkOptions` re-implements the upstream SDK reducer ordering "as a unit port" (its own comment). It is a copy of upstream behaviour that will drift. | Drop; use the real `createVoiceSessionClient` (already bundled at lines 208-219) for every case. | Medium. |
| 3 | 124-196 | T4 | Twelve automatic-mute cases each replay small event sequences; several overlap (silent turn x3, retryable x2, greeting x2). | Keep one table-driven case over (events -> expected mute) rows. | Low. |
| 4 | 76-113 | - | Renewal fences (stop during fetch/open, renderer/owner/conversation change, unexpected disconnect) are the risky part and unique coverage. | Carry. | - |
| 5 | 199-265 | T9 | The "actual SDK" case is skipped unless `ALPHA_CLOUD_COLLECTOR_SOURCE`/`ALPHA_REQUIRE_PREPARED_SDK` is set; it still runs the transplanted controller. Costs one esbuild bundle. | Make it the base fixture of the rewritten suite (prepared-SDK lane only). | Low. |
| 6 | 40, 43-47 | D8 | 600-character single-line tests. | Formatter + named steps in rewrite. | None. |
| 7 | whole | owner | Whole module is DEV-only (`import.meta.env.DEV && devSurfacesEnabled && !native`). ~400 lines of tests across two files for a developer surface. | Owner question: keep dev Cartesia voice; if not, delete module and both tests. | - |

Cases worth carrying: renewal keeps one audio client across >2 renewals; Stop during ticket fetch fences the late ticket;
Stop during socket open closes both; renderer/owner/conversation change refuses replacement; unexpected disconnect retires;
Cloud realtime requires attested `at-session-start` admission and refuses legacy/direct/deferred; direct-request mode only
while preference allows, executes once for the matching message, never under ask-first or after Stop; health without
`turnTerminal` refuses before client creation; one automatic-mute table.

## Proposed end state
File deleted. `test/integration/voice.test.ts` gets a "development Cartesia" describe block (~10 cases) running the real
module against the real SDK client with a fake socket/clock, shared with the navigation cases from
`development-voice-navigation.test.mjs`. If the owner retires dev Cartesia, delete both files with the module.
