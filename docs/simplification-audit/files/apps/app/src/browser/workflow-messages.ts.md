# apps/app/src/browser/workflow-messages.ts
- Lines: 12 | Role: dev workflow simulator — reads simulated Messages threads (all, or the unread tail per sender) | Verdict: MERGE into `browser/dev/workflow-sources.ts` (single importer)
- Importers: 1 — `browser/simulated-workflows.ts:11` (dev-only). Text/path pins: `test/support/feature-parity.mjs` only. No test imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | C3 | `{...api.get('messages'),...JSON.parse(localStorage.getItem('alpha.dev.app.messages')||'{}')}` — dev-app-state merge, 10 copies | `devAppState(api,'messages')` | none |
| 2 | 7, 9 | B3 | Two identical `throw Error('Unread message counts need recovery.')` validators of the simulator's own state | Keep one check (`!Number.isSafeInteger(count)||count<0||count>incoming.length`) | dev-only |
| 3 | 9 | D8 | `Object.defineProperty(result,pid,{value:structuredClone(rows),enumerable:true})` — used only to defend against a `__proto__` pid | `const result:Record<string,Bag[]>=Object.create(null)` then `result[pid]=…` | none |
| 4 | 1 | C1 | `type Bag=Record<string,any>` | shared type | none |
| 5 | file | D4/C5 | 12-line file with one importer | merge | feature-parity list edit |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 1 | 41 files | shared |

## Proposed end state
File deleted; `readWorkflowMessages` (~8 lines) lives in `browser/dev/workflow-sources.ts`.

## Verification
`test/browser/dev-workflow-messages.spec.ts` (exercises it through the simulator), feature-parity test after list edit.
