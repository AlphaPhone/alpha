# apps/app/src/browser/workflow-drafts.ts
- Lines: 19 | Role: development-profile secure store for the workflow authoring draft (stands in for the agent's secure slot) | Verdict: SIMPLIFY (and move to `browser/dev/`)
- Importers: 1 — `prototype/workflow-authoring.ts:5,98` (`browserDevProfile&&…kind==='development'?await browserWorkflowDraftStore(session):secure`). Text/path pins: `test/browser/dev-workflow-authoring.spec.ts`, `test/browser/workflow-generation.spec.ts` (behaviour through the authoring UI), `test/support/feature-parity.mjs`. Storage key written today: `alpha.browser.workflow-draft:v1:<sha>` in the browser document store — keep byte-for-byte.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | B4 / D5 | `if(!browserDevProfile)throw…` and the selection `kind!=='development'` check repeat the caller's own condition (`workflow-authoring.ts:98`) | Keep the stricter profile check (`['local','cloud','remote'].includes(profile)`), drop the `browserDevProfile` re-check | none |
| 2 | 9, 13 | C6 | `JSON.parse(localStorage.getItem('alpha.connection.selection.v1')||'null')` twice in this file (16 times in src; owner constant `runtime/connection-ui.tsx:204`) | `readConnectionSelection()` exported by the connection owner | low |
| 3 | 12 | A1 | `new BrowserDomainDocument(browserDocuments,key,()=>localStorage.getItem(key))` — legacy localStorage reader for a key nothing writes (research P2) | Drop the legacy lambda when `BrowserDomainDocument` loses its legacy parameter | owner sign-off (research §7 Q1) |
| 4 | 13, 16-17 | B3 / research P6 | check-act-check: `check()` before read, after read, before edit and inside edit (4 identity verifications per call) | One `check` inside the `edit` callback and one after `read` | dev-only |
| 5 | 14, 17 | C3 (local) | `new TextEncoder().encode(x).length>100000` twice with different messages | `const tooLarge=(v:string)=>new TextEncoder().encode(v).length>100_000` | none |
| 6 | 14, 17 | B3 | `typeof state.value!=='string'` / `typeof input.value!=='string'` on typed values | keep the storage-read check (line 14), drop the typed-input check (line 17) | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| selection parse | helper (inline) | 9, 13 | 16 sites in src | `readConnectionSelection()` next to `SELECTION` in runtime/connection-ui.tsx |
| `check` | helper | 13 | development-*-document.ts identity sandwiches | `development-identity.ts` |

## Proposed end state
~12 lines in `browser/dev/workflow-drafts.ts`: one profile/identity check, read with size guard, CAS edit. Persisted key and `{value}` shape unchanged.

## Verification
`test/browser/dev-workflow-authoring.spec.ts`, `test/browser/workflow-generation.spec.ts`; production bundle audit (module must not appear).
