# apps/app/src/runtime/deletion-owner.ts
- Lines: 10 | Role: holds the current browser-model owner reader so browser stores can stamp and check deletion intents. | Verdict: MOVE to apps/app/src/browser/deletion-owner.ts
- Importers: 6 (`browser/calendar-linked-local.ts`, `browser/calendar.ts`, `browser/daily.ts`, `browser/deleted-note-origins.ts`, `browser/deletions.ts`, `main.tsx`). Text/path pins: `specs/quint/native/manifest.json`, `test/browser/calendar-linked-storage.spec.ts`, `test/browser/dev-parity.spec.ts`, `test/fixtures/browser-daily-stores.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-10 | D11 | "Browser models only" module lives in `runtime/`; every reader except `main.tsx` is in `browser/`. Research said "single caller"; that is wrong: 6 importers. | Move to `browser/deletion-owner.ts`; update 6 imports and the 5 pins above. | Low |
| 2 | 9 | D9/C3 | `before.length===6&&…[0,1,2,4,5].every(index=>…)` compares an owner tuple by magic positions after `JSON.parse(owner.slice(6))`. The tuple is built in `main.tsx` (`'agent:'+JSON.stringify([...])`). | Name the positions: export `ownerTupleSameEnrollment(a,b)` next to the builder, or compare named fields. | Low |
| 3 | 9 | B1 | `try{JSON.parse…}catch{return false;}` on strings this app wrote. | Keep (owner strings are persisted in browser stores; a malformed old row must not throw). One-line comment. | — |
| 4 | 2 | D3 | Module-level mutable `current` reader set by `bindBrowserDeletionOwner` from `main.tsx`. | Acceptable for a dev-browser store; keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| owner tuple parse | helper (inline) | 9 | session tuples built with `JSON.stringify([...])` in `deletion-undo.tsx:10`, `connection-ui.tsx:1647`, `agent-calendar.ts:14` | one `sessionKey`/`parseSessionKey` helper (research §4) |

## Proposed end state
Same four functions at `browser/deletion-owner.ts`, the index list replaced by a named comparison. ~10 lines.

## Verification
`test/browser/calendar-linked-storage.spec.ts`, `test/browser/dev-parity.spec.ts`, `test/browser/durable-delete-undo.spec.ts`; `specs/quint/native/manifest.json` path entry must be updated.
