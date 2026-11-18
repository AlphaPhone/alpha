# test/browser/message-actions.spec.ts
- Lines: 146 | Kind: Playwright journeys on the dev profile with prototype-level agent fakes; project `chromium`, 14 tests | Verdict: **MERGE** into `journeys/chat.spec.ts` (message actions + transcript blocks); one case into `journeys/home-shell.spec.ts`
- Covers: tap/long-press/keyboard open the message menu; Copy writes exact bytes; copy failure; Read aloud uses the selected Cloud account and never falls back to local; user messages have no Read aloud/Reply/Edit; toggle and focus restore; cross-message selection by mouse and touch without menus; transcript reading anchor and bottom-follow across new rows, keyboard resize, Back and HOME; Home brand keeps conversation and draft; Home Calendar/Inbox cards. Duplicates: `message-reply-edit.spec.ts` shares the fake-agent setup; transcript anchoring is tested twice in this file (lines 92-105 and 124-146). Callers/importers: none; imports `helpers/home-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13, 93, 126 | T6 / T7 | Fakes the agent by assigning `LocalAgentProtocol.prototype.send/messages/listConversations` and calls `connectionController.initialize/startDevelopment/restoreHistory` from `/src`. Same pattern in `message-reply-edit.spec.ts`. | One `chat` fixture (`harness/agent.ts`) that answers at the local-agent HTTP boundary and exposes `rows`, `sent`, `room`; restore history through reopening the conversation. | Medium |
| 2 | 52-56 | T6 | Read aloud: patches `BrowserVoice.prototype.synthesize/localSpeechStatus/synthesizeLocal` and replaces `getCloudEnvironment`/`getCloudClient` on the controller. | Use the Cloud voice fixture (`cloud-voice-fixture.ts`) with a signed-in Cloud account fixture. | Medium |
| 3 | 92-105, 124-146 | T4 | Two transcript-anchoring tests with the same 48-row seed and anchor computation. | One test: anchor holds for new rows, resize, Back and HOME; bottom-follow holds for new rows and a new user turn. | none |
| 4 | 106-113 | misplaced | "Home shows populated Calendar and Inbox cards" has nothing to do with message actions. | Move to `journeys/home-shell.spec.ts`. | none |
| 5 | 45, 87 | T8 | `waitForTimeout(550/650)` for long-press timing. | Keep the long-press hold but drive it with `page.clock` (the file already uses `setFixedTime` at 119). | Low |
| 6 | 95, 102-103, 128 | C3 | Three copies of "wait for conversation animations". | One `settled()` helper (`helpers/settled.ts` already exists). | none |
| 7 | 19 | T4 | Light/dark loop for the first test only changes the screenshot. | One theme. | none |

## Proposed end state
About 9 tests in `journeys/chat.spec.ts`: menu by tap, long-press, keyboard; exact copy and denial; Read aloud with Cloud;
user-message actions; toggle/focus; cross-message selection (mouse + touch in one test); one transcript-position test;
Home brand keeps draft. The Home cards test moves to `home-shell`. All use one boundary agent fake, with no prototype
assignment.
