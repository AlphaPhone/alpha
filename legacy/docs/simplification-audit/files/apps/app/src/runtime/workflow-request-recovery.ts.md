# apps/app/src/runtime/workflow-request-recovery.ts
- Lines: 53 | Role: opens the browser domain-recovery dialog (download / reset) for the pending-workflow-request document, with an owner fence so a retired opener cannot act. | Verdict: MOVE to `apps/app/src/browser/` (dev-host only) — or DELETE with the domain-recovery layer (owner)
- Importers: `prototype/automations-adapter.ts:12,60` (`createWorkflowRequestRecovery(async()=>(await import('../browser/domain-recovery')).openDomainRecovery)`). Tests/specs: `test/automations-unified.test.mjs`, `test/fixtures/scheduled-task-controls.mjs`, `test/quint-workflow-request-recovery-admission.test.mjs`, `specs/quint/refinement/application/workflow-request-recovery-admission.mjs`, `index.mjs`.
- Text/path pins: `specs/quint/application/manifest.json` (path); `test/support/feature-parity.mjs:630`. User-visible copy at 44-45.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | D6 / A3 | Only reachable on the browser development host: `WorkflowIntentStore.recoveryDocument()` throws on Android (`workflow-intents.ts:36`), and this module then calls `request.unavailable()`. The "Download pending requests before resetting" dialog is part of the browser domain-recovery / backup layer (research: browser P2, `domain-recovery.ts` "Download old copy"). | Move to `apps/app/src/browser/` behind the dev boundary (dynamic import from automations-adapter only when not Android); if the owner removes the browser recovery layer (A1/A3 in the browser report), delete this file, its Quint model replay and tests. | Medium (owner decision on the browser recovery layer). |
| 2 | 24-27 | C4 | `check(signal)` owner/abort fence — one of ~30 staleness/epoch fences. | Keep local; use the shared fence helper if one is introduced. | — |
| 3 | 47-49 | B1 | `catch { if (current()) request.unavailable(); }` — any failure (document open, dialog import) shows "unavailable"; this is the specified UI. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `RecoveryRequest` | type | 4-9 | similar `{current, changed, unavailable}` request shapes in `browser/calendar-recovery.ts`, `browser/calendar-editor-draft.ts` recovery buttons | `browser/domain-recovery.ts` if moved |

## Proposed end state
Same ~50 lines living in `apps/app/src/browser/workflow-request-recovery.ts` and loaded only on the browser host — or deleted with the browser domain-recovery layer.

## Verification
`node --test test/automations-unified.test.mjs test/quint-workflow-request-recovery-admission.test.mjs`; Quint application `workflow-request-recovery-admission`; manifest and feature-parity path updates if moved; `scripts/audit-production-bundle.ts` should no longer find the recovery copy in the Android bundle.
