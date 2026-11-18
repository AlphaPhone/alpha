# apps/app/src/runtime/google-connection-return.ts
- Lines: 50 | Role: watches foreground/focus/native resume after opening Google consent and requests one account re-read when the owner returns. | Verdict: MERGE with google-workspace-return.ts into apps/app/src/runtime/google-return.ts
- Importers: 1 product (`runtime/google-connection-ui.tsx`). Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/services/manifest.json`, `specs/quint/refinement/services/google-accounts-lifecycle.mjs`, `test/google-connection-return.test.mjs` (source text + import), `test/google-calendar-connect.test.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/fixtures/google-account-panel.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-7 | C3 | `GoogleConnectionReturnBinding` = `GoogleWorkspaceBinding` (`google-workspace-return.ts:5`) + `client`; `sameGoogleConnectionReturnBinding` = `sameGoogleWorkspaceBinding` + `client` check. `google-connection-ui.tsx:38-47` converts one into the other. | One `GoogleSessionBinding` type and one comparator in the merged module; the workspace path ignores `client`. | Low |
| 2 | 35, 47 | B1 | `.catch(()=>{})` on listener removal and on registration failure. | Keep (removal of a native listener after close is best effort); one comment. | — |
| 3 | 16 | — | `onNativeResume?` optional: web has no native resume. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `GoogleConnectionReturnBinding` | type | 2-4 | `GoogleWorkspaceBinding` (`google-workspace-return.ts:5-7`) | merged `GoogleSessionBinding` |
| `sameGoogleConnectionReturnBinding` | helper | 5-7 | `sameGoogleWorkspaceBinding` (`google-workspace-return.ts:20`), `sameLease` (`google-accounts.ts:55`) | merged |
| `Listener` | type | 8 | `{remove():void|Promise<void>}` in `google-workspace-return.ts:12,40` | merged |

## Proposed end state
`google-return.ts` (~85 lines) holding both watchers, one binding type, one comparator, one listener type.

## Verification
`test/google-connection-return.test.mjs`, `test/google-workspace-return.test.mjs`, Quint `google-accounts-lifecycle.mjs` (imports by path).
