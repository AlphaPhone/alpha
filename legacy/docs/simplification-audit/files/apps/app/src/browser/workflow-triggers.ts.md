# apps/app/src/browser/workflow-triggers.ts
- Lines: 121 | Role: pure trigger detection for the dev workflow simulator (time/event/message/email/location cursors), plus `EventRangeCache`, `ParsedDocuments` and `triggerTickPlan` | Verdict: KEEP (minor SIMPLIFY)
- Importers: 1 in apps — `browser/workflow-trigger-runtime.ts:2`. Text/path pins: `LemmaScript-files.txt:7` and generated `specs/lemma/apps/app/src/browser/workflow-triggers.dfy(.gen)` — the `//@ verify` / `//@ ensures` annotations on `placeChanged` (29-35), `cursorThrough` (37-46) and `triggerTickPlan` (115-121) are proof inputs; `specs/lemma/README.md:172`; `specs/quint/services/manifest.json:479,536,3897,3925-3945` (symbols `placeChanged`, `triggerTickPlan`, `detectWorkflowTriggers`, `TriggerCursor`, `placeKey`, `TriggerError`); `specs/quint/refinement/services/trigger-cursor-replay.mjs:41` imports `triggerDefinition`, `detectWorkflowTriggers`; `test/workflow-trigger-detection.test.mjs:4` imports six exports; `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14, 26 | C3 (local) | `placeValue` and `placeZone` both encode `trigger.place==='I arrive at work'?'work':'home'` | `placeValue=(t,s)=>s.places[placeZone(t)]` (move `placeZone` above) | none |
| 2 | 10, 80 | C6 (local) | `trigger.person||'maya'` four times | `const person=trigger.person||'maya'` once per flow | none |
| 3 | 62, 68, 83 | C3 (local) | "history full" guard `if(seen.size>=10000)throw Error('Workflow trigger history is full.')` thrice (+`keys.length>10000`) | `const MAX_SEEN=10_000` + `remember(key)` helper | none |
| 4 | 5 | (twin owner) | `triggerDefinition` is the canonical `JSON.stringify({name,trig,steps})`; re-spelled in `simulated-workflows.ts:20` and `workflow-focus.ts:26,41` | make those import it | none |
| 5 | 16, 59, 71, 86 | D10 | supported values are display strings (`'Every day'`, `'A deep-work event starts'`, `'I arrive home'`) | keep while the simulator's model stores labels; list them once as `const TRIGGER_LABELS` | dev-only |
| 6 | 52 | B3 (keep) | cursor validation of state read from localStorage — real storage boundary | keep | — |
| 7 | 98-111 | D11 | `EventRangeCache` and `ParsedDocuments` are runtime caches in a "pure detection" module (the runtime is their only user) | optional: move next to `WorkflowTriggerRuntime`; test imports them from here, so only if the test import moves too | low |
| 8 | 1 | C1 | `type Bag` | shared | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `TriggerOccurrence`, `TriggerCursor`, `TriggerSnapshot`, `TriggerError`, `TriggerTickState` | type | 2-4, 25, 114 | none | keep |
| `triggerDefinition` | helper | 5 | simulated-workflows.ts:20, workflow-focus.ts:26,41 | keep here (owner) |
| `identity` | helper | 6 | `workflow-focus.ts:10` stable-id check | keep |

## Proposed end state
~115 lines; proof annotations, exported names and behaviour unchanged.

## Verification
`npm run` Lemma/Dafny check for LemmaScript files (regenerate `.dfy.gen` only if annotated functions change), `test/workflow-trigger-detection.test.mjs`, services Quint run incl. `trigger-cursor-replay.mjs`.
