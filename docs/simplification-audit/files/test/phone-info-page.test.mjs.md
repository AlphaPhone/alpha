# test/phone-info-page.test.mjs
- Lines: 83 | Kind: unit (direct import of `apps/app/src/prototype/phone-info-page.ts`: pure presenters plus a loader over a recording client) | Verdict: REWRITE as `journeys/settings.spec.ts` (Settings → Phone, image fixture); DELETE the rest
- Covers: Settings → Phone rows from one `phoneInfo` read (carrier, number formatting, network, signal, SIM slot, roaming, eSIM, IMEI/ICCID only when returned), unreadable fields left out, default-app and voicemail rows, and the loader reading only while the page is open, dropping late replies and closing during `status`/`requestAccess`/`phoneInfo`. Duplicates: none found (no Playwright spec renders Settings → Phone; `settings-device-facts.spec.ts` is device facts). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-38 | T3 | Presenter unit tests (`phoneLineSections`, `phoneDefaultRows`, `identifiersElsewhere`): row text tables. | Two journey cases render one-SIM and two-SIM pages and check visible rows. | Low |
| 2 | 47-83 | - | Privacy behaviour worth keeping: nothing read before open, nothing kept after close, late reply dropped, no read after close even mid-`requestAccess`. | Journey case with a held `phoneInfo` in the telephony fixture; or keep as one integration case in `test/integration/phone-sms-contacts.test.ts` if the fixture cannot hold calls. | Medium (number/IMEI are private) |

## Proposed end state
File deleted. `journeys/settings.spec.ts` (image fixture) adds: (1) one SIM shows carrier, formatted number, network, signal and slot; unreadable fields are absent; (2) two SIMs with roaming/eSIM and identifiers only when returned; (3) default apps and voicemail state rows; (4) leaving Settings → Phone while `phoneInfo` is held shows nothing on return and the fixture records no read after leaving.
