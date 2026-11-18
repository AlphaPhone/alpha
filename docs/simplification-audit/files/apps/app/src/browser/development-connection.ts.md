# apps/app/src/browser/development-connection.ts
- Lines: 34 | Role: fake local/cloud/remote agent bridge for development profiles (auth, agents, conversations, messages, workflow and client-device routes). | Verdict: SIMPLIFY (dev module)
- Importers: 1 (`runtime/connection-ui.tsx`). Text/path pins: `test/browser/agent-conversation-migration.spec.ts`, `cloud-account-migration.spec.ts` (A1), `dev-cloud-identity.spec.ts`, `journey-a-conversation.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 13, 18, 22, 25, 30, 32 | B3 (P6) | `assertDevelopmentProfile` + `verifyDevelopmentIdentity` + `check()` on entry, inside each branch, inside edits and on exit. | One identity+selection check at `request` entry. | Low |
| 2 | 18 | C3 / C6 | Inline `JSON.parse(localStorage.getItem('alpha.connection.selection.v1')\|\|'null')`. | `readConnectionSelection()`. | Low |
| 3 | 25 | D9 | 700-character message-POST branch. | Extract `postMessage(data,row,body)`. | None |
| 4 | 25 | B3 | `['__proto__','constructor','prototype'].includes(id)` after the id already matched `/^[a-zA-Z0-9_-]{1,128}$/`; `constructor`/`prototype` pass the regex, but `Object.hasOwn` is used for lookup. Keep (prevents prototype keys in `receipts`). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `developmentName` | helper | 6 | profile labels in `runtime/connection-ui.tsx` | keep |
| `check()` | helper | 18 | `development-actions.ts:12` `current`, `development-digests.ts:13` | `development-identity.ts` |

## Proposed end state
~28 lines in `dev/`: one check per request, shared selection reader.

## Verification
`test/browser/journey-a-conversation.spec.ts`, `dev-cloud-identity.spec.ts`, `dev-connection-actions.spec.ts`.
