# test/browser/dev-parity.spec.ts
- Lines: 111 (17 KB) | Kind: Playwright, chromium; module-in-page tests of browser stand-in plugins (T6/P7), 2 device-controls UI tests | Verdict: DELETE (carry 1 case into `journeys/dev-surface.spec.ts`)
- Covers: that the browser stand-ins for `AlphaCalendar`, `DailyApps`, `AlphaBrowser`, `AlphaFiles`, `AlphaDevice`, `ElizaSystem` behave like the native plugins ("parity"). Duplicates: `calendar-agent-transaction-cancel.spec.ts`, `calendar-agent-all-day-review.spec.ts` (agent calendar review), `reminder-decision-review.spec.ts`/`reminder-create-review.spec.ts` (reminder decisions), `dev-files.spec.ts` (exact bytes, rename, move), `dev-controls-accessibility.spec.ts` (device controls). Callers: chromium project only.

Signals: 31 evaluates, 28 `/src` imports (24 × `platform-plugins.ts`), 22 `as any`, 25 role queries.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-19, 20-32, 59-65, 87-93 | T6, P7 | Calendar save/inspect/remove CAS, reminder snooze/done/duplicate, file import/move/rename CAS and reminder operation receipts are all called through `registerPlugin` in-page and assert return values of the stand-ins. | Delete. | Low: stand-ins are dev-only; Android behaviour is native. |
| 2 | 33-46 | P7 | Asserts the browser stand-in's iframe `sandbox`/`rel` attributes. The APK browser is the native `AlphaBrowserPlugin` WebView, so this checks a dev double. | Delete. If the dev iframe must stay sandboxed, that is a dev-surface concern, not product. | None for product. |
| 3 | 47-58 | A3 | Iterates `['Phone','Messages','Contacts','Wallet']`; Wallet is deleted (D2). | Delete; `dev-surface-copy` covers opening every app. | None. |
| 4 | 66-70 | P7, P2 | Wi-Fi settings dialog is the stand-in for an Android settings page, opened through `openSettings` in-page. | Delete. | None. |
| 5 | 71-86, 104-111 | P2 | Agent calendar review (confirm, replay receipt, cancel, conflict on edit-during-review) started by `executeAgent` in-page; only the Confirm click is UI. | Delete after confirming `calendar-agent-transaction-cancel.spec.ts` keeps cancel+conflict; otherwise carry "edit during review → conflict" into `journeys/calendar.spec.ts` started from chat. | Medium: edit-during-review conflict may be the only browser check. |
| 6 | 80, 106, 108 | C6 | `bindBrowserDeletionOwner(()=>'agent:'+JSON.stringify(['https://fixture.invalid','owner','agent','session','install','enroll']))` written three times. | Gone with the file. | None. |
| 7 | 94-103 | — | Device controls HOME / Power / Unlock / Background / Resume / Assistant / "Use as home" through the real dev panel. | Carry into `journeys/dev-surface.spec.ts`. | None. |

## Proposed end state
File deleted. One case (device controls round trip, lines 94-103) moves to `journeys/dev-surface.spec.ts`. Calendar review conflict moves to `journeys/calendar.spec.ts` only if no surviving calendar-agent spec covers it.
