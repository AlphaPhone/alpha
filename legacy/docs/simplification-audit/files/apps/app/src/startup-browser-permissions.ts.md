# apps/app/src/startup-browser-permissions.ts
- Lines: 89 | Role: browser implementation of the startup permission bridge (notifications, microphone, camera, location) using the Permissions API, `getUserMedia` (tracks stopped at once) and `getCurrentPosition` (fix discarded). | Verdict: SIMPLIFY (and MOVE behind the dev/browser boundary — the web build is a development preview, README.md:50)
- Importers: `startup-permissions.tsx:9` (used when `Capacitor.getPlatform() !== 'android'`). Tests: `test/browser-startup-permissions.test.mjs`, `test/startup-permission-completion.test.mjs` (tsImport).
- Text/path pins: `specs/quint/application/manifest.json` (path), `test/support/feature-parity.mjs:631`, `docs/formal-model-audit-2026-11/01-shell.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | D6 | Browser-only code compiled into the Android renderer bundle: on Android `startup-permissions.tsx` always uses the native bridges. | Load via dynamic `import()` from `startup-permissions.tsx` only on the browser host, or move to `apps/app/src/browser/startup-permissions.ts`. | Low; update manifest/feature-parity paths if moved. |
| 2 | 62-63, 76 | C3 (local) | `error && typeof error === 'object' && 'code' in error && error.code === 1` and the same shape for `code === 2 \|\| 3` and `'name' in error && error.name === 'NotAllowedError'`. | One `errorCode(error)` from `apps/app/src/lib/parse.ts` (same helper proposed for voice-states/voice-selection), or `error instanceof GeolocationPositionError` / `DOMException`. | Low. |
| 3 | 13-14, 17, 41 | B2 (partial) | `supported()` checks optional ports and throws "Permission API unavailable". In a browser `navigator.mediaDevices` is absent on insecure origins and `Notification` absent in some embedded browsers, so this is a real boundary — keep. The `ports.notifications!` / `ports.geolocation!` / `ports.media!` non-null assertions after `supported()` are type noise. | Narrow once: `const notifications = ports.notifications; if (!notifications) throw …` per branch, and drop the `!`. | None. |
| 4 | 46-52 | C3 | Hand-rolled bounded wait (`Promise.race([requestPermission(), new Promise(r=>{timer=setTimeout(r,15000)})])` + `clearTimeout`). | A shared `withTimeout(promise, ms)` in `apps/app/src/lib/abort.ts`. | Low. |
| 5 | 66-67 | B1 | `catch { /* Unknown permission authority retains the original failure. */ }` — specified. | Keep. | — |
| 6 | 79-85 | D8 | Mixed spacing (`const tracks=stream.getTracks();`). | Format. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `BrowserPorts` | type | 2-7 | none | stays |
| error-shape checks | helper | 62-63, 76 | `voice-states.ts:11-12`, `voice-selection.ts:76-78` | `apps/app/src/lib/parse.ts` `errorCode` |
| 15 s race | helper | 46-52 | abort/timeout races listed in voice-timing report | `apps/app/src/lib/abort.ts` `withTimeout` |

## Proposed end state
~80 formatted lines under the browser/dev boundary, with per-branch narrowing (no `!`), the shared error-code and timeout helpers; behaviour (fresh-grant-only-once readback, denied memory, track cleanup checks) unchanged.

## Verification
`node --test test/browser-startup-permissions.test.mjs test/startup-permission-completion.test.mjs`; Playwright `startup-access.spec.ts`, `startup-permissions-walkthrough.spec.ts` (browser host); `scripts/audit-production-bundle.ts` if moved out of the Android bundle.
