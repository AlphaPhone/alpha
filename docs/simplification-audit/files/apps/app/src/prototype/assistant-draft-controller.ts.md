# apps/app/src/prototype/assistant-draft-controller.ts
- Lines: 7 | Role: rename shim — `export {DurableDraftController as AssistantDraftController} from 'upstream renderer: state/durable-draft-controller.ts';` with the comment "This name is kept for the existing call sites". | Verdict: **DELETE**
- Importers (6): `prototype/agent-adapter.ts:43`, `prototype/calendar-edit-draft-adapter.ts:3`, `prototype/calendar-form-draft-adapter.ts:3`, `prototype/canonical-calendar-drafts.ts:3`, `prototype/inbox-unsaved.ts:2`, `browser/calendar-editor-draft.ts:1`.
- Text/path pins: `test/assistant-draft-dispatch.test.mjs:8` (asserts the exact export line by regex — T1), `test/quint-conformance.test.mjs:147,178` (`sourceModule('apps/app/src/prototype/assistant-draft-controller.ts')`), `specs/quint/refinement/application/portable.mjs:152-153`, `specs/quint/refinement/application/canonical-calendar-editor-close.mjs:19`, `specs/quint/refinement/application/calendar-adapter-fixture.mjs:19` (module-specifier regex `/assistant-draft-controller$/` → `drafts` stub, `:109` provides `AssistantDraftController`), `test/calendar-view-rules.test.mjs:35` (injects global `AssistantDraftController` into a transplant), `specs/quint/application/manifest.json:1104,2499`, `specs/quint/services/manifest.json:1133,1206`, `test/support/feature-parity.mjs:340`. The name `AssistantDraftController` also appears in prose in `specs/quint/application/DraftDispatch.qnt:1`, `specs/quint/application/README.md:26`, `specs/quint/services/InboxCoordinator.qnt:244`, `specs/quint/refinement/services/inbox-*.md|mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-7 | D4 | Alias-only re-export of the upstream `DurableDraftController`. | Import `DurableDraftController` directly in the 6 importers (through the `@eliza/*` alias once it exists, D13); delete this file. | Low at runtime. All text/path pins above must be updated in the same change: point `quint-conformance`, `portable.mjs`, `canonical-calendar-editor-close.mjs` at `upstream renderer: state/durable-draft-controller.ts` (already listed beside it in both manifests), change the `calendar-adapter-fixture.mjs` specifier regex to `/durable-draft-controller(\.ts)?$/` and export `DurableDraftController`, delete the regex assertion at `test/assistant-draft-dispatch.test.mjs:8` (T1), drop the manifest/feature-parity entries. Prose names in `.qnt`/`.md` can stay or be renamed. |
| 2 | 1-6 | A8 | Comment "This name is kept for the existing call sites" is a migration note. | Goes with the file. | None. |
| 3 | 7 | D13 | Deep relative path into `.eliza/client-features`. | Alias. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `AssistantDraftController` | alias (re-export) | 7 | is `DurableDraftController` (`upstream renderer: state/durable-draft-controller.ts`; source `upstream renderer: state/durable-draft-controller.ts`) | import the upstream name |

## Proposed end state
File deleted; importers use `DurableDraftController`. 0 lines.

## Verification
`npm run verify` (Quint manifests and refinement harnesses `DraftDispatch`, `InboxCoordinator`, canonical calendar editor close; `test/quint-conformance.test.mjs`; `test/assistant-draft-dispatch.test.mjs`), `npm run test:browser` (composer draft, calendar drafts, inbox unsaved drafts) and the Android build.
