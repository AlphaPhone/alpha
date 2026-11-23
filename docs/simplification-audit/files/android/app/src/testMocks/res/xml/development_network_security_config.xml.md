# android/app/src/testMocks/res/xml/development_network_security_config.xml
- Lines: 5 | Role: test-mocks network policy allowing cleartext only to 127.0.0.1 and the emulator host 10.0.2.2. | Verdict: KEEP
- Importers: `testMocks/AndroidManifest.xml:7`. Text/path pins: `scripts/apk.ts:121` (`developmentEntries` — must never appear in a distribution APK).

## Findings
None. Minimal and scoped.

## Proposed end state
Unchanged.

## Verification
Test-mocks APK build; `verify-apks` on distribution APKs.
