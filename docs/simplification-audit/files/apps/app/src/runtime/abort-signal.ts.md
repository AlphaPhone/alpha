# apps/app/src/runtime/abort-signal.ts
- Lines: 44 | Role: `anyAbortSignal` (AbortSignal.any polyfill) plus `runProviderConfiguration` (lease-then-configure-or-cancel sequence for AI provider keys) | Verdict: SPLIT (`runProviderConfiguration` MOVES to the provider-key module split out of `local-agent.ts`; polyfill stays pending WebView-floor decision)
- Importers: `anyAbortSignal` 12 files (browser/cloud-connection.ts, browser/digest-authorization-document.ts, browser/digest-delegation-ui.tsx, browser/digest-storage.ts, maps/resident-relay.ts, prototype/note-source-adapter.ts, prototype/scan-document.ts, runtime/agent-calendar-client.ts, runtime/connection-ui.tsx, runtime/local-agent-native-stream.ts, runtime/local-agent.ts, runtime/owner-reminder-notification-port.ts); `runProviderConfiguration` only `runtime/local-agent.ts`. Text/path pins: `test/abort-signal-compat.test.mjs:5` (readFileSync of this file, T1), `test/direct-provider-module-budget.test.mjs` (reads it), `test/provider-configuration-cancellation.test.mjs`, `test/provider-key-manager-bridge.test.mjs`, `test/local-agent-feature-starting.test.mjs`; `specs/quint/application/manifest.json` sources arrays (lines 2747, 2900, 2951); `specs/quint/refinement/application/note-source-dialog.mjs`, `specs/quint/refinement/services/scan.mjs`, `specs/quint/services/scan-source-conformance.mjs`; `test/support/feature-parity.mjs:442` inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-16 | B2 (conditional) | `if (typeof AbortSignal.any === 'function') return AbortSignal.any(...)` — polyfill for "WebView 113". App minSdk is 29 (Android 10, updatable WebView); CI emulators run WebView 124/133/157. `browser-cloud-resident.ts:12,41` already calls `AbortSignal.any` directly. | Owner decision on the minimum WebView. If ≥ 116 (AbortSignal.any shipped in Chrome 116): delete lines 1-16, replace the 12 imports with `AbortSignal.any([...])`, delete `test/abort-signal-compat.test.mjs`. Otherwise keep as is. | Low if the floor is confirmed; high (cancellation breaks) on an old WebView. |
| 2 | 18-44 | D11 | `runProviderConfiguration` has nothing to do with signal composition; its only caller is the provider-key code in `local-agent.ts`. | Move to the provider-key module that the research proposes splitting out of `local-agent.ts` (local-agent.ts:506-725). | Low; update `test/provider-configuration-cancellation.test.mjs` import path. |
| 3 | 30, 41 | C6 | The 107-char copy `'Couldn’t confirm the AI provider change was cancelled. Check AI provider in Settings before trying again.'` is written twice. | One `const CANCEL_UNCONFIRMED` used at both sites. Copy unchanged. | None. |
| 4 | 24-37 | C3 | Hand-rolled abort race (`cancelled` promise + `Promise.race([configure, cancelled])` + listener cleanup), the same mechanism as `alpha-client.ts:321-345`, `local-agent.ts:236-250`, `client-observation-support.ts:55-66`, `always-on-listener.ts:29-44`. | Use one shared `raceAbort(promise, signal, reason)` helper in `apps/app/src/lib/abort.ts`; keep the lease-cancel side effect here. | Medium: the cancel-before-reject ordering (L30) must be preserved. |
| 5 | 29 vs 34 | B4 | L29 wraps `ports.cancel(requestId)` in try/catch for a synchronous throw; L34 calls the same port without it. Ports are async closures over Capacitor plugin methods. | Make both sites the same: call `ports.cancel(requestId)` without the sync try (an async function cannot throw synchronously). | Low. |
| 6 | 20-43 | D8 | One-line signature of 230 chars, statement soup throughout. | Format with the repo formatter. | None (but breaks T1 regexes in abort-signal-compat). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `anyAbortSignal` | helper | 2-16 | upstream `.eliza/client-features` uses `AbortSignal.any` directly; `browser-cloud-resident.ts:41` | keep here or delete per finding 1 |
| inline abort race in `runProviderConfiguration` | helper | 24-37 | alpha-client.ts:321-345, local-agent.ts:236-250, client-observation-support.ts:55-66, always-on-listener.ts:29-44, app-speech.ts:23 | `apps/app/src/lib/abort.ts` `raceAbort` |
| ports object type `{prepare,configure,cancel}` | type | 20 | none | name it `ProviderConfigurationPorts` in the provider-key module |

## Proposed end state
`abort-signal.ts` holds only `anyAbortSignal` (16 lines) or is deleted if the WebView floor allows. `runProviderConfiguration` (≈22 formatted lines) moves next to the provider-key manager, with one cancel-unconfirmed constant and the shared `raceAbort`. Estimated lines after: 16 (or 0).

## Verification
`test/abort-signal-compat.test.mjs`, `test/provider-configuration-cancellation.test.mjs`, `test/provider-key-manager-bridge.test.mjs`, `test/direct-provider-module-budget.test.mjs`, `test/local-agent-feature-starting.test.mjs`; quint `npm run verify` lanes for note-source-dialog / scan refinements; Playwright provider-key specs. Re-run `npm run verify`.
