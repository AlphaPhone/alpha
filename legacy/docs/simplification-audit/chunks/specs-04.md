# Chunk specs-04: Quint application models (CanonicalNotesDraft … FindInPage)

35 files, all live Quint models in `specs/quint/application/manifest.json` (loaded by `scripts/quint-lib.ts`). All manifest sources and symbol pins resolve today (checked with the quint-lib regex). Reports: `docs/simplification-audit/files/specs/quint/application/*.qnt.md`.

| File | Lines | Kind | Verdict |
|---|---|---|---|
| `specs/quint/application/CanonicalNotesDraft.qnt` | 107 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/CanonicalNotesFeedback.qnt` | 49 | Quint model | KEEP |
| `specs/quint/application/CanonicalNotesMutation.qnt` | 133 | Quint model | KEEP model; PORT harness (inherited) |
| `specs/quint/application/CanonicalNotesView.qnt` | 94 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/CanonicalNotificationTapAdmission.qnt` | 141 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/ChatAttachments.qnt` | 63 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/ChatDock.qnt` | 159 | Quint model | KEEP model; PORT test |
| `specs/quint/application/ClientObservationSupport.qnt` | 123 | Quint model | KEEP |
| `specs/quint/application/CloudConnectionNotices.qnt` | 36 | Quint model | KEEP model; SIMPLIFY harness |
| `specs/quint/application/CloudPlanRecheck.qnt` | 35 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/CommittedViewObservation.qnt` | 65 | Quint model | KEEP model; PORT fixture |
| `specs/quint/application/ComposerSend.qnt` | 160 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/ConnectionController.qnt` | 157 | Quint model | KEEP model; PORT test |
| `specs/quint/application/CredentialVault.qnt` | 99 | Quint model | KEEP model; SIMPLIFY (drop transfer); MERGE target for CredentialVaultReadback |
| `specs/quint/application/CredentialVaultReadback.qnt` | 131 | Quint model | MERGE into CredentialVault.qnt (then DELETE) |
| `specs/quint/application/DayAnchor.qnt` | 130 | Quint model | KEEP model; minor PORT |
| `specs/quint/application/DelegationReceiver.qnt` | 142 | Quint model | KEEP model; PORT test |
| `specs/quint/application/DevBridgeSignIn.qnt` | 114 | Quint model | KEEP (D20) ; drop symbol pins |
| `specs/quint/application/DevelopmentDevice.qnt` | 75 | Quint model | KEEP model; SIMPLIFY (drop Wallet payment); PORT harness |
| `specs/quint/application/DevelopmentHost.qnt` | 75 | Quint model | KEEP |
| `specs/quint/application/DevelopmentSurfaces.qnt` | 50 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/DeviceActionReview.qnt` | 94 | Quint model | KEEP |
| `specs/quint/application/DockClearanceOwnership.qnt` | 86 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/DomainDocumentCreation.qnt` | 62 | Quint model | DELETE |
| `specs/quint/application/DraftDispatch.qnt` | 78 | Quint model | KEEP |
| `specs/quint/application/DrawerInteraction.qnt` | 108 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/DurableStore.qnt` | 58 | Quint model | KEEP model; SIMPLIFY (drop legacy) |
| `specs/quint/application/EmailSuggestionReview.qnt` | 115 | Quint model | KEEP model; PORT fixture |
| `specs/quint/application/FilesAndSharing.qnt` | 51 | Quint model | KEEP |
| `specs/quint/application/FilesBrowserController.qnt` | 78 | Quint model | KEEP model; PORT/MERGE harness |
| `specs/quint/application/FilesFilter.qnt` | 88 | Quint model | KEEP model; PORT/MERGE harness |
| `specs/quint/application/FilesPreview.qnt` | 34 | Quint model | KEEP (upstream follow-up) |
| `specs/quint/application/FilesRecentIndex.qnt` | 129 | Quint model | KEEP model; PORT harness |
| `specs/quint/application/FilesTree.qnt` | 189 | Quint model | KEEP |
| `specs/quint/application/FindInPage.qnt` | 121 | Quint model | KEEP model; PORT harness |

Counts: DELETE 1 (DomainDocumentCreation), MERGE 1 (CredentialVaultReadback → CredentialVault), KEEP 33 (of which 3 also SIMPLIFY the model: CredentialVault, DevelopmentDevice, DurableStore; and 19 need a harness/test PORT).

## Tie to code, by technique
- **Import-based already (keep):** ClientObservationSupport, CanonicalNotesFeedback, DeviceActionReview, DraftDispatch (portable.mjs), DurableStore (storage.mjs), FilesAndSharing + DevelopmentHost (boundaries.mjs), FilesTree (surfaces.mjs filesTree), FilesPreview, CredentialVault (vault-coordinator.mjs), CloudConnectionNotices (Vite + Chromium real app).
- **Bundled import plus source injection at a marker (PORT, mostly upstream text):** CanonicalNotesDraft/Mutation (`    this.saving = true;` in upstream notes-editor.ts), CanonicalNotesView, DrawerInteraction (`    opened = useRef<string | null>(null);` in upstream drawer), FilesBrowserController + FilesFilter (`  const repaint = () =>` in upstream files-browser-adapter.ts), DayAnchor (probe replace), FilesRecentIndex (rewrite transforms).
- **Sliced and transplanted product text (PORT, T2/T10):** ComposerSend (6 anchors in agent-adapter.ts), ConnectionController (6 regions of connection-ui.tsx, in a test/ file), CloudPlanRecheck (connection-ui.tsx), CanonicalNotificationTapAdmission (notifications-adapter.ts), ChatAttachments (agent-adapter.ts, twice), ChatDock (`// chat-release:begin/end` markers), DelegationReceiver (slices an already exported function), DevelopmentDevice + DevelopmentSurfaces (model.js), DockClearanceOwnership, EmailSuggestionReview (fixture strips imports), CommittedViewObservation (fixture slices upstream views-routes.ts), FindInPage (browser-adapter.ts).
- **Nothing (model only):** CredentialVaultReadback, DevBridgeSignIn.

