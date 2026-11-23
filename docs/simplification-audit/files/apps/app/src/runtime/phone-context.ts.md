# apps/app/src/runtime/phone-context.ts
- Lines: 167 | Role: sanitizes the screen observation sent with each agent turn (view, revision, selected object by kind) and selects the device capabilities offered to an agent; legacy text envelope. | Verdict: SIMPLIFY
- Importers: `runtime/connection-ui.tsx:72`; scripts `eval-device-action-clarification.ts:34`, `test-agent-context-browser.ts`, `test-calendar-availability-flow.ts:59`, `test-connection-history.ts:35`, `test-maps-context-browser.ts`.
- Text/path pins: `specs/quint/refinement/application/observation-turn-dispatch.mjs:12` (reads source), `specs/quint/application/manifest.json`, `test/feature-parity.test.mjs` and `scripts/test-calendar-availability-flow.ts` (read text), `test/context-selection.test.mjs`, `test/device-capability-selection.test.mjs`, `test/reminder-capability-negotiation.test.mjs`, `test/sms-agent-flow.test.mjs`, `test/telephony-agent-flow.test.mjs`, `test/aosp-sms.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16, 49-52, 86-88 | A1 | legacy kinds `legacy-app-notes-source`, `legacy-app-calendar-source`, `legacy-app-calendar-event` (`accountId:'device-local-legacy'`), fed by `agent-adapter.ts:590,655` and `legacy-notes-access.ts`. | Delete with the legacy-notes/calendar chain (owner). | Owner |
| 2 | 83-85 | A1 | `note-source` ("The previous Notes source changed.") belongs to the same previous-notes source. | Same decision as #1. | Owner |
| 3 | 106-129 | A1/A3 | `phoneContextMessage` "Legacy compatibility envelope": sent only to unnegotiated peers in test-mocks builds (`connection-ui.tsx:3389,3423`) and used to recognise history stored by older builds (`connection-ui.tsx:1679`). | Delete with remote pairing + history recogniser (owner); scripts `test-agent-context-browser`, `test-maps-context-browser`, `test-connection-history` use it. | Medium |
| 4 | 39-98 | D9 | per-kind validation as a chain of 15 `if (selected.kind===…)` blocks, two of which return early. | `const KIND_RULES:Record<Kind,(selected,view)=>SelectedObject|void>`; one lookup. | Medium (Quint harness reads text) |
| 5 | 42, 46, 50, 56, 59, 62, 66, 69, 87, 90 | D8 | 10 lines over 300 characters; every block repeats `selected.accountId!==undefined||selected.sourceRevision!==undefined||selected.occurrenceId!==undefined`. | `absent(selected,'accountId','sourceRevision','occurrenceId')` helper. | Low |
| 6 | 132 | C6 | `CALENDAR_AVAILABILITY_CAPABILITY='calendar.availability-read.v1'` "kept equal by test-calendar-availability-flow"; upstream exports it (`packages/contracts/src/device-reviews.ts:13`, projected). | Import upstream; drop the equality test. | Low |
| 7 | 18 | C6 | `OWN_NOTIFICATION_SOURCE='own'` exported but unused; the same literal is used in `source-renewal-question.ts:11` and `browser/notifications.ts`. | Import it there (do not delete). | None |
| 8 | 146-148, 161 | A4 | `notes.organize.v1` never offered (comment), `contactLookup:false` hard-coded. | Keep as data; record the decision in DECISIONS.md; delete the organise dispatcher if owner agrees. | Low |
| 9 | 103 | B1 | `try{parseClientTurnObservation(result)}catch{throw new Error('This screen observation is not supported.')}` — user-facing message, specified; keep but pass `{cause}`. | Add cause. | None |
| 10 | 66 | C6 | SIM revision grammar `/^slot\d{1,3}-[0-9a-f]{8}$/` must match `sms-subscription-revision.ts`. | Export the pattern from `sms-subscription-revision.ts`. | None |
| 11 | 136 | A7 | `DeviceCapabilityProfile` exported, 0 external users. | Unexport (or keep for scripts' typing). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `views` | const | 15 | view-id lists in `product/alpha-product-registration.ts` | registration |
| `opaque` | helper | 22 | identifier grammar in upstream `client-turn-observation` | keep |
| `CALENDAR_AVAILABILITY_CAPABILITY` | const | 132 | upstream `device-reviews.ts:13` | upstream |
| `OWN_NOTIFICATION_SOURCE` | const | 18 | `'own'` literal in `source-renewal-question.ts:11`, `browser/notifications.ts` | here |

## Proposed end state
~110 lines: kind-rule table without legacy kinds, `absent()` helper, upstream capability constant, no envelope (after owner decisions). Without the owner decisions: ~140 lines (table + helpers only).

## Verification
`test/context-selection.test.mjs`, `test/device-capability-selection.test.mjs`, `test/reminder-capability-negotiation.test.mjs`, telephony/SMS agent flow tests, Quint `observation-turn-dispatch`, scripts `test-agent-context-browser`, `test-maps-context-browser`, `test-connection-history`, `eval-device-action-clarification`.
