# apps/app/src/runtime/app-record-completion.ts
- Lines: 58 | Role: turns canonical effect receipts in a reply into at most one Notes and one Calendar refresh hint (window events) | Verdict: MERGE `automation-completion.ts` into this file (one `effectInvalidations` pass)
- Importers: runtime/connection-ui.tsx only. Text/path pins: `scripts/test-connection-history.ts`, `test/browser/canonical-notes.spec.ts` (dispatches the literal event names), feature-parity inventory. No manifest pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4 | C6 | `NOTES_INVALIDATED_EVENT = 'alpha:canonical-notes-invalidated'` duplicates `CANONICAL_NOTES_INVALIDATED_EVENT` in prototype/canonical-notes-controller.ts:6; `'alpha:canonical-calendar-invalidated'` is written as a literal in prototype/agent-calendar-adapter.ts:135,137. | One exported constant per event here; both listeners import it. Strings unchanged (tests dispatch them). | None. |
| 2 | whole file vs automation-completion.ts | C5 | `automation-completion.ts` repeats the same loop: guard result object → `normalizeEffectReceipts` in try/catch → filter `outcome==='applied' && commit.kind==='durable'`. | One function returning `{notes?:{revision?}, calendar:boolean, automations:boolean}`; connection-ui dispatches the events. | Low. |
| 3 | 30-33 | B1 (keep) | `catch { continue; }` on malformed receipts — specified: refresh hints only, never authority. | Keep with the existing comment. | — |
| 4 | 34-51 | D9 | Nested boolean chains for three receipt kinds. | Named predicates `isDurableNoteMutation`, `isCalendarMutation`, `isApprovedCalendarEvent`. | None. |
| 5 | 11-14 | owner check | Note operation set holds two naming schemes (`notes.note.create` … and `notes.create-note` … `notes.restore-note`). | Confirm with upstream which names `normalizeEffectReceipts` can still emit; drop the other set. | Low (refresh hint only). |
| 6 | 6-9 | A7 | `AppRecordInvalidation` exported, 0 external importers. | Unexport. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NOTES_INVALIDATED_EVENT` | const | 3 | canonical-notes-controller.ts:6 | here |
| `CALENDAR_INVALIDATED_EVENT` | const | 4 | literal in agent-calendar-adapter.ts:135,137 | here |
| receipt walk | helper | 23-53 | automation-completion.ts:5-11 | here |

## Proposed end state
`effect-invalidations.ts` (~55 lines) replacing both completion modules: three event constants, one receipt walk with named predicates, one result object.

## Verification
`test/automation-completion.test.mjs`, `test/browser/canonical-notes.spec.ts`, `scripts/test-connection-history.ts`, automations and calendar Playwright refresh specs.
