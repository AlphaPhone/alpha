# specs/quint/refinement/application/browser-owner-reminder-read.mjs
- Lines: 190 | Kind: Quint refinement harness (bundles real `runtime/owner-reminder-notification-port.ts`) | Verdict: DELETE (with the unused port; owner confirm)
- Covers: passive `list()` single-flight, 5 s cache, 24-read budget, owner/privacy retirement of `OwnerReminderNotificationPort` against `BrowserOwnerReminderRead.qnt`. Duplicates: run by `test/quint-browser-owner-reminder-read.test.mjs` and aggregate `index.mjs:79`. Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 181 | A7 | "The list/action API has no mounted shade consumer in this source snapshot." Only `.bind` is called (`main.tsx:92`, web only); `list()` has no caller, so no read ever happens in a product build. | Delete with the port, `BrowserOwnerReminderRead.qnt`, manifest entry, `index.mjs:79`, the per-model test, `main.tsx:92` and `ConnectionController.getOwnerReminderNotificationBinding`. | M (owner) |
| 2 | 136 | T1-ish | Hashes `apps/app/src/main.tsx` as an input to pin "the renderer binds the port". | Goes with the delete. | L |

## Proposed end state
Gone, together with `browser-owner-reminder-action.mjs` and the port. No user-visible behaviour loses coverage because none is reachable.
