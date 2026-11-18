# test/canonical-notification-navigation.test.mjs
- Lines: 5 | Kind: wrapper (spawns `scripts/test-canonical-notification-navigation.ts`, 161 lines, under tsx with a 30 s timeout) | Verdict: DELETE wrapper and script; carry 4 cases to `journeys/notifications.spec.ts`
- Covers: (script) which notification adapter `main.tsx` installs per build shape, and that a canonical notification tap opens the intended view/conversation while preserving the owner, composer draft and recording state. Duplicates: `test/quint-canonical-notification-tap-refinement.test.mjs` (native custody/ack), `test/browser/notification-route-lifecycle.spec.ts`, `test/browser/notifications-handle.spec.ts`. Callers/importers: `npm test` glob only; the script has no other caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | T9 | A test that only spawns the real test; no `NODE_TEST_CONTEXT` scrub. | Delete. | None |
| 2 | script 6-19 | T1/T2 | Filters `main.tsx` lines by regex `install(CanonicalNotificationTaps|NotificationsAdapter)\(Component\)` and `vm`-runs them with the stripped upstream `shade.ts`. | Delete; build-shape selection is visible in a journey (dev build shows in-app notices, production Android uses taps). | Low |
| 3 | script 6 | T2 | Strips imports from `notifications-adapter.ts` and evals it with a 40-field fake shell. | Delete. | None |
| 4 | script 81-161 | T3 | Scenarios worth keeping as user journeys: tap opens the named conversation; approval/scheduled-task taps open current chat; Clock/device reminders open Calendar; a view this install does not admit falls back to chat; an unsent draft survives the tap. | `journeys/notifications.spec.ts` via the dev notification queue (`dev-notification-queue.spec.ts` already drives it). | Medium: the draft-preservation and owner-mismatch cases need the dev queue to post canonical taps. |

## Proposed end state
Wrapper and script deleted. `journeys/notifications.spec.ts` posts canonical taps through the dev notification
surface and asserts the opened view and the kept draft; native custody stays in the Quint native refinement.
