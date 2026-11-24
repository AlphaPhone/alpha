# apps/app/src/runtime/power-launch-state.ts
- Lines: 13 | Role: derives `initialRestorePending` and a Cloud account reference for the native protected power launch from the connection snapshot. | Verdict: KEEP (minor)
- Importers: `main.tsx:72`.
- Text/path pins: `test/power-launch-state.test.mjs`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | C3 | inline UUID v1-5 regex. | `isUuid` from `lib/ids.ts` (keep the version/variant strictness, lowercase result). | Low |
| 2 | 8 | D8 | 200-char condition. | Split into `interactive`, `ready` predicates. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `uuid` | helper | 9 | `remote-protocol.ts:316`, `resident-recovery.ts:33`, `owner-reminder-notification-protocol.ts:5` | `lib/ids.ts` |

## Proposed end state
~12 lines; could move into the main.tsx bootstrap module when main.tsx is split.

## Verification
`test/power-launch-state.test.mjs`; Android power launch instrumented flow.
