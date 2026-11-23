# apps/app/src/runtime/development-cartesia-conversation.ts
- Lines: 183 | Role: browser-developer realtime voice session (canonical voice-session client over the local dev agent, with a renderer navigation WebSocket and direct-action follow-up). | Verdict: MOVE to apps/app/src/dev/ (behind one dynamic import) and SIMPLIFY
- Importers: 3 product (`prototype/voice-adapter.ts` – the call, `prototype/agent-adapter.ts` – type `RealtimeVoiceNavigation`, `prototype/settings-adapter.ts` – flag). Text/path pins: `test/development-cartesia-conversation.test.mjs`, `test/development-voice-navigation.test.mjs` (both read source text, T2), `test/voice-progress-state-forwarding.test.mjs`, `test/voice-request-provenance.test.mjs`, `specs/quint/application/manifest.json`, `specs/quint/refinement/application/voice-transcript-follow.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | D6/D5 | Reachable only when `connectionController.getBrowserSpeechAgent()` is non-null, which requires `browserLocalAgentEnabled` (`local-agent.ts:320`, a dev-only flag). Yet `voice-adapter.ts:13` imports it statically, so the module ships in production bundles. | Move to `src/dev/realtime-voice.ts`; `voice-adapter` loads it with `await import()` only inside the `browserStartup` branch (`voice-adapter.ts:633`). Move `RealtimeVoiceNavigation` type to a non-dev module (agent-adapter needs it). | Medium: bundle audit and dev voice journeys must be re-run. |
| 2 | 8 | D4 | `export {developmentCartesiaVoiceEnabled} from './development-cartesia-flag'` re-export. | Importers take the flag from `build-flags.ts` (see development-cartesia-flag report). | None |
| 3 | 3 | D13 | `import {validateUuid} from '../../../../vendor/eliza/packages/core/src/utils/uuid'` reaches into the vendor checkout, unlike every other upstream import (`.eliza/client-features`). | Import from `@elizaos/core` alias or the generated `.eliza` copy. | Low |
| 4 | 17, 28, 74 | A4 | `const requireTurnTerminal=true;` then `if(requireTurnTerminal&&health.turnTerminal!==true||…)`. | Inline `true`: `health.turnTerminal!==true` and `requireTurnTerminal:true`. | None |
| 5 | 52, 57, 69, 107, 141, 142 | C3 | Bounded-set insert written six times: `if(s.size>=64)s.delete(s.values().next().value!);s.add(v)`. | One local `remember(set,value)` helper. | None |
| 6 | 40, 61, 72, 77, 143, 174 | C3 | `error instanceof Error?error:Error('…')` seven times. | Local `asError(error,fallback)`. | None |
| 7 | 68 | C3 | Inline UUID regex. | Use `validateUuid` already imported (line 3). | None |
| 8 | 151, 178 | D8 | 1,055-char `stop` and 600-char return object on single lines. | Split into statements when moved. | None |
| 9 | 15 | — | `connectionController.getSnapshot()` called twice in one expression. | Read once. | None |
| 10 | 23, 33 | B1 | `catch{/* Diagnostics cannot change voice cleanup. */}`, `catch{/* Unreadable preferences retain review. */}` | Keep: both are documented fallbacks. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `RealtimeVoiceNavigation` | type | 12 | no | a production voice types module (e.g. `runtime/voice-states.ts`) |
| `remember` (new) | helper | — | same bounded-set idiom in `prototype/*` adapters | local |
| `asError` (new) | helper | — | `toError` copies across runtime | shared `runtime/errors.ts` if one is created |

## Proposed end state
`src/dev/realtime-voice.ts`, dynamically imported, no re-export, no constant switch, two tiny helpers, formatted statements. ~150 lines; production bundle loses ~13 KB.

## Verification
`test/development-cartesia-conversation.test.mjs` and `test/development-voice-navigation.test.mjs` slice this file's text (T2) and break on a move; `test/browser/voice-composer-recovery.spec.ts`, `test/private-preview-cartesia-route.test.mjs`, `npm run verify` bundle audit (`scripts/audit-production-bundle.ts`).
