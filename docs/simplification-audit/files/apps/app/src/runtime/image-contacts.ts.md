# apps/app/src/runtime/image-contacts.ts
- Lines: 12 | Role: applies the AOSP image's Contacts admission to the view order and leaves Contacts if it is withdrawn while open. | Verdict: KEEP
- Importers: 1 (`apps/app/src/main.tsx`). Text/path pins: `specs/quint/application/manifest.json:6995,7002`, `specs/quint/services/manifest.json:3214,3247`, `specs/quint/refinement/services/contacts-session-replay.mjs:13`, `test/image-contacts-admission.test.mjs:4`, `test/quint-view-admission.test.mjs:13`, `test/retired-shell-work.test.mjs:4`, `test/support/feature-parity.mjs:529`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | C1 | `type ContactsShell = {S(): {view?: unknown}; goHome(): void}` — another local structural view of the prototype shell. | Use `Pick<Shell,'S'|'goHome'>` from the single exported shell type (`prototype/model.d.ts` per PATTERNS C1) once it exists. | None. |
| 2 | 6 | B2 | `shell?: ContactsShell | null | undefined` — caller in main.tsx may pass no shell before mount; specified. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ContactsShell` | type | 1 | ~60 `Shell`/`Bag` declarations in `prototype/` and `browser/` | shared `Shell` type (`prototype/model.d.ts`) |

## Proposed end state
Unchanged except the shell type import (~12 lines). Small and covered by a Quint replay; merging it into main.tsx would worsen main.tsx sprawl.

## Verification
Quint view-admission and `contacts-session-replay.mjs`; `test/quint-view-admission.test.mjs`.
