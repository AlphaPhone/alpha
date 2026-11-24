# android/app/src/main/res/xml/network_security_config.xml
- Lines: 11 | Role: production network policy: HTTPS only, system CAs only. | Verdict: KEEP
- Importers: `AndroidManifest.xml` (`android:networkSecurityConfig`); replaced in test-mocks by `testMocks/res/xml/development_network_security_config.xml` (`testMocks/AndroidManifest.xml:7` `tools:replace`). Text/path pins: upstream release audit `vendor/eliza/packages/app/scripts/mobile/artifact-inspection/apk-distribution.mjs:120-122` fails a release manifest without `networkSecurityConfig`; `scripts/apk.ts:38` collects the attribute.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-11 | — | Content equals the platform default for targetSdk 36, but the release audit requires the attribute and the test-mocks overlay `tools:replace`s it, so the file must exist. Comment is accurate. | None. | — |

## Proposed end state
Unchanged.

## Verification
`verify-apks` / upstream distribution audit on release APKs.
