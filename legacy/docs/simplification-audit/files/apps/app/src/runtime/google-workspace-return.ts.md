# apps/app/src/runtime/google-workspace-return.ts
- Lines: 51 | Role: native App Link return (AppReturn v2) for Google Workspace consent: prepare/consume/cancel port, redirect URL allowlist, and a drain watcher. | Verdict: MERGE with google-connection-return.ts into apps/app/src/runtime/google-return.ts, and SIMPLIFY
- Importers: 3 product (`runtime/cloud-protocol.ts` – `googleWorkspaceRedirectAllowed`; `runtime/google-connection-ui.tsx`; `runtime/native-connection.ts` – port + `nativeGoogleWorkspaceReturnAvailable`). Text/path pins: `specs/quint/services/manifest.json`, `specs/quint/refinement/services/google-accounts.mjs`, `google-accounts-lifecycle.mjs`, `test/google-workspace-return.test.mjs`, `test/google-connection-return.test.mjs`, `test/google-calendar-connect.test.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/fixtures/google-account-panel.mjs`, `test/support/feature-parity.mjs`. `android/app/product.gradle` comment ties `ELIZAOS_APP_LINK_HOST` to the callback.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-36 | B2 | `nativeGoogleWorkspaceReturnAvailable(Capacitor.PluginHeaders)` inspects plugin headers for three `AlphaConnection` methods; used at `native-connection.ts:217`. Renderer and `AlphaConnectionPlugin.java` ship in the same APK. | Delete the probe; `googleWorkspaceReturnPort` is defined whenever `isAndroid`. | Low |
| 2 | 46 | B4 | `if(result.result==='connected'||result.result==='denied'||result.result==='failed')onReturn(...)` right after line 45 threw for anything else. | Call `onReturn` unconditionally. | None |
| 3 | 20-22 | C3 | `sameGoogleWorkspaceBinding` twin of `sameGoogleConnectionReturnBinding`. | Merge (see google-connection-return report). | Low |
| 4 | 47, 50 | B1 | `catch{if(valid())onError();}` (reported, not swallowed) and `.catch(()=>{})` on listener removal. | Keep. | — |
| 5 | 4 | — | `GOOGLE_WORKSPACE_CALLBACK` exported but used only internally and in tests/Quint. | Un-export unless the harness keeps importing it. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `GoogleWorkspaceBinding` | interface | 5-7 | `GoogleConnectionReturnBinding` | merged `GoogleSessionBinding` |
| `GoogleWorkspaceReturnPort` | interface | 8-13 | native `AlphaConnection` plugin interface in `native-connection.ts` (C2) | stay |

## Proposed end state
Part of `google-return.ts`: callback constant, redirect allowlist, `prepareGoogleWorkspaceReturn`, `watchGoogleWorkspaceReturn`; no header probe. ~40 of the merged ~85 lines.

## Verification
`test/google-workspace-return.test.mjs`, `test/google-connection-return.test.mjs`, Quint `google-accounts(-lifecycle).mjs`; on-device App Link return (device acceptance, not proven by tests).
