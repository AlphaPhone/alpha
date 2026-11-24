# test/browser/browser-credential-cas.spec.ts
- Lines: 80 | Kind: Playwright spec, chromium; module-in-page (T6), 4 tests, no user action | Verdict: DELETE
- Covers: `runtime/native-connection.ts`: the IndexedDB encrypted secret backend's compare-exchange fences two instances without Web Locks; the browser transport admits only listed automation writes; Android Cloud cleanup uses `secureRemove` not CAS; deployment-scoped slots do not adopt an unscoped `cloud:production` secret. Duplicates: host tests of `native-connection` (tests-host bucket). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-18 | T3/T6 | CAS race forced with a fake `SubtleCrypto` gate; pure module test. | Delete. | Medium: only coverage of the browser secret-store race. |
| 2 | 20-33 | T3 | Transport method/path allow-list checked with a fake `fetch`. | Delete; if it is a security rule, it belongs in a Node integration test of `createBrowserConnection` (owner). | Medium. |
| 3 | 35-55 | T3/B2 | Asserts `typeof cloudCredentialStore.clearIfCurrent === 'undefined'`: a shape check. | Delete. | None. |
| 4 | 57-80 | A1 | Unscoped `cloud:production` value labelled "legacy-synthetic-secret": checks the pre-deployment-scope slot is ignored. With D1 there is no older install to protect. | Delete. | None. |

## Proposed end state
File deleted. The browser secret store serves the dev host only; the APK uses the Android Keystore plugin. Coverage lost: browser-backend CAS race and transport allow-list (listed in the chunk summary).
