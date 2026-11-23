# apps/app/src/runtime/native-view-events.ts
- Lines: 25 | Role: subscribes a renderer to native `alphaViewEvent` view-interaction frames for one owner/client, with clean teardown. | Verdict: KEEP (minor)
- Importers: `runtime/local-agent.ts:2`.
- Text/path pins: `specs/quint/refinement/application/native-view-subscription.mjs:6` (reads this path), `specs/quint/application/manifest.json`, `test/native-browser-view-binding.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-12 | B1 | `quiet` swallows sync and async cleanup failures. Comment says why (cleanup failure cannot prevent the terminal callback). | Keep; share one `quiet`/`bestEffort` helper with `native-connection.ts` cancel sites. | None |
| 2 | 3 | C1 | `listener:(value:any)=>void`. | Type the frame (`{subscriptionId:string;type:'end'|'event';event?:…}`). | None |
| 3 | 8, 13-23 | D8 | dense one-line statements. | Format. | Low (Quint harness reads text) |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `NativeViewEventPort` | interface | 2-6 | `local-agent-native-events.ts` (same resident IPC feed; check) | keep / `native/plugins.ts` |
| `quiet` | helper | 9-12 | `.catch(()=>{})` sites in `native-connection.ts`, `native-calendar-sync.ts` | `lib/abort.ts` `bestEffort` |

## Proposed end state
Same ~25 lines, typed listener payload, formatted.

## Verification
`test/native-browser-view-binding.test.mjs`, Quint `native-view-subscription` refinement.
