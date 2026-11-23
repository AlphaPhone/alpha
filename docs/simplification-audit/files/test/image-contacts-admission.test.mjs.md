# test/image-contacts-admission.test.mjs
- Lines: 53 | Kind: unit (imports real `applyImageContacts` from `apps/app/src/runtime/image-contacts.ts`, drives it with a fake shell) + source-text (regex over `main.tsx`) | Verdict: DELETE
- Covers: losing Contacts admission (AOSP image capability) while Contacts is open runs its leave hook and returns Home; admitting never navigates. Duplicates: `test/browser/aosp-contacts.spec.ts` ("ordinary APK presentation never admits Contacts", "admitted Contacts reads only after explicit access", "already granted Contacts … retires a pending read when leaving"). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-15 | T3 / D7 | Fake shell re-implements `S()` masking from `model.js`. | Delete. | Low |
| 2 | 49-53 | T1 | Regex for the exact call text `applyImageContacts(admitted,ORDER,shell,admitImageContacts)` in `main.tsx`. | Delete. | Low |
| 3 | 17-26 | — | "Admission lost while Contacts is open returns Home" has no browser case found. | Carry one case to the Contacts journey (`aosp-contacts.spec.ts` → `journeys/contacts.spec.ts` or `home-shell`): open Contacts, fake `DeviceApps.platformCapabilities` to `contacts:false`, fire resume, expect Home and no Contacts tile. | Low |

## Proposed end state
File deleted; one resume case in the Contacts journey.
