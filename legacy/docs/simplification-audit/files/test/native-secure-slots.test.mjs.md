# test/native-secure-slots.test.mjs
- Lines: 227 | Kind: source-text (walks every `apps/app/src/**/*.ts(x)`, regex-evaluates each `compareExchange(` slot expression, regex-parses `RendererCredentialSlots.java` and `AlphaConnectionPlugin.java`) plus two real imports (upstream inbox journal key, `note-origin.ts` limit) | Verdict: REWRITE as a JVM case in `test/integration/android-jvm.test.mjs`; MERGE the Inbox journal compatibility case (lines 200-215) into `test/integration/inbox.test.ts`
- Covers: every slot the renderer writes with compare-exchange is admitted by the native allow-list and is outside the native-only namespaces (this is how the note-origins link shipped broken). Duplicates: `test/renderer-slot-policy.test.mjs` runs the real native secure methods on the JVM for the SMS ledger slots. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44-69, 76-129 | T1 | A regex "evaluator" for TS expressions with per-file exceptions; every new store edits this test. | Replace by importing each owner's exported slot constant/derivation (R4: keys stay with owners) and passing the values to the real `RendererCredentialSlots`+`SecureSlotPolicy` on the JVM. | Medium: cross-boundary drift is a real past bug; the rewrite must land with the delete. |
| 2 | 86-87, 97-100, 189-191 | A1, A2 | Special cases for `prototype/legacy-notes-access.ts` (D1), `runtime/calendar-linked-storage.ts` (already deleted) and the Calendar linked-sync checkpoint slot (D4). | Drop with those deletions. | None |
| 3 | 126-127 | A1 | Pins `createSharedClockHandoffHistory({storage,slot,legacy})` text; the `legacy` reader is a D1 candidate. | Drop. | None |
| 4 | 166-172, 217-227 | T1 | Pins a Java size literal and the native-only namespace list. | Delete. | Low |
| 5 | 200-215 | - | Real upstream journal loads a record at Alpha's installed key byte-for-byte (persisted format, G5). | Keep in inbox integration. | None |

## Proposed end state
Android-jvm case: a committed fixture receives the renderer slot values (computed by importing owner modules: Notes,
note origins, reminder journals, Clock handoff, inbox operation key, read cache) and asserts
`RendererCredentialSlots.compareExchangeAllowed` for each, refusal of `cloud:*` and of every native-only namespace.
