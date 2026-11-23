# test/browser/aosp-phone.spec.ts
- Lines: 55 | Kind: Playwright spec, chromium, 2 tests, real UI with inline bridge | Verdict: MERGE into `journeys/telephony.spec.ts`
- Covers: the standalone APK exposes no Phone route or telephony call; on the image, recents appear only after explicit access and a tap without the dialer role hands the number to the system dialer. Duplicates: `aosp-telephony-views.spec.ts` "recents call on the owner tap" (role-held path). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-35 | P6/C5 | Same 18-plugin blanket bridge as `aosp-contacts.spec.ts`, plus a Proxy to catch direct plugin calls. | Move the "standalone shape records any AlphaTelephony call" Proxy into `telephony-fixture.ts` as `{image:false}`. | Low. |
| 2 | 41-55 | keep | The no-dialer-role handoff (placeCall refused → dial, notice text) is the only coverage of that branch. | Carry. | None. |

## Proposed end state
Delete the file. `journeys/telephony.spec.ts` starts with "standalone: no Phone, Contacts, Messages, no telephony call" (one test for all three apps) and includes the dialer-handoff step.
