# android/app/src/androidTest/java/ai/alphacompute/alphaphone/RealClockInstrumentedTest.java
- Lines: 111 | Role: opt-in real AOSP Clock alarm set -> fire -> snooze -> dismiss through Alpha's Clock hand-off review, with exact-row cleanup. | Verdict: SIMPLIFY
- Importers: none; uses `ClockHistoryFixture`. Text/path pins: `scripts/android-instrumentation.ts:168` (`RealClock: { args: { realClock: "1", clockExclusive: "1" }, requires: "--clock-exclusive", grantOther: ... }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 68, 75, 94, 101-105 | B5 | `record(stage)` writes `events.jsonl`, a PNG screenshot per stage and `notification-ancestry.json` to `getExternalFilesDir()/real-clock-<uuid>`. grep `real-clock-`, `events.jsonl`, `notification-ancestry` in scripts/test/.github: no reader; the runner does not pull it. | Delete `record()`, the ancestry dump and `output` dir creation (~8 lines of logic). Assertions already carry the evidence. | none |
| 2 | 35-39, 58 | C3 | `nodes()` BFS, `find`, `waitNative`, `tap` (click-up-parents), duplicated in `PhotosMultiShare.nodes/press`, `PrototypeFlow.accessibleLabel`, `ReminderTapProcessDeath.visibleNode`. | `AccessibilityTestDriver`. | none |
| 3 | 44, 47, 51, 58, 86-87, 91 | C3 | `"x".contentEquals(n.getPackageName()==null?"":n.getPackageName())` null-guard idiom repeated 8 times. | One `text(CharSequence)` / `inPackage(node,pkg)` helper. | none |
| 4 | 33-34 | C3 | `waitJs` / `click` poll helpers duplicated across androidTest. | `WebViewTestDriver.until/clickLabel`. | none |
| 5 | 84 | C3 | React value-setter idiom inline. | `WebViewTestDriver.setValue`. | none |
| 6 | 105 | D8 | One 1,500+-character cleanup line (expand row, find delete, wait, assert baseline). | Extract `deleteFixtureRow()`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js` / `waitJs` / `click` | helper | 32-34 | ~40 files | `WebViewTestDriver` |
| `nodes` / `find` / `waitNative` / `tap` | helper | 35-39 | 4 files (finding 2) | `AccessibilityTestDriver` |
| `id(node,suffix)` | helper | 37 | none (deskclock ids) | keep |
| `closeNotificationShade` / `front` / `handoff` / `show` | helper | 40-57 | `SystemShade`/`Notifications` tests handle the shade separately | keep |
| `baseline()` | helper | 59-67 | none | keep |
| `record()` | helper | 68 | none | delete |

## Proposed end state
One opt-in test as now, minus the evidence-file recorder; accessibility and poll helpers from shared drivers; cleanup
split into a named method. ~95 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --clock-exclusive --classes RealClock` on API 35 with AOSP Clock.
