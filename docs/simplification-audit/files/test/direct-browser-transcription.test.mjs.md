# test/direct-browser-transcription.test.mjs
- Lines: 43 | Kind: transplant (strips imports and types from the whole of `apps/app/src/browser/voice.ts`, runs it in `vm` with a 15-key box; case 4 slices `developmentCloudSpeech` out of `runtime/local-agent.ts` by `indexOf` markers into a synthetic class) | Verdict: DELETE; carry two behaviours to `journeys/voice.spec.ts`
- Covers: DEV browser dictation uses the direct resident route without a Cloud account, refuses before upload when no key or wrong route, Stop aborts the upload, a provider revision change rejects late text, and the resident protocol posts WAV to `/api/v1/voice/session/transcribe` and projects only `{text,local}`. Duplicates: the host half (proxy and field stripping) is `test/direct-transcription-proxy.test.mjs` and `development-cloud-voice.test.mjs`; Playwright `voice-composer-recovery.spec.ts` drives browser dictation recovery. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-14 | T2 | Whole-file transplant of `browser/voice.ts` with regex import removal and `import.meta.env.DEV` -> `false`. | Delete. | Medium. |
| 2 | 36-43 | T2 | Method slice of `local-agent.ts` between two method markers, wrapped in a fake `class Protocol`. | Delete; field projection is covered at the bridge (`direct-transcription-proxy` merged into `test/dev-local-agent-bridge.test.mjs`). | Low. |
| 3 | 22-35 | - | "No key refuses before upload" and "provider change rejects late text" are user-visible in the dev-simulator voice composer. | Two cases in `journeys/voice.spec.ts` (dev project): dictate with voice unconfigured shows the refusal and makes no request; change provider mid-transcription, the stale text never lands. | Medium. |

## Proposed end state
Deleted. Two dev-project voice journey cases replace the browser-side guards.
