# apps/app/src/browser/calendar-editor-draft.ts
- Lines: 39 | Role: retains unsaved calendar-editor fields in the shared assistant draft store and drives the draft panel (restore/replace/discard/retry/recover). | Verdict: SIMPLIFY
- Importers: 1 (`browser/calendar-editor.ts:3`). Text/path pins: `test/support/feature-parity.mjs`; behaviour in `test/browser/calendar-modal-draft.spec.ts`, `calendar-edit-draft.spec.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27 | A3 | `'Recover editor storage'` button → `openDomainRecovery({capture … raw:JSON.stringify({saved,current})…})` — a backup/reset dialog that only opens with test mocks (`domain-recovery.ts:9`); D3 deletes backup export. | Delete the `recover` button and the `openDomainRecovery` import; on storage error show `openRetainedDataNotice` or only Retry. | Low |
| 2 | 29 | B3 | `capture` builds `raw` itself then runs `readCalendarEditorDraft(raw,identity.id)` to validate its own write; only the 64 000-byte limit can fail. | Replace with a size check `if(new TextEncoder().encode(raw).length>64000)`. Keep the full validator on the read path (line 22, storage boundary). | Low |
| 3 | 9 | C3 | `keys(v,list)` plain-object-with-allowed-keys guard; plain-object guards exist ~35× in src. | Use the shared `isPlainObject` and check keys. | None |
| 4 | 7 | A7 | `export function readCalendarEditorDraft` — no importer outside. | Drop `export`. | None |
| 5 | 24-25 | D12 | `window.confirm('Replace edits?')` in product UI, unlike every other dialog. | Owner/UI decision; leave unless the dialog kit lands. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CalendarEditorFields` | type | 5 | form fields in `prototype/calendar-form-draft-adapter.ts`, `calendar-edit-draft-adapter.ts` | keep, export once and import there |
| `RecordDraft` | type | 6 | draft envelopes in `runtime/assistant-draft-store.ts` | keep |
| `keys` | helper | 9 | `isPlainObject` copies (C3) | shared helper |

## Proposed end state
~33 lines: no recover/backup path, no self-validation on write, shared object guard. Persisted draft format (`{version:1,id,revision,fields}`, binding `['calendar-modal-editor',…]`) unchanged.

## Verification
`test/browser/calendar-modal-draft.spec.ts`, `test/browser/calendar-edit-draft.spec.ts`, `test/browser/assistant-draft-recovery.spec.ts`.
