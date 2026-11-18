# apps/app/src/browser/workflow-focus.ts
- Lines: 42 | Role: dev workflow simulator — "deep-work focus" run: snapshots messages/inbox/notifications, polls until the Calendar block ends, summarises held/allowed arrivals | Verdict: SIMPLIFY (dev-only; DELETE with the simulator if owner decides)
- Importers: 2 — `browser/simulated-workflows.ts:1`, `browser/workflow-trigger-runtime.ts:1` (`isFocusWorkflow`). Dev-only (stubbed `simulated-apps`). Text/path pins: `specs/quint/refinement/services/trigger-cursor-replay.mjs:33` replaces `'workflow-focus$'` with a stub (pins the import specifier in workflow-trigger-runtime.ts), `test/workflow-trigger-detection.test.mjs` (isFocusWorkflow by name), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | D10 / P16 | `isFocusWorkflow` matches display text: `flow.trig.ev==='A deep-work event starts'&&…step.t.toLowerCase()==='a message is from maya, let it through'` | Key on a template id stored with the flow | dev-only; fixtures use labels |
| 2 | 26, 41 | C3 | `JSON.stringify({name:flow.name,trig:flow.trig,steps:flow.steps})` inline twice — exactly `triggerDefinition` (`workflow-triggers.ts:5`), also `simulated-workflows.ts:20` `definition` | import `triggerDefinition` | none |
| 3 | 9, 26, 41 | C3 | dev-app-state merge `{...api.get(n),...JSON.parse(localStorage.getItem('alpha.dev.app.'+n)||'{}')}` three times | `devAppState(api,name)` (see workflow-dated-sources report) | none |
| 4 | 41 | C3 / research P5 | inline foreground predicate `!document.hidden&&…devBackground!=='true'&&!Array.from(document.querySelectorAll('[aria-label="Unlock with fingerprint"], [aria-label="Wake"]'))…` — twin of `notice-action.ts:2 noticeActionBlocked`, `workflow-trigger-runtime.ts:13 foreground`, `workflow-speech.ts:8`, `voice.ts:275` | `!noticeActionBlocked()` (or the proposed `foregroundBlocked()`) | none |
| 5 | 12, 16, 26 | C2 | `registerPlugin<any>('AlphaNotifications')`, `registerPlugin<any>('AlphaCalendar')` ×2 | typed plugin singletons | none |
| 6 | 23-37, 41 | D8 / D9 | `waitForFocusEnd` tick is one 1,100-char line (31); `waitForFocusReview` whole body on one 900-char line | Format; extract `readArrivals()` and `foregroundReady()` | none |
| 7 | 18, 28, 31 | B3 / P6 | notification epoch read three times around one snapshot ("check, act, check") | dev-only: keep one pre/post epoch compare | low |
| 8 | 5 | C1 | `type Bag` + `FocusBlock.arrivals:Bag[]` | shared `Bag` | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `FocusBlock` | type | 5 | none (simulated-workflows imports it) | keep |
| `signature` | helper | 7 | none | keep |
| `app` (dev state) | helper | 9 | 10 sites | `devAppState` |
| inline definition | helper | 26, 41 | `triggerDefinition`, simulated-workflows.ts:20 | workflow-triggers.ts |
| inline foreground | helper | 41 | 5 sites | notice-action.ts / platform foreground module |

## Proposed end state
~36 lines formatted over more physical lines; shared definition/foreground/dev-state helpers; label match replaced by template id if owner keeps the simulator.

## Verification
Dev focus specs `test/browser/dev-workflow-*.spec.ts` (focus), `test/workflow-trigger-detection.test.mjs`, `trigger-cursor-replay.mjs` (keep export name `isFocusWorkflow` and the import specifier `./workflow-focus`).
