# test/browser/aosp-contacts.spec.ts
- Lines: 43 | Kind: Playwright spec, chromium (dev server), 3 tests, real UI with inline bridge | Verdict: MERGE into `journeys/telephony.spec.ts`
- Covers: Contacts appears only on the Alpha image, reads only after explicit access, edits pass the provider identity, revoked access clears the list, a pending read is retired when leaving. Duplicates: `aosp-telephony-views.spec.ts` "Contacts searches in place, edits …" (search/edit/delete), same bridge as `aosp-phone.spec.ts:5-34`. Callers/importers: none; imports `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-20 | P6/C5 | Inline Capacitor bridge with an 18-plugin, 37-method blanket list; near-verbatim twin of `aosp-phone.spec.ts:6-33`. `telephony-fixture.ts` already provides the image-shape bridge. | Use `setupTelephony(page,{contacts…})` with an `image:false` option. | Low. |
| 2 | 29 | T6 (minor) | Revocation is simulated by flipping `window.contactAccess` and dispatching `focus`. Acceptable boundary event. | Keep through fixture setter. | None. |
| 3 | 26-28 | T4 | Edit-with-identity overlaps the views spec's edit case (which also checks the version hash). | Carry only "no read before Allow" and "revoked access clears list". | None. |

Cases worth carrying: standalone APK shows no Contacts and makes no permission request (merge with the aosp-phone standalone case); first open shows Allow, no `list` call until tapped; access revoked on resume clears the list and nothing is written to localStorage; leaving during a pending read does not render stale rows on return.

## Proposed end state
Delete the file; four steps live in `journeys/telephony.spec.ts` on `telephony-fixture.ts` (extended with a standalone shape and a hold-list switch).
