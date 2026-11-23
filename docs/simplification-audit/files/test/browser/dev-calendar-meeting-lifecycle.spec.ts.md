# test/browser/dev-calendar-meeting-lifecycle.spec.ts
- Lines: 31 | Kind: Playwright on the web-only meeting room and guest-response dialogs (P7), chromium dev build | Verdict: **DELETE**
- Covers: the browser calendar's "Calendar meeting" preview room stops captured camera/microphone tracks on Back or when the page is hidden, resets controls when tracks end, and the "Local guest response" dialog commits only on Save and refuses a stale guest list. Duplicates: `dev-calendar-meeting.spec.ts` (release on leave, late permission), `dev-calendar-response.spec.ts` (stale guest list). Callers/importers: none. 4 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19, 28 | P7 / P2 | Opens the room and response dialog through `registerPlugin('AlphaCalendar').joinMeeting/editResponse`; both exist only in `browser/calendar-meeting.ts` / `calendar-response.ts`, and the product gates `join` on `!Capacitor.isNativePlatform()` (`calendar-adapter.ts:383`). | Delete. | none for the APK. |
| 2 | 2 | B4 | `Object.defineProperty(navigator,'mediaDevices',{value:navigator.mediaDevices})` re-assigns the same value. | — | none |
| 3 | 8-17 | P3 | Replaces `getUserMedia` and wraps `MediaStreamTrack.addEventListener`. | — | none |
| 4 | 29 | P2 | Edits `calendarDocument` directly to make the guest list stale. | — | none |

## Proposed end state
File removed. Media-release on leave is a real privacy property; if the meeting preview stays in the dev simulator, keep one case in a dev-surface smoke, otherwise nothing.
