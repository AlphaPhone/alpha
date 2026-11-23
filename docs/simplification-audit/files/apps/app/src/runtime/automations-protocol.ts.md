# apps/app/src/runtime/automations-protocol.ts
- Lines: 173 | Role: Automations list/merge presentation over the agent's `/api/automations`, scheduled-tasks, reminders and definitions APIs, plus write operations with "confirmed" read-back checks | Verdict: SIMPLIFY
- Importers: prototype/automations-adapter.ts, runtime/automation-completion.ts (`AUTOMATION_RESOURCE_KINDS`). Text/path pins: `specs/quint/services/manifest.json` symbol pins `AutomationOutcomeError`, `mergeAutomationRows`; `specs/quint/refinement/application/scheduled-snooze-admission.mjs:12` (reads source), `specs/quint/refinement/services/automation-request-settlement.mjs:17` (`sourceModule`); `test/automations-unified.test.mjs`, `test/polish-automation-when.test.mjs` (esbuild `export *` of this file and workflow-local-time.ts); `specs/quint/ui-return-review-20261109.md`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D4 | Re-exports `workflowDeviceTimeZone, automationLocalDateInput, localDate, workflowNextClockOccurrence, workflowSnoozeTime` from workflow-local-time; automations-adapter.ts imports two of them through here. | Adapter imports from `workflow-local-time` directly; delete line 3. | None (tests bundle both modules anyway). |
| 2 | 33 | D10 | `automationWhen(stamp,_zone?,locale?)` ignores its zone argument; callers at L36, L77, L86 and in the adapter still pass one. | Drop the parameter and the arguments. | None. |
| 3 | 11, 22 | C1/C3 | `type ObjectValue = Record<string,any>` (Bag twin) and a throwing `object()` guard (twins calendar-approval.ts:34, agent-calendar.ts:25). | Shared `expectRecord(value, message)`; a real row type for `record`. | Low. |
| 4 | 8, 17, 20 | A7 | `AutomationKind`, `AutomationSnapshot`, `ScheduledVerb` exported, 0 external importers; `automationId`, `AUTOMATION_LIMIT_MESSAGE` used only by one test. | Unexport. | None. |
| 5 | 27-30 | A8 | Comment cites "elizaOS/eliza #trigger-routes (pin 4557621650)". | One line on the 429 rule. | None. |
| 6 | 61 | D10 | Snooze detected by matching upstream log text: `state.lastDecisionLog===\`snoozed until ${state.firedAt} (ladder reset)\``. | Ask upstream for a structured `snoozedUntil` field; until then isolate in a named predicate with a comment. | Medium: upstream wording change silently breaks the label. |
| 7 | 103-104, 114, 161, 165-167 | D8 | 300-600 char lines. | Format; split `savePrompt` trigger branches into a lookup. | None. |
| 8 | 119, 131, 139, 144, 156, 162, 167-172 | B3 (keep) | Read-back "was not confirmed" checks on network responses decide outcome-known vs unknown — product semantics at the network boundary. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ObjectValue` | type | 11 | `Bag` ×60, `Message` action-message-presentation.ts:5 | real row types / shared record type |
| `object` | helper | 22 | calendar-approval.ts:34, agent-calendar.ts:25, ~30 more | `lib/is-record.ts` (`expectRecord`) |
| `text` | helper | 23 | `string` parsers in cloud-protocol.ts:128-142 | `lib/parse.ts` |
| `list` | helper | 25 | none | keep |
| `automationId` | helper | 24 | id regexes in calendar-approval.ts, local-agent.ts | keep |
| `labels` gm/gn/checkin | const | 58 | upstream scheduled-task kinds | keep |

## Proposed end state
~150 formatted lines: no re-exports, no ignored parameter, shared record guard, unexported internals; network-boundary confirmations unchanged.

## Verification
`test/automations-unified.test.mjs`, `test/polish-automation-when.test.mjs`, quint `scheduled-snooze-admission` and `automation-request-settlement` (keep `AutomationOutcomeError`, `mergeAutomationRows` names), automations Playwright specs.
