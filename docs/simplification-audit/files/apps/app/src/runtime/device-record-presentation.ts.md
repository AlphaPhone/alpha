# apps/app/src/runtime/device-record-presentation.ts
- Lines: 177 | Role: owner-facing review-card and receipt copy for Calendar, Notes and reminder device operations. | Verdict: KEEP (minor SIMPLIFY)
- Importers: 6 product (`browser/calendar-agent-review.ts`, `browser/calendar.ts`, `prototype/agent-adapter.ts`, `prototype/calendar-availability-review.ts`, `runtime/connection-ui.tsx`, `runtime/device-actions.ts`). Text/path pins: `scripts/prepare-client-features.ts` (path), `scripts/test-connection-history.ts`, `test/device-record-presentation.test.mjs`, `test/reminder-card-presentation.test.mjs`, three `test/browser/*assistant.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 50-169 | D9 | 120-line `switch` where most cases only set a fixed `title`/`applied`/`details` triple (`notes_read_selected`, `notes_delete`, `calendar_read_next`, `calendar_read_selected`, `calendar_delete`, `reminder_read_selected/complete/snooze/cancel`). | Move the nine fixed cases to a `FIXED_COPY: Record<type,{title,applied,details}>` table; keep the switch for the five computed cases. Copy strings unchanged. | Low (user-visible copy must stay byte-identical; tests pin it) |
| 2 | 55-57, 77-82, 121-128 | D9 | Ternary pairs computing `title` and `applied` from the same `create/update` test. | Collapse into one destructured pair per case. | None |
| 3 | 2-9 | D13 | Five deep `.eliza` imports. | `@eliza/*` alias. | None |
| 4 | 42-43 | — | Inline structural types `{type:"create_reminder";…}`, `{type:"create_note";…}` for legacy browser operations. | Keep unless the browser-only create ops are deleted; check with prototype owner. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `formatReviewDateTime` | helper | 12-13 | upstream `formatDeviceRecordDateTime` (second precision); different precision, intentional | stay |
| `presentReminderTiming` | helper | 15-33 | no | stay |

## Proposed end state
Same exports and identical copy; fixed cases in a lookup table, computed cases in a short switch. ~145 lines.

## Verification
`test/device-record-presentation.test.mjs`, `test/reminder-card-presentation.test.mjs`, `test/browser/dev-calendar-assistant.spec.ts`, `test/browser/reminder-v2-assistant.spec.ts`.
