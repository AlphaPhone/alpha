# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CameraLatencyInstrumentedTest.java
- Lines: 164 | Role: device latency measurement — cold/warm CameraX first frame and shutter-to-thumbnail, optional target asserts | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Registry `CameraLatency` (`cameraLatency=1`, `scripts/android-instrumentation.ts:217`); manual. Text/path pins: registry note (status key names `cameraLatency.*`, trace `alpha.camera.firstFrame`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25 | A8 | "view refresh PLAN section 1" — no PLAN document exists (`ls PLAN.md docs/PLAN.md`: none). | Cite the PRD requirement id or drop the reference. | Low |
| 2 | 56-60 | C3 | `previewView` = `CameraFlowInstrumentedTest.preview:59-62`. | `CameraTestViews.previewView`. | Low |
| 3 | 101-105 | C3 | `ownedImages` = CameraFlow:66-71. | `PhotosTestFixture`. | Low |
| 4 | 125-126 | B4 | `Bundle arguments=getArguments()` then line 126 calls `InstrumentationRegistry.getArguments()` again. | Use `arguments`. | Low |
| 5 | 79-80 | NEW (declaration order) | `DIAGNOSTIC_MS` and `lastState` declared between methods. | Move to the field block at 47-48. | Low |
| 6 | 47 | KEEP | Pixel 10a targets as constants; asserted only with `cameraLatencyAssert=1` — a measurement tool, not CI evidence (AGENTS.md distinction). | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `previewView` | helper | 56-60 | CameraFlow.preview | `CameraTestViews` |
| `streamState/awaitStreaming/sampleStreaming/awaitReleased` | helpers | 64-93 | none | keep |
| `ownedImages` | helper | 101-105 | CameraFlow.ownedImages | `PhotosTestFixture` |
| `median/report` | helpers | 118-122 | `BrowserReadingNavigation.provider` status bundle | keep |

## Proposed end state
Unchanged behaviour; shared preview/MediaStore helpers; no dangling PLAN reference. Est. ~155 lines.

## Verification
`node scripts/android-instrumentation.ts --classes CameraLatency` on a device with a back camera (emulator numbers are not device evidence).
