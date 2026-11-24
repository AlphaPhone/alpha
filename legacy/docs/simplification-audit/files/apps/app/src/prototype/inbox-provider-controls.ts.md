# apps/app/src/prototype/inbox-provider-controls.ts
- Lines: 28 | Role: binds upstream `createMailReviewController` (explicit Gmail operations) to Alpha's Cloud binding, local store and attachment review; wraps `gmailOperation` with the saved-outcome receipt guard. | Verdict: KEEP (minor SIMPLIFY)
- Importers: `apps/app/src/prototype/inbox-cloud-adapter.ts:17` (only app importer). Tests/scripts: `scripts/inbox-adapter-fixture.ts:216`, `scripts/test-inbox-grant-withdrawal.ts:16,58`, `scripts/test-inbox-sent-cleanup.ts:20,87`, `test/inbox-operation-guards.test.mjs:110` (bundles it), `specs/quint/refinement/services/inbox-coordinator-ports.mjs:30`.
  Text/path pins: `specs/quint/services/manifest.json:1125,1203` (source path), `test/support/feature-parity.mjs:377`. `prototypeScript('inbox-provider-controls.ts','inboxProviderControls')` loads it by file name.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27 | C3 | Owner key `JSON.stringify([account.environment,account.userId,account.organizationId||''])` is a third spelling of the Cloud owner tuple (inbox-cloud-adapter `homeSummaryOwner` uses `??''` and adds `credentialId`). | Use `runtime/session-key.ts` `cloudOwnerKey(account)` – keep this exact string, because upstream drafts/review state is keyed by it and `inbox-drafts:v1:` slots embed the owner JSON (`test/browser/inbox-unsaved-recovery.spec.ts:6`, `gmail-mvp-scope.spec.ts:317`). | Medium: persisted key format must stay byte-identical |
| 2 | 26 | D5 | `disabled:()=>document.documentElement.dataset.connectionMode==='mock'` – reads the dev "mock" connection mode from the DOM in a production module. | Read the flag from `build-flags.ts`/connection snapshot (`connectionController.getSnapshot().kind==='mock'`), or drop it if mock mode is test-mocks-only and the adapter is not installed in that mode (main.tsx:157 installs it only when `!browserDevProfile`). Owner check. | Low |
| 3 | 27 | D8 | 330-char one-line `binding` lambda. | Split into `const owner=…; return {…}`. | None |
| 4 | 8-20 | — | The WeakMap/Map cache plus four pass-through methods is the minimum to wrap one method of a class instance while keeping per-owner identity; acceptable. | Keep. | — |
| 5 | 1 | D13 | Deep relative `.eliza/client-features/...` import. | Alias. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `reviewClients` / `reviewClient` | const + helper | 8-20 | none | stays |
| owner tuple in `binding` | inline helper | 27 | `inbox-cloud-adapter.ts:188,220`, `main.tsx:102,430`, `agent-adapter.ts:443` | `runtime/session-key.ts` |

## Proposed end state
Same file, ~28 lines, owner key from a shared helper, mock flag from build flags, the one-liner formatted.

## Verification
`test/inbox-operation-guards.test.mjs`, `scripts/test-inbox-grant-withdrawal.ts`, `scripts/test-inbox-sent-cleanup.ts`, quint services inbox replays, `test/browser/journey-f-reviewed-send.spec.ts`.
