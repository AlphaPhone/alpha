# test/browser/journey-a-conversation.spec.ts
- Lines: 367 | Kind: Playwright journey, `chromium` dev profile (`/?mode=dev`), 3 tests (240 s, 120 s, 180 s timeouts); UI-driven with read-only storage checks through `/src` imports | Verdict: KEEP as `journeys/chat.spec.ts` (dev-profile half); move test 3 to `journeys/voice.spec.ts`
- Covers: composer draft returns after a refused send; connect the development agent; one conversation follows Home/Notes/Calendar/Browser; Stop is honest ("May still finish", one automatic check 15 s later); reload restores one result per accepted request; a declined proposal runs nothing; a spoken turn is transcribed, sent and answered once, and silence sends nothing. Duplicates: `journey-core-loops.production.spec.ts` loop A (same loop on the flag-off resident stub), `chat-continuity.spec.ts` (Stop with a controlled transport), `chat-decline.production.spec.ts` and `journey-c-alarms.spec.ts` test 2 (same decline card), `chat-voice-mode.spec.ts`. Callers/importers: none; imports `helpers/connection-diagnostics.ts`, `helpers/legacy-notes.ts`, `app-navigation.ts`, `cloud-voice-fixture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 224, 226, 268-270 | A1 | Test 2 opens Notes through `openLegacyNotes` ("Previous notes" source) and reads `readBrowserNotesRaw()` to prove the declined note was not saved. C1 deletes the Previous-notes source and the legacy notes document, so this step breaks. | Prove "nothing ran" from the visible card state plus `proposals`/`journal` (already asserted at 258-259, 271-273); drop the Notes read, or read through `helpers/canonical-notes.ts` if the dev agent's `create_note` now targets canonical Notes (owner question Q-NOTES-2). | Medium: what a dev `create_note` writes after C1 is undecided. |
| 2 | 90, 99 | T6 | `connectionController.getSnapshot()` imported to check "no session" and "resident, connected". | Assert the visible connection state (Settings > agent status) instead. | Low |
| 3 | 39-40 | P3 | Patches `IDBObjectStore.prototype.get` to count reads of the agent document, then asserts the check read once and never again. | Keep the user-visible outcome ("did not record" shown once, still shown after 2x the interval); drop the read counter. | Low: loses the "exactly one read" claim, which is an implementation detail. |
| 4 | 43-48, 205-215 | T6 | `agentDocument` parses the development agent's private document via `/src/browser/documents.ts`. It is the only evidence for "no duplicate receipts in the agent store". | Keep one read-only helper in the shared harness (persisted key is a stable identity) and use it at the end only. | Low |
| 5 | 125, 146-147 | P3 | Holds the agent document Web Lock in-page to keep the reply pending. Synthetic but honest, and documented. | Move into the harness as `holdAgentReply()` so chat and voice journeys share it. | none |
| 6 | 319, 326, 342 | T8 | `waitForTimeout(2500)`, `(1300)`, `(2500)` to simulate silence and speech. | In the voice journey drive the oscillator with `page.clock` or wait on `data-voice-state` transitions; silence checks use `page.clock.runFor`. | Medium: VAD timing may need real time. |
| 7 | 282-367 | T4 | Test 3 is a voice journey (oscillator mic, Cloud voice fixture, `speechFixture.current.onend()` backdoor). | Move to `journeys/voice.spec.ts`; replace the `onend()` call with the fixture finishing playback itself. | Low |
| 8 | 222-274 | T4 | The decline card flow is repeated in journey C test 2 and `chat-decline.production.spec.ts`. | Keep one decline case (here, chat journey); drop the duplicates. | none |
| 9 | 4-24, 32-37 | A8 | Long evidence-boundary header and wording constants copied from `connection-ui.tsx` comments. | Keep a two-line boundary note; constants stay (they are the UI copy under test). | none |

## Proposed end state
- File becomes `journeys/chat.spec.ts` (dev profile): refused send keeps draft; connect; cross-app continuity; Stop with one automatic check (page.clock); reload restores without duplicates; decline runs nothing.
- No `connectionController` imports, no IDB prototype patch; one harness helper for the agent-document read and the reply hold.
- Voice turn moves to `journeys/voice.spec.ts` without fixed sleeps.
- Notes read in the decline case removed or switched to canonical Notes after C1.
- Expected ~200 lines across the two journeys.
