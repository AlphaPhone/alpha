# apps/app/src/runtime/deletion-undo.tsx
- Lines: 19 | Role: mounts the shared `DeferredDeletionNotice` with Alpha's bridge, owner identity, lock-screen concealment and note-origin cleanup. | Verdict: SIMPLIFY (absorb `createDeletionNoticePolicy` from `deletions.ts`)
- Importers: 1 (`main.tsx`). Text/path pins: `test/shared-deletion-window.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | C3 | `JSON.stringify([session.origin,session.ownerId,session.agentId,session.sessionId])` session tuple, one of ~6 hand-built variants (research §4). | Use the shared `sessionKey(session)` helper once it exists; the string is in-memory only, so the format may change. | None |
| 2 | 5, 16 | D10 | `createDeletionNoticePolicy` lives in `deletions.ts` but this file is its only product caller (plus `test/deletion-notice-policy.test.mjs`). | Move the 41-line policy here (or into a `deletion-notice-policy.ts` beside it) so `deletions.ts` is just the bridge. | Low; update the test import. |
| 3 | 13 | D3 | `refreshEvents=['alpha:deletions-changed','alpha:device-state']` window-event bus strings duplicated with `deletions.ts:14`. | Export the event name from `deletions.ts` and reuse. | None |
| 4 | 18 | — | `onDeletedOrigins` inline async loop; fine. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `identity` | const | 9-12 | session tuple builders (C3) | stay, using `sessionKey` |
| `refreshEvents` | const | 13 | `'alpha:deletions-changed'` literal in `deletions.ts:14`, `browser/calendar-linked-local.ts`, `native-calendar-sync.ts` | event-name constant in `deletions.ts` |

## Proposed end state
Component plus the identity binding and the moved notice policy (~55 lines total in this file, `deletions.ts` shrinks by ~42).

## Verification
`test/shared-deletion-window.test.mjs`, `test/deletion-notice-policy.test.mjs`, `test/browser/durable-delete-undo.spec.ts`, `test/browser/connection-boundaries.production.spec.ts`.
