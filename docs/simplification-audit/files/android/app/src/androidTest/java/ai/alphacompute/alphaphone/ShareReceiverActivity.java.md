# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ShareReceiverActivity.java
- Lines: 38 | Role: test-APK share target (separate UID) that reads shared content URIs and displays item count + SHA-256 per item for `ShareFlowAssertions.receivesInSeparateApp` and multi-share tests. | Verdict: KEEP (minor simplify)
- Importers: declared in `android/app/src/androidTest/AndroidManifest.xml:8` (label "Alpha share verification"); read via its on-screen text by `ShareFlowAssertions:71-89` and `PhotosMultiShareInstrumentedTest`. Text/path pins: manifest class name.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-31 | C3 | Streaming SHA-256 + hex loop (one of ~30 androidTest copies). | Shared digest helper (same APK). | None. |
| 2 | 35 | B1 | `catch(Exception failure){result="Share receiver could not read this item";}` — failure text is the specified signal the asserting side waits on (it never matches "Read access verified"). | Keep; append the exception class to the text for diagnosis. | None. |
| 3 | 23-33 | D8 | Mis-indented loop body. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| inline digest loop | helper | 25-31 | ResidentTestFixture, ShareFlowAssertions, … | shared digest helper |

## Proposed end state
~32 lines using the shared digest helper; same displayed strings.

## Verification
Through its callers: `SelectedDocument`, `PhotosMultiShare` (registry) and `CameraFlow` (`scripts/test-native-permissions.ts`).
