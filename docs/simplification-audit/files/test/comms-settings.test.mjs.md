# test/comms-settings.test.mjs
- Lines: 96 | Kind: mixed: region transplant (`// return-gate:begin/end` in `prototype/native-adapter.ts`, `// settings-reads:begin/end` in `prototype/settings-adapter.ts`, cut out, type-stripped and imported as data URLs), esbuild bundle of real `contacts-adapter.ts` with three modules replaced by inline stub source, real `createSmsSession` from `runtime/image-sms.ts`, plus source-text regexes after most cases | Verdict: DELETE; carry two cases into `test/integration/phone-sms-contacts.test.ts` once the regions are exported modules
- Covers: one return to the app runs its watcher once (visibility/focus/appResumed dedupe within 250 ms); repeated return triggers start one Messages read; Contacts keeps rows during refresh and clears them on access loss or leaving; a listener status read never overwrites a Pause/Turn off result; a resume behind another view defers the Settings device read. Duplicates: `test/browser/dev-contacts.spec.ts`, `aosp-contacts.spec.ts` (contacts list), settings journeys. Callers/importers: `npm test` glob; imports `support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15 | T2 / D7 | Marker comments exist in product code only so this test can cut them out. | Move `returnGate`, `listenerReadGate`, `settingsResumeRead` into small exported modules (e.g. `prototype/return-gate.ts`, `prototype/settings-reads.ts`), delete the markers. | Low |
| 2 | 32-33, 77-82, 89-95 | T1 | Regexes over adapter bodies (exact statement order, `void refresh()` count = 1). | Delete. | None |
| 3 | 36-42 | - | Real SMS session + gate: three triggers, one read. | Carry to `test/integration/phone-sms-contacts.test.ts`. | None |
| 4 | 44-63 | T3 | Contacts adapter with three modules replaced by source strings and a `globalThis.__commsContacts` bus. | Delete; journey `journeys/phone.spec.ts` (or the contacts journey) covers rows kept during refresh and cleared on permission loss. | Low |
| 5 | 65-76 | T3 (acceptable) | Listener read gate is a small concurrency rule. | Carry as a case once exported. | None |

## Proposed end state
Deleted. After the region extraction: "repeated returns start one Messages read" and "listener read gate drops reads started before an action" in `test/integration/phone-sms-contacts.test.ts`; Contacts refresh behaviour as a journey step. Markers removed from product code.
