# apps/app/src/browser/workflow-trigger-runtime.ts
- Lines: 93 | Role: dev workflow simulator — 1 s foreground poll that snapshots simulated Messages/Inbox/Calendar/location, runs `detectWorkflowTriggers`, persists cursors+queue and dispatches queued jobs | Verdict: SIMPLIFY
- Importers: 1 — `browser/simulated-workflows.ts:5` (dev-only). Text/path pins (must survive edits): `test/workflow-trigger-detection.test.mjs:153-160` regex-matches this file's text (`this\.calendarEvents\.get\(begin,end\)`, `'alpha:calendar-sync-source-changed'`, `private wake=\(\)=>\{this\.blocked=false;this\.held=false;this\.calendarEvents\.clear\(\);`, `detected\.errors\[0\]`) — T1; `specs/quint/refinement/services/trigger-cursor-replay.mjs:32-40` source-loads the file and replaces import specifiers `workflow-focus$`, `platform-plugins$`, `location-simulation$`, `sensor-policy$`, `saved-places$`, `native-location$` — T10; `specs/quint/services/manifest.json:478,535,659-663,3896-3921` pins symbols `WorkflowTriggerRuntime`, `blocked`, `held`, `wake`, `position`, `watching`, `triggerState`, `workflowNeedsReview`; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 vs 43, 87-88 | C3 (local) | Two readers of the same dev state: uncached `app(api,name)` (line 14, used at 27, 88-89) and cached `this.stored(api,name)` via `ParsedDocuments` (line 43) | use `this.stored` everywhere (pass the runtime into `hydrateTriggerJob` or keep `app` only there) and delete `app` | low |
| 2 | 13 | C3 / P5 | `foreground` = negation of `noticeActionBlocked` (`notice-action.ts:2`) spelled out with the lock selector | `const foreground=()=>!noticeActionBlocked()` | none (text pins do not cover it) |
| 3 | 15 | C3 | SHA-256 hex `sha` (≈25 copies) | `sha256Hex(JSON.stringify(value))` | none — hash input must stay `JSON.stringify(value)` (queued `sourceHash` values persist in `alpha.dev.app.workflows`) |
| 4 | 26, 53, 59 | C2 | `registerPlugin<any>('AlphaCalendar')` ×2, `registerPlugin<any>('ElizaLocation')` | typed plugin singletons | none (replay stubs `platform-plugins$`) |
| 5 | 35-36 | D10 / P16 | `workflowUsesAgent`/`workflowNeedsReview` decide on step text (`'a note in notes'`, `'read it aloud'`, `/not at home/i`) | template ids if simulator kept | dev-only; manifest pins `workflowNeedsReview` |
| 6 | 39-40 | D8 | 8 private fields on one line | one per line (manifest pins names only) | none |
| 7 | 60, 88 | D8 / D9 | 600-char calendar loop (60) and dispatch picker (88) | extract `listEventsFor(flow)` and `nextDispatchable(state)` | low |
| 8 | 70 | B3 | `!Array.isArray(triggerState.cursors)||…queue.length>100` — duplicates the cursor validation inside `detectWorkflowTriggers` (`workflow-triggers.ts:52`) | keep only the queue check here | low |
| 9 | 89 | B1 (justified) | `.catch(()=>{this.held=true;})` | keep; comment that a failed dispatch holds the queue | — |
| 10 | 9 | C1 | `type Bag` | shared | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `TriggerJob`, `TriggerState`, `emptyTriggerState` | type/const | 10-12 | none (TriggerState/emptyTriggerState used only here — un-export) | keep, un-export TriggerState/emptyTriggerState |
| `foreground` | helper | 13 | 5 lock/foreground copies | `notice-action.ts` |
| `app` | helper | 14 | 10 dev-state sites + `this.stored` in this file | delete (use `stored`) |
| `sha` | helper | 15 | ~25 | `sha256Hex` |
| radius side test | inline | 55 | workflow-location.ts:20-21 | `maps/route-distance.ts` |

## Proposed end state
~85 lines over more physical lines, one dev-state reader, shared predicate/hash/plugin types. Keep field and method names pinned by the manifest and the exact `wake` text pinned by the test — or delete that T1 test first.

## Verification
`test/workflow-trigger-detection.test.mjs` (incl. the source-text test at 152-160), `node specs/quint/refinement/services/trigger-cursor-replay.mjs` via the services model run, dev trigger specs `test/browser/dev-workflow-*.spec.ts`.
