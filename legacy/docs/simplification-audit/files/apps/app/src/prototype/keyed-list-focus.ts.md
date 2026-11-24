# apps/app/src/prototype/keyed-list-focus.ts
- Lines: 44 | Role: generic DOM helper that keeps keyboard focus on a logical list item (by data attribute) when a committed render moves it between parents. | Verdict: KEEP (optional MOVE to `apps/app/src/lib/keyed-list-focus.ts`)
- Importers: `apps/app/src/prototype/subview-accessibility.ts:3` (only app importer).
  Text/path pins: `specs/quint/refinement/application/list-focus.mjs:8,69-72` (strips types and inserts an observer at the literal marker `'return {\n    capture()'` – T10), `specs/quint/application/manifest.json:1452`, `test/browser/browser-list-focus.spec.ts:8`, `test/browser/maps-list-focus.spec.ts:4`, `test/browser/notes-photos-list-focus.spec.ts:6` (list it as a source path), `test/support/feature-parity.mjs:379`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | C3 (minor) | `hidden(element)` = `!getClientRects().length || closest('[inert],[hidden],[aria-hidden="true"]')`; similar visibility probes exist in `subview-accessibility.ts` and dialog helpers. | If a shared `isUserVisible(el)` is introduced for the dialog consolidation (C4), reuse it here. | None |
| 2 | 1-44 | D11 | Pure, framework-free DOM utility filed under `prototype/`. | Move to `apps/app/src/lib/` with the other shared helpers when the folder is restructured; update the 5 path pins above. | Low |
| 3 | 9-24 | — | Clear, well-commented, formatted; no defensive noise beyond real DOM states. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `FocusSnapshot` | type | 1 | none | stays |
| `hidden` | helper | 7 | visibility checks in `subview-accessibility.ts` | shared DOM util if one is created |

## Proposed end state
Unchanged, 44 lines; possibly relocated to `lib/`.

## Verification
`test/browser/browser-list-focus.spec.ts`, `maps-list-focus.spec.ts`, `notes-photos-list-focus.spec.ts`, quint application list-focus replay (`list-focus.mjs`).
