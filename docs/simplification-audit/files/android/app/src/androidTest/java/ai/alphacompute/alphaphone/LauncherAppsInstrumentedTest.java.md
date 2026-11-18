# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LauncherAppsInstrumentedTest.java
- Lines: 93 | Role: exercises upstream `ai.eliza.plugins.system.SystemLauncherApps` (list/find/resolve/launchIntent/explain/malformedText) against the device package manager under Alpha's package-visibility queries. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:188`; `scripts/owner/emulator-campaign-check.ts:40` (group "Shell/HOME" lists `LauncherApps`); `test/owner-emulator-campaign-check.test.mjs:15` checks the source file exists.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 69-77 | T5 | `packageOnlyRefusalsUseUpstreamCodes` asserts upstream constants (`assertEquals("failed", SystemLauncherApps.FAILED)`) and upstream `explain` codes; the Javadoc (L19-20) says listing rules are covered by upstream's `SystemLauncherAppsInstrumentedTest`. Nothing Alpha-specific. | Delete the method. | Low |
| 2 | 79-92 | T5/T3 | `aComponentOrProfileThatIsNotTextIsMalformedNotAbsent` is a pure-logic check of upstream `SystemLauncherApps.malformedText(JSObject,String)` with no device dependency. | Delete the method (belongs upstream). | Low |
| 3 | 52-67 | T5 | `staleOrUnknownEntriesAreRefusedWithAReason` mostly checks upstream refusal codes; the only Alpha-specific part is that resolution happens under Alpha's `<queries>`. | Keep one resolve-refusal assertion inside the first method; delete the rest. | Low |
| 4 | 30-50 | KEEP | `aListedEntryResolvesToExactlyItsOwnComponent` is the Alpha-identity check (Alpha never lists itself; explicit launch intent under Alpha's package visibility). | Keep. | - |
| 5 | 87 | A8 | Variable named `legacy` for a package-only request (`legacy.put("packageName",...)`). | Gone with method 2. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `context()` | helper | 24 | many files | keep |
| `ownUserEntry()` | helper | 25-28 | none | keep |

## Proposed end state
One or two methods: listing/identity/explicit launch, plus a single refusal of a not-installed package. About 45 lines.

## Verification
`npm run test:android:instrumentation -- --classes LauncherApps` on both variants; `node --test test/owner-emulator-campaign-check.test.mjs`.
