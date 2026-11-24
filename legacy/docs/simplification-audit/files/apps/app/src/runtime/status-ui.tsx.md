# apps/app/src/runtime/status-ui.tsx
- Lines: 10 | Role: React `StatusDot` (dot + word) and `Busy` (spinner + screen-reader label). | Verdict: KEEP (MOVE to `ui/`)
- Importers: `runtime/cloud-membership-ui.tsx:3`, `runtime/cloud-sign-in-ui.tsx:3`, `runtime/connection-ui.tsx:75`, `startup-permissions.tsx:8`.
- Text/path pins: `test/chooser-direct-entry.test.mjs`, `test/cloud-sign-in-state.test.mjs`, `test/subscription-entitlement.test.mjs` (read text), `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D11 | React components in `runtime/`. | Move to `ui/status.tsx` with the other React UI. | Low (path pins in 3 tests) |
| 2 | 3 | C6 | `StatusTone` ok/warn/err/off/busy — check against the status colour tokens consolidated in commit afa515fe2 (CSS `data-tone`). | Keep in sync; no change. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `StatusTone` | type | 3 | CSS `[data-tone]` rules | keep |

## Proposed end state
Unchanged 10 lines, moved to `ui/`.

## Verification
The three text-reading tests (update paths), connection/cloud sign-in UI browser specs.
