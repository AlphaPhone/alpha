# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarExternalEditorInstrumentedTest.java
- Lines: 212 | Role: complex event handoff to the real, pinned Etar v57 editor — Cancel leaves the row unchanged, title-only Save keeps the same row; return to Alpha | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-calendar-regression.ts --external` (`externalCalendar=true`, companion Etar APK with SHA-256 pin, line 62-63), which then reads `files/external-calendar-result.json` (lines 110-114). Text/path pins: that runner (class, method, gate, receipt file name and fields), `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 208-210 | B5 | Writes a receipt `external-calendar-result.json` whose fields are constants (`implicitHandoff:true, cancelUnchanged:true…`) reachable only after every assertion passed (`assertTrue(completed)` on 208); the runner re-asserts those constants (`scripts/test-calendar-regression.ts:111-113`). Only `returnMethod` carries information. | Delete the receipt write and the runner's `collectVariant` reader; if `returnMethod` matters, report it with `InstrumentationRegistry.sendStatus`. | Low |
| 2 | 27, 173 | C6 / C3 | Etar signer SHA-256 pinned here and in `scripts/test-calendar-regression.ts:112`; inline SHA-256→hex loop (Java C3, 10×). | Keep the device-side pin (it checks the installed package); drop the runner duplicate with #1; use a shared `sha256Hex`. | Low |
| 3 | 32-33, 63-64, 120-125 | C3 | Accessibility lookups (`find`, `awaitNode`, `clickNode`, `exact`, `visibleExactText`). | `NativeUiDriver` (package-scoped finder variant). | Low |
| 4 | 49-62 | KEEP | `diagnostics()` failure-only evidence without content — fine. | none | — |
| 5 | 179-180, 204 | C3 | Owned calendar creation + sync-URI cleanup (15 files). | `CalendarProviderFixture`. | Low |
| 6 | 185-186, 198 | C3 | Open-Calendar sequence and "event button by title prefix" selector (also CalendarFlow, CalendarRange, CalendarUiTestDriver:16). | `CalendarUiTestDriver.open()` / `eventButton(title)`. | Low |
| 7 | 111-119 | KEEP | Raw `KeyEvent` injection with paired up event — justified by comments. | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `eval/until/click` | helpers | 29-31 | all Calendar tests | `CalendarUiTestDriver` |
| `find/awaitNode/exact/clickNode/visibleExactText` | helpers | 32-33, 63-64, 120-125 | `NativeUiDriver` family | `NativeUiDriver` |
| `denyOptionalEtarContacts/chooseEtarOnce/tap/returnToAlpha/key` | helpers | 67-167 | `BrowserSignins.returnToAlpha` (different) | keep (Etar-specific) |
| `snapshot` | helper | 168 | `CalendarAgentCrud.provider:73` | `CalendarProviderFixture.row(uri, fields)` |

## Proposed end state
Etar-specific driving kept; generic accessibility/calendar helpers shared; receipt file and runner reader removed.
Est. ~185 lines here, −15 lines in `scripts/test-calendar-regression.ts`.

## Verification
`node scripts/test-calendar-regression.ts --external` with `artifacts/calendar-external/ws.xsoh.etar_57.apk`; `node --test test/calendar-regression-runner.test.mjs`.
