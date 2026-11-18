# test/telephony-attention-lifecycle.test.mjs
- Lines: 24 | Kind: unit with replaced modules (esbuild bundle of `prototype/telephony-attention.ts` with `aosp-image`, `native-adapter`, `mvp-features`, `platform-plugins` swapped for inline stubs; fake `document` and `Shell`) | Verdict: REWRITE as one case in `journeys/telephony.spec.ts`
- Covers: privacy: when the Home telephony `status` response arrives after the owner left Home, hid the app or unmounted, no SMS/call-log/contact read follows. Duplicates: `test/browser/aosp-telephony-views.spec.ts` covers Home cards but not this race. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T3, D8 | A 900-character single line declares four stub modules by regex on import specifiers; any import rename silently changes what is stubbed. | Delete. | none |
| 2 | 15-17 | T3 | Fake global `document` installed and never restored. | Goes with the file. | none |
| 3 | 13-24 | — | The behaviour (no private reads after leaving) is worth one journey case. | AOSP-image test-mocks profile, telephony bridge fake (`test/browser/telephony-fixture.ts`) holds `status`; open Notes, release, assert the fake recorded no thread/call-log reads. | low |

## Proposed end state
File deleted; one case in `journeys/telephony.spec.ts` ("a late status answer after leaving Home reads nothing private"),
using the existing telephony fixture extended with a held `status` call and a call log.
