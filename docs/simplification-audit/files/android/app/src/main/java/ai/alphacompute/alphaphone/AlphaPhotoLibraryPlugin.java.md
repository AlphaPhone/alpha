# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaPhotoLibraryPlugin.java
- Lines: 20 | Role: Capacitor `AlphaPhotoLibrary` registration of the shared DeviceLibraryPlugin with Alpha's permission aliases. | Verdict: KEEP
- Importers: Registered in `MainActivity`. Text/path pins: `specs/quint/native/manifest.json`; `test/native-plugin-teardown.test.mjs`, `test/native-read-epoch.test.mjs`, `test/photo-library-permission-owner.test.mjs`, `test/photo-library.test.mjs`, `test/plugin-worker-guard.test.mjs` (all read source text); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-16 | C6 | Four `@Permission` aliases (`libraryLegacy`, `libraryImages`, `libraryVideos`, `librarySelected`) identical to `AlphaPhotosPlugin.java:16-21`. | Annotation values must be compile-time constants; move the permission strings to `static final String` constants in one class (e.g. `AlphaMediaConfig`) and reference them from both annotations. Capacitor needs the annotation on each plugin, so the duplication can only shrink, not vanish. | low |
| 2 | 19 | C3/P18 | `closedMessage(){return LateLaunch.CLOSED;}` repeated on every media plugin. | Fix upstream base default or an Alpha base class (cross-file, see summary). | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
Unchanged shape; aliases reference shared constants. ~20 lines. Estimated lines after: 20.

## Verification
`test/photo-library-permission-owner.test.mjs` (regex on annotations) must be updated if constants are introduced.
