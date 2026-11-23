# test/browser/view-navigation.spec.ts
- Lines: 260 | Kind: Playwright chromium, about 27 tests (scenario and view loops); module-in-page unit test (T6): routed blank page, `new ViewNavigationClient(fakeRequest, isActive, current)` from `/src/runtime/view-navigation.ts`, no user action (s1 r0) | Verdict: DELETE (carry two privacy refusals into `journeys/chat.spec.ts`)
- Covers: `ViewNavigationClient.deliver` claims then acknowledges with IDs only and never leaks screen text; duplicate delivery switches once; Home/chat is internal and an unaccepted ack reports `unknown`; refusals before any request for owner change, new epoch, cancel, credential surface, wrong client, record parameters (`recordId`, `condition`) and unavailable views; owner change during claim or ack; shell switch failure settles the claim with `switched:false` and no error text; registered view mapping; noncanonical automations paths; deferred phone/messages/contacts/wallet unavailable. Duplicates: `view-navigation-react.spec.ts` (same contract through real chat), host `view-navigation-settle.test.mjs`, `prepared-navigation-route.test.mjs`, `committed-view-observation.test.mjs`, `owner-route-parity.test.mjs`. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-63 | T6 | The page never boots the app; the test constructs the protocol client with fake request/active/current callbacks and a fake `navigate`. A browser is not needed for anything it does (research row 1019: "not e2e"). | Delete. | Medium: this is the densest refusal matrix for the navigation protocol. |
| 2 | 148-152 | — | `record-parameters` refusal (an agent cannot open a specific private record or attach a condition) and `credential-surface` refusal are privacy rules with user impact. | Carry as two cases in the navigation section of `journeys/chat.spec.ts` (agent asks to open a note by id → nothing opens, nothing acknowledged). | Low |
| 3 | 153, 257 | A3 | `wallet` used as the unavailable view. Still a valid unknown id after D2, but it names a deleted feature. | Use an id that never existed (`not-a-view`) in the carried case. | None |
| 4 | 247-252 | T4 | Ten-view mapping loop duplicates `view-navigation-react.spec.ts` lines 53-56. | Drop. | None |
| 5 | 1-260 | D8 | This file is the only Prettier-formatted spec in the chunk; content, not style, is the issue. | — | None |

## Proposed end state
Delete the file. The happy path and wrong-client/owner-change refusals live in `journeys/chat.spec.ts` (from `view-navigation-react.spec.ts`); add the two privacy refusals there (record parameters, credential surface). Everything else is protocol-internal and already exercised by the host navigation tests the tests-host review is consolidating.
