# apps/app/src/browser/cloud-connection.ts
- Lines: 142 | Role: development-host bridge (`/__alpha-browser-cloud`) for Cloud requests, secure-slot references, Cloud voice STT/TTS, and email/Google sign-in. | Verdict: MOVE to the dev module boundary (`apps/app/src/dev/`), SIMPLIFY
- Importers: 2 (`runtime/native-connection.ts:6,30,214,253` — only when `browserCloudHost=(devSurfacesEnabled\|\|browserCloudResidentEnabled\|\|privateLocalPreviewEnabled)&&!native`; `browser/voice.ts:3`). Text/path pins: `test/browser-cloud-dev-bridge.test.mjs`, `test/native-secure-slots.test.mjs`, `test/fixtures/google-cancel-boundary.mjs`, `test/browser/calendar-sync-fixture.ts`, `test/support/feature-parity.mjs`; `'__alpha-browser-cloud'` is on the production denylist in `scripts/audit-production-bundle.ts:30`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D6 / D5 | A development-host bridge living in `browser/` next to product web plugins; three different flags gate it at the import site. | Move under `dev/` behind the single dev entry (D6); `native-connection.ts` gets it from there. | Medium (bundle audit must stay green) |
| 2 | 8 | C6 | `'/__alpha-browser-cloud'` also hard-coded in `runtime/browser-cloud-resident.ts:12,43` and `scripts/browser-cloud-dev-bridge.ts:19`. | Export `endpoint` here (or a shared constant) and import it in `browser-cloud-resident.ts`. | None |
| 3 | 11, 62 | C6 | `AbortSignal.timeout(120000)` written twice. | `const REQUEST_TIMEOUT_MS`. | None |
| 4 | 88 | B2 | `if(typeof window==='undefined')throw…` in a browser-only plugin. | Delete. | None |
| 5 | 111 | C3 | Inline abortable 1 s sleep (timer + abort listener + cleanup). | Shared `sleep(ms,signal)` helper (C3 abortable sleep). | None |
| 6 | 116 | B1 | `.catch(()=>{})` on best-effort cancel in `finally`. | Keep with a comment ("best-effort retire; outcome already decided"). | — |
| 7 | 78 | B1 | `try{body=await response.json();}catch{/* … */}` — documented. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `endpoint` | const | 8 | `runtime/browser-cloud-resident.ts:12,43`, `scripts/browser-cloud-dev-bridge.ts:19` `BROWSER_CLOUD_BRIDGE_PATH` | export here |
| `references` slot map | const | 9 | none | keep |
| `rpc` | helper | 13 | `browser-cloud-resident.ts` fetch wrapper | share `browserCloudCall` |

## Proposed end state
~130 lines under `dev/`, one endpoint constant shared with `browser-cloud-resident.ts`, shared sleep helper, no `typeof window`.

## Verification
`test/browser-cloud-dev-bridge.test.mjs`, `test/native-secure-slots.test.mjs`, `test/browser/browser-cloud-dev.spec.ts`, `cloud-tts-streaming.spec.ts`; `npm run build && audit:bundle` with and without `ELIZA_DEV_ALLOW_TEST_MOCKS=1`.
