# apps/app/src/runtime/device-actions.ts
- Lines: 93 | Role: Alpha profile and subclass for the shared phone-side device-action coordinator, plus a re-export hub of upstream device-action types. | Verdict: SIMPLIFY
- Importers: 14 product (`browser/deletion-recovery.ts`, `browser/deletions.ts`, `browser/development-actions.ts`, `browser/development-workflows.ts`, `browser/digest-storage.ts`, `prototype/agent-adapter.ts`, `prototype/notes-query-executor.ts`, `prototype/workflow-adapter.ts`, `runtime/connection-ui.tsx`, `runtime/deletions.ts`, `runtime/development-cartesia-conversation.ts`, `runtime/hosted-digest-ui.tsx`, `runtime/local-agent-storage.ts`, `runtime/workflow-device-contract.ts`). Text/path pins: `scripts/test-device-actions.ts`, `scripts/test-agent-camera-flow.ts`, `scripts/test-calendar-availability-flow.ts`, `scripts/test-notes-action-flow.ts`, `scripts/test-notes-query-flow.ts`, `scripts/fixtures/device-action-journal.ts`, `specs/quint/application/manifest.json`, `specs/quint/refinement/application/device-action-review.mjs`, `hosted-digest-refresh.mjs`, `test/browser-receipt-order.test.mjs` and `test/dev-surface-gates.test.mjs` (source text), 12 more host tests, `vite.config.ts` (upstream dir only), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-52 | A7 | Re-exports with 0 references anywhere outside this file (git grep -w): `ContextNotice`, `DeviceJournalIdentity`, `ReviewableDeviceOperation`, `WorkflowPresentationOperation`, `ForegroundReviewOperation`, `NamedTargetExactOperation`, `selectedNotesRead`, `validateForegroundReviewOperation`. | Remove from the export lists. | None |
| 2 | 52 | A7/D7 | `FOREGROUND_REVIEW_TYPES as FOREGROUND_OPERATION_TYPES`: only `scripts/test-device-actions.ts`; `deviceJournalContext` (48): only tests (`browser-receipt-order`, `calendar-day-context`, `fixtures/device-action-policy.mjs`). | Remove; those tests import upstream directly or are deleted (T3). | Low |
| 3 | 57 | A7 | `export type PendingReviewItem` alias: 0 references. | Delete line 57 and the `SharedPendingReviewItem` import. | None |
| 4 | 61 | A7 | `export const alphaDeviceActionProfile`: 0 external references (confirms research P12). | Drop `export`. | None |
| 5 | 73 | A7 | `validateReviewableDeviceOperation`: 0 references anywhere (confirms research). | Delete function and its upstream import. | None |
| 6 | 75 | A7/D7 | `proposalContextNotice`: 0 product references; only `test/files-agent-patch.test.mjs`, `test/photo-library.test.mjs`. | Delete with those test usages. | Low |
| 7 | 53-55 | D4 | Rename aliases `JournalEntry = DeviceJournalEntry`, `ActionJournal = DeviceActionJournal`. | Keep `DeviceExecutor`/`ForegroundReviewExecutor` (they bind `ContextEnvelope`); replace the two pure renames with re-exports of the upstream names and update importers (`JournalEntry` has 4 product + 3 script users, `ActionJournal` 1 product). | Low |
| 8 | 69, 78 | B2 | `typeof document!=='undefined'&&document.hidden`, `if(typeof window!=='undefined')` in browser-only code. | Delete the guards. | Low (Node tests importing this file need a DOM shim or deletion) |
| 9 | 83-86, 91 | D3 | Module-level `filesReviewIdentity` set by `setFilesReviewIdentity` from `agent-adapter.ts`, read inside the constructor closure with a "Files is unavailable" fallback. | Pass `filesIdentity` as a constructor option from the composition root. | Low (cross-file: `agent-adapter.ts`, `connection-ui.tsx`, `test/files-reviewed-proposal.test.mjs`) |
| 10 | 88-90 | D9 | 10 positional constructor parameters, two boolean flags (`reminderTimingV2=false, reminderCreate=false`). | One options object (upstream coordinator already takes one). | Low (2 product call sites) |
| 11 | 35-40, 52 | D13 | Seven `../../../../.eliza/client-features/...` deep imports. | Use the planned `@eliza/*` alias. | None |
| 12 | 1-10 | — | Header comment is accurate. | Keep, trim to 3 lines. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `operations` | const | 60 | no | stay |
| `alphaDeviceActionProfile` | const | 61-70 | no | stay (private) |
| `JournalEntry`, `ActionJournal` | type alias | 53-54 | upstream names | use upstream names |
| `filesReviewIdentity` | module state | 83 | other module-level "current X" setters (D3) | constructor option |
| request function type | type (inline) | 89 | `view-navigation.ts:12-16`, `maps/resident-relay.ts:7`, `device-view-profile.ts:7` | `alpha-client.ts` `OwnerRequest` |

## Proposed end state
Profile (private), `validateDeviceOperation`, `publishCommittedDeviceChanges`, `DeviceActions` with an options constructor, and only the re-exports that product code imports. No environment guards, no module-level setter. ~70 lines.

## Verification
`scripts/test-device-actions.ts`, `test/committed-device-changes.test.mjs`, `test/files-reviewed-proposal.test.mjs`, `test/browser/host-reminder-recovery.spec.ts`, `test/browser/reminder-timing-review.spec.ts`, Quint `device-action-review.mjs`; re-run `test/dev-surface-gates.test.mjs` and `test/browser-receipt-order.test.mjs`, which read this file's text.
