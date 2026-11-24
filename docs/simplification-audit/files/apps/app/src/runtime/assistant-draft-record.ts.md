# apps/app/src/runtime/assistant-draft-record.ts
- Lines: 3 | Role: type alias `AssistantDraft = DurableDraft` over upstream | Verdict: DELETE
- Importers: `prototype/inbox-unsaved.ts:3` only. Text/path pins: `specs/quint/application/manifest.json` `sources` arrays (lines 162, 1105); `test/support/feature-parity.mjs` inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | D4 | `export type AssistantDraft=DurableDraft;` — a one-line rename shim (research P10). | `inbox-unsaved.ts` imports `type DurableDraft` from upstream `upstream renderer: state/durable-draft.ts`; delete this file; remove it from the two manifest `sources` arrays and the feature-parity list. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `AssistantDraft` | type alias | 3 | upstream `DurableDraft` | upstream |

## Proposed end state
File removed (0 lines).

## Verification
`npm run verify` (typecheck), quint application models whose `sources` list it; Playwright assistant draft specs unaffected.
