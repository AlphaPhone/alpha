# android/app/src/standalone/AndroidManifest.xml
- Lines: 22 | Role: standalone-flavor overlay that strips the contacts, phone-state, SMS/MMS and dialer permissions merged in from shared library manifests (P-36). | Verdict: KEEP (fix one stale comment)
- Importers: `android/consumer-host.json:14` (flavor manifest). Text/path pins: `test/android-host.test.mjs:73` (path), `test/aosp-image-capability.test.mjs:163-172,236-240` (regexes over `tools:node="remove"` permission lines and absence of role component names), `test/aosp-sms.test.mjs:244-247`, `test/launcher-orientation.test.mjs:17`, `scripts/source-snapshot.ts:8`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-10 | A8 | "The merged standalone manifest and APK verifier still require all three permissions to be absent." — five SMS/MMS permissions follow, and `scripts/apk.ts` checks two (`['READ_SMS', 'SEND_SMS']`, pinned by `test/aosp-sms.test.mjs:249`). | Reword: "Removal markers, not requests: the shared messages module declares these; the APK verifier checks the merged result." | None |
| 2 | 4-21 | — | Needed: `eliza-contacts`, `eliza-messages`, `eliza-phone` are app dependencies of both flavors (`consumer-host.json:38-40`). | — | — |

## Proposed end state
22 lines, comment corrected.

## Verification
`node --test test/aosp-image-capability.test.mjs test/aosp-sms.test.mjs`; `verify-apks` permission check on the standalone APK.
