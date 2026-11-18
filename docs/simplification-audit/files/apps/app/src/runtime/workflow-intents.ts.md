# apps/app/src/runtime/workflow-intents.ts
- Lines: 45 | Role: Alpha binding of the shared owner-isolated pending-workflow-request store (`@elizaos/contracts/workflow-intents`): installed key prefix `alpha.workflow.pending.v1:`, per-key localStorage slots on Android, a browser domain document on the development host, change broadcast. | Verdict: SIMPLIFY
- Importers: `prototype/workflow-adapter.ts` (store, `workflowIntentKey`, `runIntentReconcilable`, `documentKey`, events `alpha:workflow-intents` / BroadcastChannel `alpha.workflow-intents`), `prototype/automations-adapter.ts` (`workflowIntentKey`), `runtime/workflow-request-recovery.ts` (type). Tests/specs: `test/automations-unified.test.mjs`, `test/workflow-adapter-recovery.test.mjs`, `test/browser/workflow-intent-storage.spec.ts`, `specs/quint/refinement/services/workflow.mjs`, `workflow-local-source.mjs`, `automation-request-settlement.mjs`, `specs/quint/refinement/application/workflow-request-recovery-admission.mjs`.
- Text/path pins: **`scripts/workflow-renderer-fixture.ts:36-39` reads this source, strips `^import` lines and every `export `, and runs it in a vm with injected `SharedWorkflowIntentStore`, `emptyWorkflowIntentArchive`, `storageWorkflowIntentBackend`, `sharedWorkflowIntentKey`, `workflowIntentOwnerPrefix`** (T2) — the local import aliases at line 3 are pinned by that injection list. `specs/quint/services/manifest.json` symbols `WorkflowIntentStore`, `runIntentReconcilable`, `workflowIntentKey`; `specs/quint/application/manifest.json` (path); `test/support/feature-parity.mjs:625`. Persisted: key prefix `alpha.workflow.pending.v1:` and document key `alpha.browser.workflow-intents.v1:<json>` must stay.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 37, 39-44 | A1 | `legacy()` seeds the browser domain document from "older per-key localStorage slots" (`alpha.workflow.pending.v1:*` on the browser). On the browser host writes go only to the domain document, so these slots exist only in pre-document installs; the package starts with empty private data. | Delete `legacy()` and pass `() => null` as the seed (or drop the seed argument if `BrowserDomainDocument` allows). Update the line 4-6 comment. | Low; check `test/browser/workflow-intent-storage.spec.ts` for a seed scenario and delete it. |
| 2 | 19, 36 | C4 / C3 | `Capacitor.getPlatform()==='android'` evaluated twice (closure + method) — the Android/browser durable-slot switch that is re-implemented in `notes-folders.ts`, `reminder-journal-store.ts`, `note-audio-deletions.ts`, `notes-trash.ts`, `service-read-cache-store.ts`. | Use the shared `isAndroid` from `native.ts` and, when it exists, the generalised `runtime/durable-slot.ts` adapter (research proposal) for the read/edit pair at 23-26. | Medium (cross-file mechanism). |
| 3 | 18, 32 | NEW (holder indirection) | `const holder:{store?:WorkflowIntentStore}={}` exists only because `super(...)` must run before `this` is available; closures use `holder.store!`. | Make `backend`/`onChange` lazy methods on the subclass, or construct the backend after `super` via a protected setter in the shared store; at minimum keep but comment. | Low. |
| 4 | 29 | B2 | `if(typeof BroadcastChannel!=='undefined')` — the renderer's WebView and supported browsers have `BroadcastChannel`. | Call it directly. | Low; vm-based fixture (`workflow-renderer-fixture.ts`) must provide `BroadcastChannel` or the onChange must be injectable. |
| 5 | 12 | D8 | `runIntentReconcilable` is one 260-char line with an inline structural cast. | Format; type `intent` as the shared intent row type instead of `unknown`. | None. |
| 6 | 7 | D4 | `export type WorkflowIntentOwner = SharedWorkflowIntentOwner;` — rename alias with **0 importers** (grep). | Delete. | None. |
| 7 | 28, 29 | C6 | Event `'alpha:workflow-intents'` and channel `'alpha.workflow-intents'` literals are repeated in `prototype/workflow-adapter.ts`. | Export constants from here. | Low. |
| 8 | 3 | D13 / D8 | 330-char import line with 7 renamed names from a deep `.eliza` path. | `@eliza/*` alias; one name per line. Keep the alias names while the vm fixture injects them. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `WorkflowIntentOwner` | type alias | 7 | upstream `WorkflowIntentOwner` | delete (0 importers) |
| `prefix` | const | 8 | literal in tests/specs | export as `WORKFLOW_INTENT_PREFIX` |
| `android` | helper | 19 | `notes-trash.ts:16`, `note-audio-deletions.ts:16`, `reminder-journal-store.ts:10`, `notes-folders.ts:9`, `startup-permissions.tsx:64` | `native.ts` `isAndroid` |
| `legacy` | helper | 40-44 | — | delete |
| event/channel names | const | 28-29 | `prototype/workflow-adapter.ts` | export here |

## Proposed end state
~30 lines: store subclass with `isAndroid`-based backend selection (or the shared durable-slot adapter), no legacy seed, named event/channel constants, formatted `runIntentReconcilable`. Persisted key prefix and document key unchanged. The vm transplant in `scripts/workflow-renderer-fixture.ts` should become a real import (T2) before the import list changes.

## Verification
`node --test test/automations-unified.test.mjs test/workflow-adapter-recovery.test.mjs`; Playwright `workflow-intent-storage.spec.ts`; Quint services `workflow`, `workflow-local-source`, `automation-request-settlement`; application `workflow-request-recovery-admission`; the workflow renderer fixture run.
