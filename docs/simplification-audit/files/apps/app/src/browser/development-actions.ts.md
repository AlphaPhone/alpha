# apps/app/src/browser/development-actions.ts
- Lines: 60 | Role: fake agent device-action protocol for development profiles: proposals, decision/claim/receipt routes and an `ActionJournal`. | Verdict: SIMPLIFY (dev module)
- Importers: 3 (`development-connection.ts:3`, `development-workflows.ts`, `runtime/connection-ui.tsx`). Text/path pins: `test/browser/dev-cloud-identity.spec.ts`, `dev-workflow-phone.spec.ts`, `execution-storage-migration.spec.ts` (A1), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16, 18, 23-24, 30, 32, 45-46 | B3 (P6) | `await verifyDevelopmentIdentity(identity,signal);assertDevelopmentIdentity(identity);current(profile,signal);` before every edit and again inside every edit callback. | One identity check at request entry (`developmentActionRequest`) and none inside edits; dev fixture races do not matter. | Low |
| 2 | 12 | C3 / C6 | `JSON.parse(localStorage.getItem('alpha.connection.selection.v1')\|\|'null')` — 16 inline parses in `src`. | `readConnectionSelection()` exported by the connection owner. | Low |
| 3 | 18, 24 | C3 | Proposal object built twice (`{id,digest,state:'pending',subjectUserId,requestedBy,action:'device_action',expiresAt:…,payload:{…}}`). | `newProposal(identity,credential,operation,workflow?)`. | None |
| 4 | 11, 20-21, 42 | B3 (P7) | `validate(s)` on every read of data this module wrote. | Delete (dev-only). | Low |
| 5 | 45 | C6 | `/^[a-f0-9]{64}$/` hex-64 regex. | Shared constant. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Proposal` | type | 7 | client-device proposal type in `runtime/device-actions.ts` / upstream contract | import the runtime/upstream type |
| `State` | type | 8 | generic `State` in many files (C1) | rename `ActionState` |
| `current()` | helper | 12 | selection checks in `development-connection.ts:18`, `development-digests.ts:13` | `assertDevelopmentSelection(profile)` in `development-identity.ts` |

## Proposed end state
~45 lines in `dev/`: one check per request, shared selection reader, one proposal builder, no self-validation. Stored `{version:1,proposals,journal}` shape unchanged.

## Verification
`test/browser/dev-workflow-phone.spec.ts`, `dev-connection-actions.spec.ts`, `dev-cloud-identity.spec.ts`, journey-a/b/c.
