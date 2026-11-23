# apps/app/src/daily.ts
- Lines: 138 | Role: TypeScript contract of the native `DailyApps` Capacitor plugin (reminders, todos, clock handoff, file selection, assistant surface) plus `Action`, `Reminder`, `NativeResult`, `ClockRequest`, `ClockResult` types | Verdict: SIMPLIFY (MOVE to a typed native-plugins module later — C2/D11)
- Importers: 33 app files (`DailyApps` in prototype adapters, `main.tsx:65`, `maps/regional-provider.ts:4`, runtime reminder modules; types in `browser/daily.ts:10`, `browser/reminder-deletions.ts:1`, `prototype/native-adapter.ts:6`, `prototype/selection-adapter.ts:10`, `prototype/clock-adapter.ts:3`). Text/path pins: `scripts/test-clock-handoff-flow.ts:8` imports types by path; browser specs import `/src/daily.ts` (`agent-clock-handoff`, `dev-connection-actions`, `home-daily-overview`, `reminder-lifecycle`, `one-calendar`, `host-reminder-recovery`, `native-plugin-startup`, `browser-voice-registration`); `test/support/feature-parity.mjs`. Native counterpart `android/.../DailyAppsPlugin.java`; web counterpart `browser/daily.ts` (`BrowserDaily`, not typed against this interface).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-138 | C2 | `DailyApps` is registered again with a different, partial shape in `startup-permissions.tsx:16-20` (`checkPermissions`, `requestPermissions`, `addListener('appResumed')`) — those two permission methods are missing here | add `checkPermissions`/`requestPermissions` to this interface, export `DailyAppsPlugin` type, make startup-permissions import `DailyApps` | none |
| 2 | 56 | C2 | `BrowserDaily` (`browser/daily.ts:35`) is not checked against this contract | `class BrowserDaily extends WebPlugin implements DailyAppsPlugin` (or `satisfies`) | low: may surface real mismatches |
| 3 | 73-76, 81 | A7 | `addListener('restoredResult', …)` and `restoreSelected()` — no renderer caller (git grep apps: only this file and `browser/daily.ts:172`); native still emits `restoredResult` (`DailyAppsPlugin.java:230`) and `test/plugin-worker-guard.test.mjs` names `restoreSelected` | delete the TS declarations and the browser stub; owner decides whether native keeps restoring dangling results | owner (native behaviour) |
| 4 | 116 | A7 / D7 | `reminderDecision` — no renderer caller; used by 5 browser specs, `browser/daily.ts:133`, Quint `browser-reminder-orphan.mjs`, Android instrumented test | keep only if notification-action parity needs it on web; otherwise test-only | owner |
| 5 | 136 | — | `initialLocation?: "downloads"` — no renderer caller; native reads it (`DailyAppsPlugin.java:144`) and an instrumented test uses it | keep (native contract) or delete with a native option — low value | low |
| 6 | 1-2 | D13 | `../../../.eliza/client-features/plugins/plugin-assistant/...` deep relative type imports | `@eliza/*` alias | low |
| 7 | 6-23, 63-80, 85-98 | D8 | mixed formatting (multi-line unions and `addListener` overloads vs one-line methods) | formatter pass | none |
| 8 | file | D11 | file name `daily.ts` describes neither "native plugin contract" nor its contents; `native.ts` holds the other plugin singletons | merge with `native.ts` into `native/plugins.ts` (research n–z P7) | medium: 33 importers + 9 spec imports by path |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Action` | type | 6-23 | none | keep |
| `Reminder` | type | 24-42 | `browser/daily.ts` rows, `runtime/reminder-*` | keep (canonical) |
| `NativeResult` | type | 43-52 | `selection-adapter.ts:221` `FilesStoragePort<NativeResult>` | keep |
| `ClockRequest`/`ClockResult` | type | 54-55 | `runtime/clock-contract.ts:19` re-exports upstream `ClockHandoffResult as ClockResult` — same name, different module | rename one (e.g. `ClockHandoffResponse` here) |
| inline DailyApps interface | interface | 56-138 | `startup-permissions.tsx:16-20` partial | export `DailyAppsPlugin` |

## Proposed end state
~125 lines: named exported `DailyAppsPlugin` interface including permission methods, dead `restoredResult`/`restoreSelected` gone, alias imports, formatted. Later merged with `native.ts` into one native plugin module.

## Verification
`npx tsc --noEmit` (structural typing will flag BrowserDaily mismatches), browser specs listed above, `scripts/test-clock-handoff-flow.ts`, Android build (`npm run android:build:local`) is unaffected by TS-only changes but run if native options change.
