# test/browser/dev-file-picker.spec.ts
- Lines: 23 (4 call sites, 6 tests) | Kind: Playwright `chromium`, dev build; module-in-page unit tests (9 `/src` imports, 0 locators) | Verdict: **DELETE**
- Covers: file chooser cancellation removes its hidden input; a later chooser imports exact bytes; device retirement and Back cancel pending pickers and directory handles; a replacement picker retires the old one; folder read failure is atomic; the Inbox attachment consumer revokes its object URL. Duplicates: the user-visible part (late selection after Home / device retirement is discarded) is covered through the UI by `dev-message-attachments.spec.ts:11-25`; exact imported bytes by `dev-inbox.spec.ts:4-8`. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-15 | T6 | Calls `DailyApps.perform`, `AlphaFiles.pick/importFolder` in-page, fakes `showDirectoryPicker` and dispatches `cancel`/`change` on the hidden input (research P1 example). | Delete. | Low: atomic folder import on a mid-read failure loses coverage. |
| 2 | 16-23 | P3, T6 | Replaces `connectionController.getSnapshot/getCloudClient` and `secureConnectionStore.read`, builds `inboxDrafts()` by hand and calls `draft.render().c.attach()`. | Delete. | Low |

## Proposed end state
Deleted. Late-selection and exact-byte behaviour stay in the inbox and telephony journeys through visible controls.
