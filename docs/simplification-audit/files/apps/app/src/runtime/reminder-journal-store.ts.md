# apps/app/src/runtime/reminder-journal-store.ts
- Lines: 20 | Role: generic Android-slot / browser-document store with CAS edit, used by the two reminder journals. | Verdict: MOVE to `runtime/durable-slot.ts` (generalise; becomes the one adapter)
- Importers: `runtime/reminder-creations.ts:4`, `runtime/reminder-deletions.ts:3`, `scripts/test-reminder-time-flow.ts:36`.
- Text/path pins: Quint `reminder-adapter-fixture.mjs:29`, `specs/quint/application/manifest.json`, `test/native-secure-slots.test.mjs` (reads text), `quint-reminder-*` tests, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-19 | C4 | Best instance of the slot/document switch; re-implemented in `notes-folders.ts:7-19`, `notes-trash.ts:16-42`, `note-audio-deletions.ts:16-28`, `service-read-cache-store.ts:17-22`, `workflow-intents.ts:19-26`. | Rename `durableSlot<T>(slot, browser)`; add `compareExchange` and an `error` label parameter (callers keep their "X changed" messages); adopt in the five twins. | Medium (installed names unchanged) |
| 2 | 4 | C1 | inline `BrowserDocument` (also `notes-folders.ts:7`). | Type from `browser/json-domain-document`. | None |
| 3 | 10 | C3 | `android()` predicate. | `isAndroid`. | None |
| 4 | 16 | — | `next===raw` short-circuit (identity) vs `notes-folders.ts` JSON compare. | Document identity semantics in the generic helper. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `reminderJournalStore` | helper | 9 | 5 per-feature switches | `runtime/durable-slot.ts` |
| `BrowserDocument` | type | 4 | `notes-folders.ts:7` | browser document type |

## Proposed end state
`runtime/durable-slot.ts` (~25 lines) used by reminders, notes folders, notes trash, audio deletions and the read cache.

## Verification
`test/native-secure-slots.test.mjs`, Quint reminder fixtures, reminder storage browser specs, notes trash/folders specs after adoption; Android update-retention check.
