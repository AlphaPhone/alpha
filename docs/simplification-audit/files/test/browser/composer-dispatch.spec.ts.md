# test/browser/composer-dispatch.spec.ts
- Lines: 160 | Kind: Playwright UI journeys, chromium, over an inline bridge emulating a **remote paired agent** | Verdict: **MERGE** into `journeys/chat.spec.ts` (rewritten on the resident harness)
- Covers: (1) with no connection, Send opens the chooser and the message returns to the composer, durable across reload, with no toast; (2) a session that lapses before dispatch keeps the text in its own binding's saved draft and posts nothing; (3) a failure after dispatch shows "Sorry, I couldn’t finish that reply.", clears the draft and never resends (at most one reconciliation with the same `clientMessageId`). Duplicates: `chat-continuity.spec.ts` (double Send, restart during send, also remote-agent based), `assistant-draft-recovery.spec.ts`. Callers/importers: none. 3 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-76, 117, 141 | A3 (C4, D5) | Tests 2-3 seed `{kind:'remote', origin}` and a `remote:` credential. The remote selection is deleted product-side, and `migrateLegacyHostedSelection` already turns it into the resident. | Re-express on `harness/plugins/agent.ts` (resident `Agent.request`): POST `/messages` returns 502 for case 3. Case 2 needs a resident equivalent of "session lapsed before dispatch" (resident `401` on `/api/auth/me`); if the resident has no expiring session, drop case 2. | Medium: case 3 is the only no-resend proof outside `chat-continuity`. |
| 2 | 30-74 | P6 | Another hand-written Capacitor bridge (7 plugins). | Typed bridge. | none |
| 3 | 79-89, 95, 106, 122, 136, 152 | P2 | Reads the saved draft through `connectionController.assistantDraftBinding` + `assistantDraftStore` imports. | Assert durability by reload and the visible composer value. Keep one binding-scoped check only if case 2 survives. | Low. |
| 4 | 2-8, 115 | T8 (P11) | 90 s per test and 15 s expect timeout to absorb slow boots. | Default timeouts with the faster harness boot. | Low. |
| 5 | 28 | B1 | `try { … } catch { /* covered elsewhere */ }` swallows a seeding failure. | Remove the try. | none |
| 6 | 105 | P2 | DOM walk for an unsent bubble by text. | `getByText` count. | none |
| 7 | 158-159 | A8 | Comment narrating a removed "Check saved conversation" card. | Delete. | none |

## Proposed end state
Two (maybe three) cases in `journeys/chat.spec.ts`: "no connection: message returns to composer and survives reload" and "failure after dispatch: one logical send, no resend, draft cleared", both on `app({connection:'resident'})` with the agent plugin recording posts.
