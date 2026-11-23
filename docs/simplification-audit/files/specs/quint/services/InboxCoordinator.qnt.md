# specs/quint/services/InboxCoordinator.qnt
- Lines: 390 | Kind: Quint model, live (services manifest; `components` InboxDelivery); defines `RetainedInboxOperation` wrapper reused by `InboxProviderDrafts.qnt` | Verdict: KEEP
- Covers: the Inbox composer over two retained account/grant operation slots: only an exact, current, permitted review confirms; at most one network request per slot with durable intent first; edits during send preserve every copy; post-send cleanup touches only exact copies and never a replacement owner's (19 runs, 8 invariants + both slot safeties). Duplicates: none (InboxDelivery is its component, InboxProviderDrafts reuses it). Callers/importers: manifest; `InboxProviderDrafts.qnt`; `refinement/services/inbox-coordinator.mjs` + `inbox-coordinator-ports.mjs` (esbuild bundle of the real `inbox-cloud-adapter.ts`, `inbox-provider-controls.ts`, `inbox-drafts.ts`, `inbox-operation.ts`, `inbox-attachment.ts`, `inbox-unsaved-record.ts`; ports stubbed by import basename), `inbox-cleanup.mjs`; `test/quint-inbox-coordinator.test.mjs`, `test/quint-inbox-cleanup.test.mjs`; aggregate `services/index.mjs` and `test/quint-services-refinement.test.mjs` (required model).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 65-87 | C5 | Eleven `xFor(owner)` actions repeat the same `if (owner == 1) First::… else Second::…` frame. Quint has no higher-order actions, so this is the price of two instances. | Keep; optionally reformat one per line. | None |
| 2 | 1-19 | — | `RetainedInboxOperation` lives in this file but is imported by `InboxProviderDrafts`; moving it to its own file would make the dependency obvious. | Optional: `RetainedInboxOperation.qnt`. | Low (manifest paths) |
| 3 | `inbox-coordinator-ports.mjs:44-50` | T10 (mild) | Ports are substituted by matching the *basename* of any import (`device-preferences`, `gmail-background`, `alpha-client`, …), so a rename silently un-stubs. | Match full resolved paths. | Low |
| 4 | runners | T4, B5 | Wrapper tests + aggregate run the same campaign; ports file rebuilds and compares module graphs (`expectedInputs`). | One runner; drop graph re-check. | None |

## Proposed end state
Model unchanged. Harness already imports the real modules; tighten stub matching; one runner path-filtered to `apps/app/src/prototype/inbox-*.ts`, `assistant-draft-controller.ts`, `apps/app/src/runtime/inbox-*.ts`, `gmail-grants.ts`, upstream `plugin-inbox/src/mailbox/*`, the three Inbox models and harnesses.
