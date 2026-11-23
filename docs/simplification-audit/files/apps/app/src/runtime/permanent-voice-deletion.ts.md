# apps/app/src/runtime/permanent-voice-deletion.ts
- Lines: 15 | Role: binds the shared notes deletion claims to the installed claim prefix `alpha.notes-deletion-claim.v1:`; re-exports the permanent-deletion plan helpers. | Verdict: MERGE into the notes bindings module
- Importers: `prototype/voice-adapter.ts:23`; `scripts/test-notes-trash-flow.ts:184`.
- Text/path pins: `specs/quint/refinement/application/portable.mjs:132` (reads this path), `specs/quint/application/manifest.json`, `test/notes-deletion-lease.test.mjs` (reads text), `test/quint-conformance.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 12-15 | D4 | re-export list plus renamed aliases (`claimDeletion=claims.claim`). Unused re-exports: `PermanentDeletionEvidence`, `PermanentDeletionStep`, `DeletionLease` (0/0); `deletionLeaseDue` test-only. | voice-adapter imports upstream names; export `notesDeletionClaims` only. | Low (Quint portable harness reads text) |
| 2 | 5-6 | A8 | "(MVP-15)" tag; lease-length note is a real constraint (equals `NotesDeletionLease.LEASE_MS` in Java) — keep that sentence. | Trim tag. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| claim prefix `'alpha.notes-deletion-claim.v1:'` | const | 11 | — (installed identity) | notes bindings |

## Proposed end state
File deleted; `export const notesDeletionClaims=createNotesDeletionClaims('alpha.notes-deletion-claim.v1:')` in the notes bindings module.

## Verification
`test/notes-deletion-lease.test.mjs`, Quint `portable.mjs` and conformance test, `scripts/test-notes-trash-flow.ts`, `notes-permanent-delete-backstop` spec.
