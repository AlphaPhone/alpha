# apps/app/src/browser/development-agent-document.ts
- Lines: 28 | Role: per-namespace development agent document (scripted reply, conversations, message receipts). | Verdict: SIMPLIFY (dev module)
- Importers: 4 (`development-connection.ts`, `development-digests.ts`, `development-workflows.ts`, `runtime/connection-ui.tsx`). Text/path pins: `test/browser/agent-conversation-migration.spec.ts`, `cloud-account-migration.spec.ts` (A1), `assistant-draft-recovery.spec.ts`, `dev-content-question.spec.ts`, `dev-search-question.spec.ts`, `dev-workflow-authoring.spec.ts`, `journey-j03-document-analysis.spec.ts`, `journey-j05-web-research-note.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | C3 / B4 | `!devSurfacesEnabled\|\|!browserDevProfile\|\|!/^(local\|remote\|cloud(?:\.(first\|second))?)$/.test(identity.namespace)` — re-ANDed flag plus the namespace regex copied in `development-digest-document.ts:15`, `development-execution-document.ts:10`. | `assertDevelopmentNamespace(identity)` in `development-identity.ts`. | None |
| 2 | 24, 27 | B3 (P6) | `verify → check → read/edit → verify → check`, and inside the edit callback again. | One verify at entry. | Low |
| 3 | 21 | A1 | Legacy `localStorage.getItem(key)` reader (and a `check()` inside it). D1. | Drop with domain-document. | Low |
| 4 | 15-17 | B3 (P7) / A7 | `validateDevelopmentAgent` validates own writes; exported but unused outside. `DevelopmentMessage`, `DevelopmentAgentState` exported, unused outside. | Delete validator; drop exports. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| namespace regex | const | 12 | `development-digest-document.ts:15`, `development-execution-document.ts:10` | `development-identity.ts` |
| `DevelopmentConversation` | type | 7 | conversation shapes in `runtime/local-agent.ts` | keep |

## Proposed end state
~15 lines in `dev/`: document constructor + read/edit with one identity check.

## Verification
`test/browser/journey-a-conversation.spec.ts`, `dev-content-question.spec.ts`, journeys j03/j05.
