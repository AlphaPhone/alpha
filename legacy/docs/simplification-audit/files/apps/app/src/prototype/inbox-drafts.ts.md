# apps/app/src/prototype/inbox-drafts.ts
- Lines: 33 | Role: binds the upstream `createMailDraftsController` to Alpha's encrypted local store, retained-edit copies (`inbox-unsaved.ts`), native file picker and Cloud identity; adds `flushForAppUpdate`. | Verdict: SIMPLIFY (small)
- Importers: `apps/app/src/prototype/inbox-cloud-adapter.ts:19` (only app importer). Tests/scripts: `scripts/inbox-adapter-fixture.ts:217`, `scripts/test-inbox-multiple-drafts.ts:3,25`, `scripts/test-inbox-sent-cleanup.ts:20,88`, `specs/quint/refinement/services/inbox-coordinator-ports.mjs:31`, `test/browser/dev-file-picker.spec.ts:17` (dynamic import), `test/inbox-draft-copies.test.mjs` (bundles it with a stub `inbox-unsaved`).
  Text/path pins: `specs/quint/services/manifest.json:1126,1204` (source path), `test/support/feature-parity.mjs:376`. The slot prefix `inbox-drafts:v1:` lives in `runtime/inbox-local-store.ts` and Java (`AlphaCredentialStore.java:49`, `RendererCredentialSlots.java:26`) – not in this file.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14 | A7 | `export type ForwardSource=SharedForwardSource;` and `export type SuggestionTarget=SharedSuggestionTarget;` have no importer (`git grep -nw "ForwardSource\|SuggestionTarget"`: only this file; `scripts/inbox-adapter-fixture.ts:26` imports `SuggestionTarget` from upstream directly). | Delete both aliases and their imports. | None |
| 2 | 9-10 | D4 | `export type ComposePrefill=SharedComposePrefill;` is a rename used only by `inbox-cloud-adapter.ts:19,124,844`. | inbox-cloud-adapter imports `ComposePrefill` from upstream `drafts-controller.ts`; delete the alias. | None |
| 3 | 8 | C2 | Local `registerPlugin<{readSelected…}>('AlphaMailAttachments')`; the same plugin is typed differently in `inbox-cloud-adapter.ts:15`, `note-source-adapter.ts:18`, `runtime/native-recovery-backup.ts:14`. `selection-adapter.ts:5` types the same `readSelected` call on another plugin. | Import from one `runtime/plugins/mail-attachments.ts`. | Low |
| 4 | 1 | D13 | `'../../../../.eliza/client-features/plugins/plugin-inbox/src/mailbox/drafts-controller.ts'` deep relative import. | `@elizaos/plugin-inbox/…` alias once D13 lands. | None |
| 5 | 22 | NEW (blocking confirm) | `confirm:message=>window.confirm(message)` – a native blocking dialog inside the product UI. | Keep for now (behaviour); note for the dialog consolidation (C4 `<dialog>` lifecycle). | — |
| 6 | 25-32 | — | `flushForAppUpdate` is clear and correct (two-phase check). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ComposePrefill` | type alias | 10 | upstream `ComposePrefill` | delete, import upstream |
| `ForwardSource` | type alias | 12 | upstream | delete (unused) |
| `SuggestionTarget` | type alias | 14 | upstream; `scripts/inbox-adapter-fixture.ts:26` | delete (unused) |
| `attachmentNative` | const (plugin) | 8 | `inbox-cloud-adapter.ts:15`, `note-source-adapter.ts:18` | `runtime/plugins/mail-attachments.ts` |

## Proposed end state
Imports `createMailDraftsController` and types from upstream directly, the mail-attachment plugin from a shared module; exports only `inboxDrafts`. About 27 lines.

## Verification
`test/inbox-draft-copies.test.mjs`, `scripts/test-inbox-multiple-drafts.ts`, `scripts/test-inbox-sent-cleanup.ts`, `scripts/test-inbox-cloud-flow.ts`, quint services inbox replays (`inbox-coordinator-ports.mjs`), `test/browser/dev-file-picker.spec.ts`, `test/browser/file-email.spec.ts`; `npx tsc` for the alias removal.
