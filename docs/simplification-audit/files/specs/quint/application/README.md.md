# specs/quint/application/README.md
- Lines: 196 | Kind: Family README (documentation) | Verdict: SIMPLIFY
- Covers: Describes the application Quint family: a per-model table of source symbols and abstractions (rows 6-104), Notes lifecycle modes, trace conformance, bounds, OS defaults. Duplicates: `manifest.json` (`sources`, `symbols`, `abstractions` per model) and each `.qnt` header comment say the same thing; `specs/quint/README.md`. Callers/importers: Read by humans only; `check-quint.ts` does not parse it. 187 models in the folder, the table lists 98.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-104 | C6 | Table duplicates manifest `sources`/`symbols` and the `.qnt` header comments, and is already incomplete (98 of 187 models). Every model change must edit three places. | Delete the table; one sentence pointing at `manifest.json` and the `.qnt` doc comments. Add missing header comments to `.qnt` files instead (ResidentLiveness, ScreenFocusOwnership). | L |
| 2 | 12-13,15,19,50,93,106-112 | A1 | Describes D1 legacy paths: "legacy completed installation" (StartupPermissions), "historical completed records" (PermissionWalkthrough), NotesLifecycle legacy Trash/CAS mode and the whole "Notes lifecycle modes" section, DurableStore "preserved legacy bytes", LauncherFavorites "legacy migration", DomainDocumentCreation "legacy bytes imported once". | Remove with the models/modes deleted in Stage E (owned by other chunks). | L |
| 3 | 21,66,94,24,71 | A3 | Describes D3/D20/D5 items: CredentialVault "test-only transfer admission", BrowserSessionPersistence `createSessionSaver` (deleted by D20), NotesDocumentTransfer import/export, DevelopmentHost, PasswordProviderDialog. | Remove rows when those models go. | L |
| 4 | 129-139 | T9 | "Trace conformance" describes `test/quint-conformance.test.mjs` and a `240` combination count; the `quint:conformance` alias is a delete candidate and the count is a stale exact number (B5). | Delete the section or reduce to one line without counts. | L |
| 5 | 141-178 | - | Bounds and exclusions for DeviceActionReview/CalendarApprovalReview with exact schedule counts ("Twenty-five", "Twenty-nine"). | Move to those `.qnt` headers; drop counts. | L |
| 6 | 182-196 | - | OS defaults section is useful context. | Keep, shortened. | - |

## Proposed end state
- About 20 lines: what the family is, how models are tied to code (manifest file pins + `refinement/application` harnesses), how to run `quint:check`, and the global abstraction note (finite equality classes, environment inputs need acceptance evidence).
- No per-model table, no legacy rows, no counts.
