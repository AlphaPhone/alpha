# apps/app/src/browser/simulated-apps.ts
- Lines: 58 | Role: dev: installs simulated Phone/Messages/Inbox/Workflows/Wallet apps by patching the prototype Component | Verdict: SIMPLIFY + MOVE to apps/app/src/dev/ (or DELETE with simulator)
- Importers: 1 (main.tsx:38, called under devSurfacesEnabled at main.tsx:121,174). Text/path pins: vite.config.ts:29 stub string `./browser/simulated-apps`; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-18, 20 | D5 (P1) | Four gates: vite stub (vite.config.ts:29), export folds (17-18), inner `if(!devSurfacesEnabled\|\|!browserDevProfile)` (20), and main.tsx re-ANDs. | Keep one (dynamic dev import); drop folds and the devSurfacesEnabled half of line 20 (browserDevProfile already implies it, dev-profile.ts:7). | Low; audit bundle. |
| 2 | 21, 33-39 | A3 | Wallet simulation (`workflowReceipts`, dev card `last4:'0000'`) — Wallet is PRD-deferred (AP-13). | Delete wallet wiring with the wallet feature. | Owner (A3 scope). |
| 3 | 40-57 | D2 | Patches componentDidMount/componentWillUnmount/openView/vset on the prototype. | Hook registry (D2). | Medium. |
| 4 | 11 | C1 | `type Bag=Record<string,any>`. | Shared Bag. | None. |
| 5 | 52 | B3 | Merges in-memory view, snapshot JSON and patch before write ("React may not have committed"). | Keep (documented race). | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Bag | type | 11 | 14 other browser/ files | shared type |
| names | const | 12 | simulator-recovery key names | dev module |

## Proposed end state
Dev-only installer behind one boundary, no wallet, no folds/inner gate. Owner decision (research §7 Q3): the whole development simulator may be deleted; if kept, move to apps/app/src/dev/. Estimated lines after: 40 (current 58).

## Verification
simulator-*.spec.ts, dev-parity.spec.ts, remaining-dialog-layout.spec.ts; audit-production-bundle with flag off.
