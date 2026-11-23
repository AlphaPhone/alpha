# specs/quint/refinement/application/contracts.mjs
- Lines: 130 | Kind: Quint refinement harness, four small campaigns (real modules via `bundledSource`/`sourceModule`/`sourceContext`) | Verdict: SPLIT: DELETE `notesLifecycle` (and `NotesLifecycle.qnt`), KEEP `calendarPresentation` and `permissionWalkthrough`, DELETE or KEEP `credentialVault` with the dev vault (owner/D19)
- Covers: `notesLifecycle` (legacy `NotesStore` + Trash policy, plus one canonical read/edit/save), `calendarPresentation` (creation draft keeps `creationId` through `encodeCalendarForm`/`decodeCalendarForm`), `credentialVault` (development vault unlock/expiry/lock and `passwordSurfaceOpen`), `permissionWalkthrough` (native startup permission progress v4 persistence). Callers: `index.mjs` only; run solely by the aggregate `test/quint-application-refinement.test.mjs`. Also hashed as an input by `permission-choices.mjs:63` and `startup-permissions-coordinator.mjs:49`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-39 | A1 / broken | `notesLifecycle` imports `NotesStore, NOTES_KEY` from `apps/app/src/runtime/notes-store.ts`, which in this worktree now only re-exports the `NoteRecord` type (legacy store deleted, D1). The campaign throws. Its canonical half (l.40-72) is a subset of `canonical-notes-controller.mjs` + `canonical-notes-draft.mjs`. | DELETE `notesLifecycle`, `specs/quint/application/NotesLifecycle.qnt` and its manifest entry; Trash policy behaviour that matters (retention boundary, restore) belongs to the canonical Notes mutation model / a Notes journey. | M |
| 2 | 78-91 | T3 | `calendarPresentation` is one encode/decode round trip with two checkpoints: effectively a unit test wearing a model. `CalendarPresentation.qnt` is 192 lines; this campaign covers one property. | KEEP for now (model must stay at 100 %); flag the model for owner review: either a real presentation campaign or retire the model with its harness. | L |
| 3 | 93-110 | A3 / D6 | `credentialVault` drives `apps/app/src/passwords/dev-vault.ts` (development-only vault, `devSurfacesEnabled && browserDevProfile`). D19 keeps dev simulators only if a retained spec drives them. | If the dev vault is deleted in the dev-surface pass, DELETE this campaign and `CredentialVault.qnt`; otherwise keep. Owner question. | M |
| 4 | 112-130 | A1 | `permissionWalkthrough` writes `version: 4` records; `startup-permission-progress.ts` still types `version: 1 | 4` and versions 1-3 are D1 delete candidates (B248). The campaign itself only uses v4. | KEEP; unaffected by deleting v1-3 readers. | L |
| 5 | 4-6 | B4 / C5 | Import-time `captureSources` side effect and local `checkTraces` wrapper (same as `clients.mjs`). | Remove side effect; use `boundInputs`. | L |
| 6 | — | Coverage risk | Only the aggregate runs these campaigns. | Give surviving campaigns per-model test wrappers (`test/quint-calendar-presentation.test.mjs`, `test/quint-permission-walkthrough.test.mjs`) before deleting the aggregate; rename the file by content (e.g. `calendar-presentation.mjs`, `permission-walkthrough.mjs`). | M |
| 7 | — | — | `permission-choices.mjs:63` and `startup-permissions-coordinator.mjs:49` hash this file as an input though they do not import it. | Remove those entries. | L |

## Proposed end state
File split by model: `permission-walkthrough.mjs`, `calendar-presentation.mjs` (and `credential-vault.mjs` only if the dev vault survives), each with its own test wrapper.
`notesLifecycle` and `NotesLifecycle.qnt` deleted.