## Behaviours that would lose all coverage if the DELETEs happen
- None of substance. DomainDocumentCreation covers only the legacy envelope import being deleted under D1; its two non-legacy facts (empty read writes nothing, first edit creates) must be added as runs to DurableStore so the creation semantics keep a model.
- Merging CredentialVaultReadback keeps all its invariants inside CredentialVault; nothing lost. Note that today those invariants have **no** refinement at all.
- Runner risk: ChatAttachments, FilesBrowserController, FilesPreview, FilesTree, FilesAndSharing, DevelopmentHost/Device/Surfaces, DurableStore, DraftDispatch, CredentialVault run **only** through the application aggregate. When the aggregate is retired (ci-and-formal §2.4), each needs a per-model runner or these refinements stop running.

## Shared helpers worth keeping
- `specs/quint/refinement/application/support.mjs` `bundledSource` / `sourceModule` (the target technique for every PORT).
- `notes-files-media-itf.mjs` `loadProductModule` (keep, but forbid `rewrite`), `test/fixtures/browser-source.mjs` `loadBrowserModule`.
- One shared Files browser fixture to replace the twin plugins in files-browser-coordinator.mjs and files-filter.mjs (C5).

## Cross-file actions
1. Delete DomainDocumentCreation.qnt, `refinement/application/domain-document-creation.mjs`, `test/quint-domain-document-creation.test.mjs`, its manifest entry (5 symbol pins); strip legacy members from DurableStore.qnt and storage.mjs in the same change as the domain-document.ts envelope removal.
2. Remove password transfer from CredentialVault(+Readback) with the D3 deletion in password-manager.ts; drop `createTransferClient` stub in vault-coordinator.mjs:58; then merge Readback into CredentialVault and delete its manifest entry.
3. Remove the Wallet `fakePayment` members from DevelopmentDevice.qnt with the D2 model.js wallet deletion.
4. Delete the manifest `symbols` arrays for ChatDock (14), ComposerSend (12), ConnectionController (11), DayAnchor (11), DelegationReceiver (11), DevBridgeSignIn (11), FilesRecentIndex (11), FindInPage (10), DomainDocumentCreation (5), DevelopmentDevice (3), DevelopmentSurfaces (3), DevelopmentHost (2): 104 pins in this chunk.
5. Narrow manifest `sources` to the files the harness loads (CanonicalNotificationTapAdmission lists main.tsx, connection-ui.tsx and two Java plugins it never loads; CanonicalNotesMutation lists agent-adapter.ts; FilesAndSharing, ChatAttachments similar). Over-broad sources make `quint:changed` select these models on unrelated edits (P1) and make deleting a listed file break every Quint command.
6. After stage A4 (D5), re-check sources that name hosted/remote files: ChatAttachments (remote-protocol.ts, development-cloud-agents.ts, local-agent.ts), DevelopmentHost (start-local-remote.ts, dev-cloud.ts).
7. Product exports the ports need: `chatRelease` module; send-attempt module from agent-adapter.ts; connection controller module and plan-recheck scheduler from connection-ui.tsx; notification tap admission module; chat attachment custody module; find-bar module from browser-adapter.ts; dev phone simulator and dev gating under `dev/`; projection export in canonical-notes-ui.ts.
8. Upstream follow-ups (D14): inspect hooks for NotesEditor, InstalledAppsGridDrawer, files-browser-adapter and the views-routes waiter; consider moving FilesPreview (all-upstream sources) upstream.
9. Delete duplicate unit tests named by these reports: `test/chat-release.test.mjs`, `test/client-observation-handshake.test.mjs`, the DraftDispatch cases in `test/quint-conformance.test.mjs`; drop aggregate entries for models that also have a per-model wrapper (CanonicalNotes x4, CanonicalNotificationTapAdmission, ClientObservationSupport, CloudConnectionNotices, CloudPlanRecheck, CommittedViewObservation, DeviceActionReview, DockClearanceOwnership, DrawerInteraction, EmailSuggestionReview, FilesFilter).
10. `test/quint-refinement-harness.test.mjs` uses DevelopmentHost as a tooling fixture; give it its own fixture model so it does not pin a product model.

## Owner questions
- DelegationReceiver: the Cloud reads panel is reachable only via HostedDigestPanel. Does hosted digest survive D5? If not, delete the model and `test/quint-delegation-receiver.test.mjs`.
- DevBridgeSignIn / DevelopmentHost model development-only middleware (`scripts/browser-cloud-dev-bridge.ts`). D20 keeps model and code together; do you want design models of dev tooling at all? If not, delete both (DevBridgeSignIn has no harness).
- FilesPreview (and largely FilesBrowserController, FilesFilter, DrawerInteraction, CommittedViewObservation) model upstream code. Keep here or move to upstream?
