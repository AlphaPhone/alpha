# test/contacts-adapter.test.mjs
- Lines: 217 | Kind: integration-ish unit: esbuild bundles the real `apps/app/src/prototype/contacts-adapter.ts`, replacing `./native-adapter`, `./mvp-features` and `../platform-plugins` with inline stubs (the `AlphaContacts` plugin becomes a recording proxy), and drives `installContactsAdapter(Shell, views)` on a fake `Shell` class | Verdict: REWRITE as `journeys/phone-sms-contacts.spec.ts` (AOSP-image Contacts cases) and delete
- Covers: detail actions open Phone/Messages prefilled and never dial/send; unadmitted views get no action; Load more caps at 200; owner edit/create/delete send the shown version; stale version keeps the editor; write-unavailable hands off to system editor; uncertain write needs an explicit refresh; retired editor/visit/shell cannot overwrite a newer read. Duplicates: `test/browser/aosp-contacts.spec.ts` (3 tests: admission, explicit access, edit via provider identity, pending read retired on leave), `test/browser/dev-contacts.spec.ts` (5 tests on the dev fixture, not the native adapter). `specs/quint/refinement/native/telephony.mjs:334` names this file as the coverage for the editor, list reads and delete confirmation that `ContactsBook.qnt` traces do not cover. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T3 / D2 | Stub map in a string inside esbuild `onLoad`; `isMvpView` replaced by a global. The fake `Shell` reimplements the D2 adapter host contract (`S`, `vget`, `setState`, `componentDidMount`). | Drive the real shell in Chromium with the Capacitor `AlphaContacts` fake that `aosp-contacts.spec.ts` already defines. | Medium |
| 2 | 9, many | T8 | `settle()` = fixed 5 ms `setTimeout` used ~60 times. | Playwright waits on visible state. | Low |
| 3 | 16-35 | T4 | Admission and Load-more partially covered by `aosp-contacts.spec.ts:22-33`. | Fold the 200-cap case into the journey. | Low |
| 4 | 37-100, 185-217 | — | Version-carrying save/delete, stale-version editor, uncertain-write gate requiring an explicit refresh: the only coverage of these owner-data safety rules (ContactsBook model assumptions). | Carry: (a) save sends shown version, (b) stale keeps typed draft and refuses second write, (c) delete confirm + Back cancels, (d) uncertain outcome blocks writes until refresh, (e) no write access opens system editor. | High if dropped. |
| 5 | 102-183 | — | Retired visit/shell/older read cannot overwrite a newer read: four permutation-heavy tests. | Carry one: leave and return to Contacts while an editor reply is held, assert the newer list shows. | Medium |

## Proposed end state
File deleted after `journeys/phone-sms-contacts.spec.ts` (AOSP-image capability fixture, the `aosp-contacts` Capacitor fake
moved to the shared harness bridge) carries cases 4a–e and 5. Update the assumption string at
`specs/quint/refinement/native/telephony.mjs:334` to name the journey. `aosp-contacts.spec.ts` merges into the same journey.
