# apps/app/src/browser/agent-speech.ts
- Lines: 21 | Role: late-bound proxy that lets `browser/voice.ts` read the connection controller without importing `runtime/connection-ui.tsx` at plugin-registration time. | Verdict: SIMPLIFY
- Importers: 2 (`browser/voice.ts:5` as `connectionController`, `main.tsx:30,101` binds `connectionController` on non-Android). Text/path pins: `test/support/feature-parity.mjs` (inventory), `test/browser/browser-cloud-dev.spec.ts`, `test/browser/cloud-tts-streaming.spec.ts` (path via `page.evaluate(import(...))`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6, 15-16 | B2 | `getCloudEnvironment?():string\|null; getCloudClient?():…` then `connection?.getCloudEnvironment?.()` — the only binder is `connectionController` (`runtime/connection-ui.tsx:2539-2540`), which always has both methods. | Make both members required; call `connection?.getCloudEnvironment()`. | Low |
| 2 | 3-9 | C1 | `SpeechConnection` re-declares the controller's shape (incl. an ad-hoc `getSnapshot()` return type) by hand. | `import type {connectionController} from '../runtime/connection-ui'` (type-only, erased, so it does not break the registration-order rule in the comment) and use `Pick<typeof connectionController,'getBrowserSpeechAgent'\|'getCloudEnvironment'\|'getCloudClient'\|'getSnapshot'\|'subscribe'>`. | Low (type-only) |
| 3 | 17 | B4 | `getSnapshot:()=>connection?.getSnapshot()??{session:null}` — fallback exists only before `bindBrowserSpeechConnection` runs; `main.tsx:101` binds at module init before any voice call. Keep (pre-bind calls are possible during import of voice.ts), but note it. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `SpeechConnection` | type | 3-9 | Shape of `connectionController` (`runtime/connection-ui.tsx:2198`) | `Pick<typeof connectionController,…>` |

## Proposed end state
Same proxy, ~15 lines: required members, type derived from the controller by `import type`, no `?.()` on methods.

## Verification
`test/browser/browser-cloud-dev.spec.ts`, `test/browser/cloud-tts-streaming.spec.ts`; `npm run verify` typecheck.
