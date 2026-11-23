# apps/app/src/browser/digest-delegation-ui.tsx
- Lines: 56 | Role: React dev UI to start/approve/cancel/revoke a development Cloud read delegation | Verdict: MOVE to apps/app/src/dev/ (or DELETE with simulator)
- Importers: 1 (runtime/hosted-live-source-ui.tsx). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | C1 | `type Binding` local; another `Binding` exists in note-recording-journal.ts and many runtime files. | Rename `DelegationBinding`; keep local. | None. |
| 2 | 13-14, 37 | B1 | `catch{...}` handlers map failures to fixed status copy — specified UI behaviour. | Keep, add comment. | - |
| 3 | 41 | C4 | Retire-event list `['launcher-home','alpha:device-state','alpha:dev-incoming-call','pagehide']` + visibilitychange — same set in domain-recovery.ts:56, incoming-simulation.ts:33, location-simulation.ts:54, password-provider.ts:17. | Export `RETIRE_EVENTS` + `onRetire(callback)` from the dialog/foreground kit. | Low. |
| 4 | 54 | A1 | Recovery copy references legacy behaviour via openDomainRecovery (product shows "Data kept"). | Follows domain-recovery decision. | - |
| 5 | 47-55 | D8 | Long JSX lines with inline async handlers. | Extract named handlers (start, approve, cancel, revoke). | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Binding | type | 6 | note-recording-journal.ts:3 (different shape), runtime/* | rename locally |

## Proposed end state
Dev-only component with named handlers and shared retire-event helper. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 50 (current 56).

## Verification
test/browser/dev-digest-live.spec.ts, dev-hosted-journey.spec.ts.
