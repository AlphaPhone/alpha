# test/browser/dev-contacts.spec.ts
- Lines: 20 (5 tests) | Kind: Playwright `chromium`, dev build, UI with assertions on the simulator store `alpha.dev.app.contacts` | Verdict: **MERGE** into `journeys/telephony.spec.ts` (1 case)
- Covers: the Contacts view on the development simulator: create, edit, favourite, delete, Undo, reload; distinct ids at equal clock values; failed edit/undo keeps the draft; an opened contact is never an agent selection. Duplicates: `aosp-contacts.spec.ts` covers the AOSP-only admission and native provider path (AP-08). Callers/importers: `chromium` project; no helpers.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-6 | — | Real journey through the rendered Contacts view. | Carry; assert the reloaded list instead of `localStorage['alpha.dev.app.contacts']`. | none |
| 2 | 7-9 | P10 | Overrides `Date.now` in-page (second time source on top of Playwright's). | Delete. | Low |
| 3 | 10-15 | P3, P7 | `Storage.prototype.setItem` throws for the simulator key: tests the simulator's persistence (`browser/simulated-apps.ts`), not the native Contacts provider. | Delete. | Low |
| 4 | 16-20 | T6 | Reads `alphaClient.getState().context` in-page. | Delete; the privacy rule belongs in the chat journey if a visible signal exists. | Low |

## Proposed end state
One step list in `journeys/telephony.spec.ts` (AOSP views on the dev simulator): add a contact, edit, favourite, reload, delete, Undo, delete again. Delete the file. Whether the simulator Contacts stays at all is Q-DEV-1.
